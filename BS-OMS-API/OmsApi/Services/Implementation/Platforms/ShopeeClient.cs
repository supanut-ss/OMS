using System.Text;
using System.Text.Json;
using OmsApi.Helpers;
using OmsApi.Models.Common;
using OmsApi.Models.Inventory;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation.Platforms
{
    /// <summary>
    /// Shopee Open Platform API client
    /// API Docs: https://open.shopee.com/developer-guide/4
    /// </summary>
    public class ShopeeClient : IPlatformClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ShopeeClient> _logger;
        private readonly long _partnerId;
        private readonly string _partnerKey;

        public PlatformType Platform => PlatformType.Shopee;

        public ShopeeClient(IHttpClientFactory httpClientFactory, ILogger<ShopeeClient> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _partnerId = long.TryParse(Environment.GetEnvironmentVariable("SHOPEE_PARTNER_ID"), out var id) ? id : 0;
            _partnerKey = Environment.GetEnvironmentVariable("SHOPEE_PARTNER_KEY") ?? "";
        }

        #region Orders

        public async Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(string accessToken, string? shopId, OrderFilter filter)
        {
            _logger.LogInformation("🛒 Shopee: Fetching orders for shop {ShopId}", shopId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/order/get_order_list";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;

            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var timeFrom = DateTimeHelper.ToUnixTimestamp(filter.DateFrom ?? DateTime.UtcNow.AddDays(-15));
            var timeTo = DateTimeHelper.ToUnixTimestamp(filter.DateTo ?? DateTime.UtcNow);
            var cursor = ((filter.Page - 1) * filter.PageSize).ToString();

            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}" +
                              $"&time_range_field=create_time&time_from={timeFrom}&time_to={timeTo}" +
                              $"&page_size={Math.Min(filter.PageSize, 100)}&cursor={cursor}" +
                              $"&order_status={MapStatusToShopee(filter.Status)}&response_optional_fields=order_status";

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();
                _logger.LogDebug("Shopee response: {Content}", content);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ Shopee API error: {StatusCode} - {Content}", response.StatusCode, content);
                    return new PaginatedResult<UnifiedOrder>();
                }

                var json = JsonDocument.Parse(content);
                var result = new PaginatedResult<UnifiedOrder> { Page = filter.Page, PageSize = filter.PageSize };

                if (json.RootElement.TryGetProperty("response", out var resp))
                {
                    if (resp.TryGetProperty("order_list", out var orderList))
                        foreach (var order in orderList.EnumerateArray())
                            result.Items.Add(MapShopeeOrder(order));
                    if (resp.TryGetProperty("total_count", out var total))
                        result.TotalCount = total.GetInt32();
                }

                _logger.LogInformation("✅ Shopee: Retrieved {Count} orders", result.Items.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error fetching orders");
                return new PaginatedResult<UnifiedOrder>();
            }
        }

        public async Task<UnifiedOrder?> GetOrderDetailAsync(string accessToken, string? shopId, string orderId)
        {
            _logger.LogInformation("🛒 Shopee: Fetching order detail {OrderId}", orderId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/order/get_order_detail";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;

            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}" +
                              $"&order_sn_list={orderId}" +
                              $"&response_optional_fields=buyer_user_id,buyer_username,estimated_shipping_fee," +
                              $"recipient_address,actual_shipping_fee,note,item_list,pay_time," +
                              $"message_to_seller,ship_by_date,invoice_data";

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode) { _logger.LogWarning("❌ Shopee order detail error: {Content}", content); return null; }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("response", out var resp) &&
                    resp.TryGetProperty("order_list", out var orderList))
                {
                    var orderArr = orderList.EnumerateArray().ToList();
                    if (orderArr.Count > 0) return MapShopeeOrderDetail(orderArr[0]);
                }
                return null;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ Shopee: Error fetching order detail"); return null; }
        }

        #endregion

        #region Inventory

        public async Task<PaginatedResult<ProductItem>> GetProductsAsync(string accessToken, string? shopId, ProductFilter filter)
        {
            _logger.LogInformation("🛒 Shopee: Fetching products for shop {ShopId}", shopId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/product/get_item_list";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var offset = (filter.Page - 1) * filter.PageSize;
            var itemStatus = filter.ItemStatus ?? "NORMAL";

            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}" +
                              $"&offset={offset}&page_size={Math.Min(filter.PageSize, 100)}" +
                              $"&item_status={itemStatus}";

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();

                var result = new PaginatedResult<ProductItem> { Page = filter.Page, PageSize = filter.PageSize };

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ Shopee products error: {Content}", content);
                    return result;
                }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("response", out var resp))
                {
                    if (resp.TryGetProperty("total_count", out var total))
                        result.TotalCount = total.GetInt32();

                    if (resp.TryGetProperty("item", out var items))
                    {
                        var itemIds = new List<long>();
                        foreach (var item in items.EnumerateArray())
                        {
                            if (item.TryGetProperty("item_id", out var iid))
                                itemIds.Add(iid.GetInt64());
                        }

                        // ดึงรายละเอียดสินค้าพร้อมสต๊อก
                        if (itemIds.Count > 0)
                        {
                            var details = await GetItemBaseInfoAsync(client, accessToken, shopIdLong, itemIds);
                            result.Items.AddRange(details);
                        }
                    }
                }

                _logger.LogInformation("✅ Shopee: Retrieved {Count} products", result.Items.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error fetching products");
                return new PaginatedResult<ProductItem>();
            }
        }

        public async Task<ProductItem?> GetProductDetailAsync(string accessToken, string? shopId, string itemId)
        {
            var client = _httpClientFactory.CreateClient("Shopee");
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;

            var items = await GetItemBaseInfoAsync(client, accessToken, shopIdLong, new List<long> { long.Parse(itemId) });
            return items.FirstOrDefault();
        }

        public async Task<bool> UpdateStockAsync(string accessToken, string? shopId, string itemId, string? variationId, int newStock)
        {
            _logger.LogInformation("🛒 Shopee: Updating stock for item {ItemId}", itemId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/product/update_stock";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var stockList = new List<object>();
            if (!string.IsNullOrEmpty(variationId))
            {
                stockList.Add(new { model_id = long.Parse(variationId), seller_stock = new[] { new { stock = newStock } } });
            }
            else
            {
                stockList.Add(new { seller_stock = new[] { new { stock = newStock } } });
            }

            var body = new { item_id = long.Parse(itemId), stock_list = stockList };
            var bodyJson = JsonSerializer.Serialize(body);

            var queryString = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}";

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, apiPath + queryString)
                {
                    Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
                };
                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ Shopee update stock error: {Content}", content);
                    return false;
                }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("error", out var err) && err.GetString() != "")
                {
                    _logger.LogWarning("❌ Shopee update stock API error: {Error}", err.GetString());
                    return false;
                }

                _logger.LogInformation("✅ Shopee: Stock updated for item {ItemId}", itemId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error updating stock");
                return false;
            }
        }

        private async Task<List<ProductItem>> GetItemBaseInfoAsync(HttpClient client, string accessToken, long shopIdLong, List<long> itemIds)
        {
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/product/get_item_base_info";
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var itemIdList = string.Join(",", itemIds);
            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}" +
                              $"&item_id_list={itemIdList}";

            var products = new List<ProductItem>();

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode) return products;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("response", out var resp) &&
                    resp.TryGetProperty("item_list", out var items))
                {
                    foreach (var item in items.EnumerateArray())
                    {
                        var product = new ProductItem
                        {
                            ItemId = item.TryGetProperty("item_id", out var iid) ? iid.GetInt64().ToString() : "",
                            Platform = PlatformType.Shopee,
                            Name = item.TryGetProperty("item_name", out var name) ? name.GetString() ?? "" : "",
                            Status = item.TryGetProperty("item_status", out var st) ? st.GetString() ?? "" : "",
                            ImageUrl = item.TryGetProperty("image", out var img) && img.TryGetProperty("image_url_list", out var urls)
                                       && urls.GetArrayLength() > 0 ? urls[0].GetString() ?? "" : "",
                            CreatedAt = item.TryGetProperty("create_time", out var ct)
                                ? DateTimeHelper.FromUnixTimestamp(ct.GetInt64()) : DateTime.MinValue,
                            UpdatedAt = item.TryGetProperty("update_time", out var ut)
                                ? DateTimeHelper.FromUnixTimestamp(ut.GetInt64()) : null
                        };

                        // Stock (ถ้าไม่มี variation จะมี stock_info_v2)
                        if (item.TryGetProperty("stock_info_v2", out var stockInfo))
                        {
                            product.Stock = new StockInfo
                            {
                                CurrentStock = stockInfo.TryGetProperty("seller_stock", out var ss)
                                    ? ss.EnumerateArray().FirstOrDefault().TryGetProperty("stock", out var stk)
                                        ? stk.GetInt32() : 0 : 0
                            };
                        }

                        // Price
                        if (item.TryGetProperty("price_info", out var pi))
                        {
                            product.Price = pi.EnumerateArray().FirstOrDefault()
                                .TryGetProperty("original_price", out var op) ? op.GetDecimal() : 0;
                            product.Currency = pi.EnumerateArray().FirstOrDefault()
                                .TryGetProperty("currency", out var cur) ? cur.GetString() ?? "THB" : "THB";
                        }

                        // SKU
                        if (item.TryGetProperty("item_sku", out var sku))
                            product.Sku = sku.GetString() ?? "";

                        // Variations (has_model)
                        if (item.TryGetProperty("has_model", out var hasModel) && hasModel.GetBoolean())
                        {
                            var models = await GetModelListAsync(client, accessToken, shopIdLong, long.Parse(product.ItemId));
                            product.Variations = models;
                        }

                        products.Add(product);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error fetching item base info");
            }

            return products;
        }

        private async Task<List<VariationStock>> GetModelListAsync(HttpClient client, string accessToken, long shopIdLong, long itemId)
        {
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/product/get_model_list";
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}&item_id={itemId}";

            var variations = new List<VariationStock>();

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode) return variations;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("response", out var resp) &&
                    resp.TryGetProperty("model", out var models))
                {
                    foreach (var model in models.EnumerateArray())
                    {
                        variations.Add(new VariationStock
                        {
                            VariationId = model.TryGetProperty("model_id", out var mid) ? mid.GetInt64().ToString() : "",
                            VariationName = model.TryGetProperty("model_name", out var mn) ? mn.GetString() ?? "" : "",
                            Sku = model.TryGetProperty("model_sku", out var mk) ? mk.GetString() ?? "" : "",
                            Price = model.TryGetProperty("price_info", out var pi2)
                                    && pi2.EnumerateArray().FirstOrDefault().TryGetProperty("original_price", out var op2)
                                    ? op2.GetDecimal() : 0,
                            CurrentStock = model.TryGetProperty("stock_info_v2", out var si2)
                                    ? si2.TryGetProperty("seller_stock", out var ss2)
                                        ? ss2.EnumerateArray().FirstOrDefault().TryGetProperty("stock", out var stk2)
                                            ? stk2.GetInt32() : 0 : 0 : 0
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error fetching model list for item {ItemId}", itemId);
            }

            return variations;
        }

        #endregion

        #region Shipping

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(string accessToken, string? shopId, string orderId, string? packageId, string documentType)
        {
            _logger.LogInformation("🛒 Shopee: Getting shipping label for order {OrderId}", orderId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;

            // Step 1: Create shipping document task
            var createPath = "/api/v2/logistics/create_shipping_document";
            var ts1 = DateTimeHelper.CurrentUnixTimestamp();
            var sign1 = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, createPath, ts1, accessToken, shopIdLong);

            var createBody = JsonSerializer.Serialize(new { order_sn = orderId, document_type = documentType });
            var createQueryString = $"?partner_id={_partnerId}&timestamp={ts1}&access_token={accessToken}&shop_id={shopIdLong}&sign={sign1}";

            try
            {
                var createReq = new HttpRequestMessage(HttpMethod.Post, createPath + createQueryString)
                {
                    Content = new StringContent(createBody, Encoding.UTF8, "application/json")
                };
                var createResp = await client.SendAsync(createReq);
                var createContent = await createResp.Content.ReadAsStringAsync();

                // Step 2: Download shipping document
                var downloadPath = "/api/v2/logistics/download_shipping_document";
                var ts2 = DateTimeHelper.CurrentUnixTimestamp();
                var sign2 = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, downloadPath, ts2, accessToken, shopIdLong);

                var downloadBody = JsonSerializer.Serialize(new
                {
                    order_list = new[] { new { order_sn = orderId } },
                    document_type = documentType
                });
                var downloadQueryString = $"?partner_id={_partnerId}&timestamp={ts2}&access_token={accessToken}&shop_id={shopIdLong}&sign={sign2}";

                var downloadReq = new HttpRequestMessage(HttpMethod.Post, downloadPath + downloadQueryString)
                {
                    Content = new StringContent(downloadBody, Encoding.UTF8, "application/json")
                };
                var downloadResp = await client.SendAsync(downloadReq);

                if (!downloadResp.IsSuccessStatusCode)
                {
                    var errContent = await downloadResp.Content.ReadAsStringAsync();
                    _logger.LogWarning("❌ Shopee shipping document download error: {Content}", errContent);
                    return null;
                }

                var docBytes = await downloadResp.Content.ReadAsByteArrayAsync();
                var contentType = downloadResp.Content.Headers.ContentType?.MediaType ?? "application/pdf";

                return new ShippingLabelResult
                {
                    Platform = PlatformType.Shopee,
                    OrderId = orderId,
                    DocumentBase64 = Convert.ToBase64String(docBytes),
                    ContentType = contentType,
                    Status = "READY"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error getting shipping label");
                return null;
            }
        }

        public async Task<bool> ShipOrderAsync(string accessToken, string? shopId, ShipOrderRequest request)
        {
            _logger.LogInformation("🛒 Shopee: Shipping order {OrderId}", request.OrderId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/logistics/ship_order";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var body = new { order_sn = request.OrderId, dropoff = new { } };
            var bodyJson = JsonSerializer.Serialize(body);
            var queryString = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}&shop_id={shopIdLong}&sign={sign}";

            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, apiPath + queryString)
                {
                    Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
                };
                var response = await client.SendAsync(req);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error shipping order");
                return false;
            }
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(string accessToken, string? shopId)
        {
            _logger.LogInformation("🛒 Shopee: Getting shipping providers");

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/logistics/get_channel_list";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}&shop_id={shopIdLong}&sign={sign}";
            var providers = new List<ShippingProvider>();

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode) return providers;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("response", out var resp) &&
                    resp.TryGetProperty("logistics_channel_list", out var channels))
                {
                    foreach (var ch in channels.EnumerateArray())
                    {
                        providers.Add(new ShippingProvider
                        {
                            ProviderId = ch.TryGetProperty("logistics_channel_id", out var id) ? id.GetInt64().ToString() : "",
                            Name = ch.TryGetProperty("logistics_channel_name", out var n) ? n.GetString() ?? "" : "",
                            Platform = PlatformType.Shopee,
                            Enabled = ch.TryGetProperty("enabled", out var en) && en.GetBoolean()
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error fetching shipping providers");
            }

            return providers;
        }

        public async Task<TrackingInfo?> GetTrackingInfoAsync(string accessToken, string? shopId, string orderId)
        {
            _logger.LogInformation("🛒 Shopee: Getting tracking for order {OrderId}", orderId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/logistics/get_tracking_number";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}&order_sn={orderId}";

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode) return null;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("response", out var resp))
                {
                    return new TrackingInfo
                    {
                        TrackingNumber = resp.TryGetProperty("tracking_number", out var tn) ? tn.GetString() ?? "" : "",
                        Platform = PlatformType.Shopee,
                        OrderId = orderId,
                        Status = "Tracked"
                    };
                }
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error getting tracking info");
                return null;
            }
        }

        #endregion

        #region Mappers

        private static UnifiedOrder MapShopeeOrder(JsonElement order)
        {
            var status = order.TryGetProperty("order_status", out var s) ? s.GetString() ?? "" : "";
            return new UnifiedOrder
            {
                OrderId = order.TryGetProperty("order_sn", out var sn) ? sn.GetString() ?? "" : "",
                Platform = PlatformType.Shopee,
                Status = OrderStatusMapper.FromShopee(status),
                OriginalStatus = status,
                CreatedAt = order.TryGetProperty("create_time", out var ct)
                    ? DateTimeHelper.FromUnixTimestamp(ct.GetInt64()) : DateTime.MinValue
            };
        }

        private static UnifiedOrder MapShopeeOrderDetail(JsonElement order)
        {
            var status = order.TryGetProperty("order_status", out var s) ? s.GetString() ?? "" : "";
            var unified = new UnifiedOrder
            {
                OrderId = order.TryGetProperty("order_sn", out var sn) ? sn.GetString() ?? "" : "",
                Platform = PlatformType.Shopee,
                Status = OrderStatusMapper.FromShopee(status),
                OriginalStatus = status,
                BuyerName = order.TryGetProperty("buyer_username", out var bn) ? bn.GetString() ?? "" : "",
                BuyerRemarks = order.TryGetProperty("message_to_seller", out var msg) ? msg.GetString() ?? "" : "",
                TotalAmount = order.TryGetProperty("total_amount", out var amt) ? amt.GetDecimal() : 0,
                CreatedAt = order.TryGetProperty("create_time", out var ct)
                    ? DateTimeHelper.FromUnixTimestamp(ct.GetInt64()) : DateTime.MinValue,
                CancellationDeadline = order.TryGetProperty("ship_by_date", out var sbd)
                    ? DateTimeHelper.FromUnixTimestamp(sbd.GetInt64()) : null,
                Currency = order.TryGetProperty("currency", out var cur) ? cur.GetString() ?? "THB" : "THB"
            };

            if (order.TryGetProperty("invoice_data", out var inv) && inv.ValueKind != JsonValueKind.Null)
            {
                unified.TaxInvoiceRequested = true;
                unified.TaxInvoice = new TaxInvoiceInfo
                {
                    TaxId = inv.TryGetProperty("tax_id", out var tid) ? tid.GetString() ?? "" : "",
                    CompanyName = inv.TryGetProperty("company_name", out var cn) ? cn.GetString() ?? "" : "",
                    Address = inv.TryGetProperty("address", out var addr) ? addr.GetString() ?? "" : ""
                };
            }

            if (order.TryGetProperty("shipping_carrier", out var carrier))
            {
                unified.Shipping = new ShippingInfo
                {
                    Carrier = carrier.GetString() ?? "",
                    TrackingNumber = order.TryGetProperty("tracking_no", out var tn) ? tn.GetString() ?? "" : "",
                    ShippingFee = order.TryGetProperty("estimated_shipping_fee", out var fee) ? fee.GetDecimal() : 0
                };
            }

            if (order.TryGetProperty("item_list", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    unified.Items.Add(new OrderItem
                    {
                        ItemId = item.TryGetProperty("item_id", out var iid) ? iid.GetInt64().ToString() : "",
                        Name = item.TryGetProperty("item_name", out var iname) ? iname.GetString() ?? "" : "",
                        Sku = item.TryGetProperty("item_sku", out var sku) ? sku.GetString() ?? "" : "",
                        Quantity = item.TryGetProperty("model_quantity_purchased", out var qty) ? qty.GetInt32() : 0,
                        UnitPrice = item.TryGetProperty("model_discounted_price", out var price) ? price.GetDecimal() : 0,
                        ImageUrl = item.TryGetProperty("image_info", out var img) && img.TryGetProperty("image_url", out var url)
                            ? url.GetString() ?? "" : "",
                        Variation = item.TryGetProperty("model_name", out var vname) ? vname.GetString() ?? "" : "",
                        Weight = item.TryGetProperty("weight", out var w) ? w.GetDecimal() : null
                    });
                }
            }

            return unified;
        }

        private static string MapStatusToShopee(OrderStatus? status) => status switch
        {
            OrderStatus.Unpaid => "UNPAID",
            OrderStatus.ReadyToShip => "READY_TO_SHIP",
            OrderStatus.Shipped => "SHIPPED",
            OrderStatus.Completed => "COMPLETED",
            OrderStatus.Cancelled => "CANCELLED",
            OrderStatus.ReturnRefund => "IN_CANCEL",
            _ => "ALL"
        };
        #endregion
    }
}
