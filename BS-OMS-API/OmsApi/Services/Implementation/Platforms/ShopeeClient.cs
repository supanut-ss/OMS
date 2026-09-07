using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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
            var cursor = "0"; // Shopee uses cursor-based pagination; "0" for first page
            var statusFilter = MapStatusToShopee(filter.Status);
            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}" +
                              $"&time_range_field=create_time&time_from={timeFrom}&time_to={timeTo}" +
                              $"&page_size={Math.Min(filter.PageSize, 100)}&cursor={cursor}" +
                              $"&response_optional_fields=order_status" +
                              (statusFilter != "ALL" ? $"&order_status={statusFilter}" : "");

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();
                _logger.LogDebug("Shopee response: {Content}", content);

                // Check for Shopee error even on HTTP 200
                var json = JsonDocument.Parse(content);
                var errCode = json.RootElement.TryGetProperty("error", out var errProp) ? errProp.GetString() : "";
                if (!string.IsNullOrEmpty(errCode))
                {
                    var errMsg = json.RootElement.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "";
                    _logger.LogWarning("⚠️ Shopee API error in body: {Code} - {Msg}", errCode, errMsg);
                    return new PaginatedResult<UnifiedOrder>();
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ Shopee API error: {StatusCode} - {Content}", response.StatusCode, content);
                    return new PaginatedResult<UnifiedOrder>();
                }

                var result = new PaginatedResult<UnifiedOrder> { Page = filter.Page, PageSize = filter.PageSize };

                if (json.RootElement.TryGetProperty("response", out var resp))
                {
                    if (resp.TryGetProperty("order_list", out var orderList))
                        foreach (var order in orderList.EnumerateArray())
                            result.Items.Add(MapShopeeOrder(order));
                    if (resp.TryGetProperty("total_count", out var total))
                        result.TotalCount = total.GetInt32();
                    else
                        result.TotalCount = result.Items.Count; // Shopee sandbox may not return total_count
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
                              $"message_to_seller,ship_by_date,invoice_data,package_list,shipping_carrier";

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ Shopee order detail error: {Content}", content);
                    throw CreateShopeeException(content, response.StatusCode.ToString());
                }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("response", out var resp) &&
                    resp.TryGetProperty("order_list", out var orderList))
                {
                    var orderArr = orderList.EnumerateArray().ToList();
                    if (orderArr.Count > 0) return MapShopeeOrderDetail(orderArr[0]);
                }
                return null;
            }
            catch (PlatformApiException) { throw; }
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

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(
            string accessToken,
            string? shopId,
            string orderId,
            string? packageId,
            string? trackingNumber,
            string documentType)
        {
            _logger.LogInformation(
                "Shopee: Getting shipping label for order {OrderId}, package {PackageId}",
                orderId,
                packageId ?? "(order)");

            var client = _httpClientFactory.CreateClient("Shopee");
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var shippingDocumentType = NormalizeShopeeDocumentType(documentType);

            var createItem = new Dictionary<string, object>
            {
                ["order_sn"] = orderId,
                ["shipping_document_type"] = shippingDocumentType
            };
            if (!string.IsNullOrWhiteSpace(packageId))
                createItem["package_number"] = packageId;
            if (!string.IsNullOrWhiteSpace(trackingNumber))
                createItem["tracking_number"] = trackingNumber;

            var createContent = await SendShopeeDocumentRequestAsync(
                client,
                "/api/v2/logistics/create_shipping_document",
                accessToken,
                shopIdLong,
                new { order_list = new[] { createItem } });
            EnsureShopeeDocumentAccepted(createContent, "create_shipping_document");

            var queryItem = new Dictionary<string, object> { ["order_sn"] = orderId };
            if (!string.IsNullOrWhiteSpace(packageId))
                queryItem["package_number"] = packageId;

            var status = "PROCESSING";
            for (var attempt = 1; attempt <= 4; attempt++)
            {
                if (attempt > 1)
                    await Task.Delay(TimeSpan.FromMilliseconds(500 * attempt));

                var statusContent = await SendShopeeDocumentRequestAsync(
                    client,
                    "/api/v2/logistics/get_shipping_document_result",
                    accessToken,
                    shopIdLong,
                    new { order_list = new[] { queryItem } });
                status = ReadShopeeDocumentStatus(statusContent);
                if (status is "READY" or "FAILED") break;
            }

            if (status == "FAILED")
                throw new PlatformApiException(
                    "Shopee", "logistics.shipping_document_failed",
                    $"Shopee failed to create the waybill for package '{packageId ?? orderId}'.");
            if (status != "READY")
                return new ShippingLabelResult
                {
                    Platform = PlatformType.Shopee,
                    OrderId = orderId,
                    PackageId = packageId,
                    TrackingNumber = trackingNumber ?? string.Empty,
                    DocumentType = shippingDocumentType,
                    Status = "PROCESSING"
                };

            var downloadPayload = new
            {
                shipping_document_type = shippingDocumentType,
                order_list = new[] { queryItem }
            };
            var downloadPath = "/api/v2/logistics/download_shipping_document";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var sign = SignatureHelper.GenerateShopeeSignature(
                _partnerKey, _partnerId, downloadPath, timestamp, accessToken, shopIdLong);
            var query = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}&shop_id={shopIdLong}&sign={sign}";
            using var downloadRequest = new HttpRequestMessage(HttpMethod.Post, downloadPath + query)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(downloadPayload), Encoding.UTF8, "application/json")
            };
            using var downloadResponse = await client.SendAsync(downloadRequest);
            var documentBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
            var contentType = downloadResponse.Content.Headers.ContentType?.MediaType ?? "application/pdf";
            if (!downloadResponse.IsSuccessStatusCode ||
                contentType.Contains("json", StringComparison.OrdinalIgnoreCase))
            {
                var errorContent = Encoding.UTF8.GetString(documentBytes);
                throw CreateShopeeException(errorContent, "download_shipping_document_failed");
            }

            return new ShippingLabelResult
            {
                Platform = PlatformType.Shopee,
                OrderId = orderId,
                PackageId = packageId,
                TrackingNumber = trackingNumber ?? string.Empty,
                DocumentType = shippingDocumentType,
                DocumentBase64 = Convert.ToBase64String(documentBytes),
                ContentType = contentType,
                Status = "READY"
            };
        }

        private async Task<string> SendShopeeDocumentRequestAsync(
            HttpClient client,
            string path,
            string accessToken,
            long shopId,
            object payload)
        {
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var sign = SignatureHelper.GenerateShopeeSignature(
                _partnerKey, _partnerId, path, timestamp, accessToken, shopId);
            var query = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}&shop_id={shopId}&sign={sign}";
            using var request = new HttpRequestMessage(HttpMethod.Post, path + query)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            using var response = await client.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                throw CreateShopeeException(content, $"http_{(int)response.StatusCode}");
            return content;
        }

        private static void EnsureShopeeDocumentAccepted(string content, string fallbackCode)
        {
            using var json = JsonDocument.Parse(content);
            var root = json.RootElement;
            var error = GetShopeeString(root, "error");
            var message = GetShopeeString(root, "message");
            var requestId = GetShopeeString(root, "request_id");
            if (!string.IsNullOrWhiteSpace(error))
                throw new PlatformApiException("Shopee", error, message, requestId);

            if (root.TryGetProperty("response", out var response) &&
                response.TryGetProperty("result_list", out var results) &&
                results.ValueKind == JsonValueKind.Array)
            {
                var failed = results.EnumerateArray().FirstOrDefault(x =>
                    !string.IsNullOrWhiteSpace(GetShopeeString(x, "fail_error")));
                if (failed.ValueKind != JsonValueKind.Undefined)
                    throw new PlatformApiException(
                        "Shopee",
                        GetShopeeString(failed, "fail_error"),
                        GetShopeeString(failed, "fail_message"),
                        requestId);
            }
        }

        private static string ReadShopeeDocumentStatus(string content)
        {
            EnsureShopeeDocumentAccepted(content, "get_shipping_document_result_failed");
            using var json = JsonDocument.Parse(content);
            if (json.RootElement.TryGetProperty("response", out var response) &&
                response.TryGetProperty("result_list", out var results) &&
                results.ValueKind == JsonValueKind.Array)
            {
                var result = results.EnumerateArray().FirstOrDefault();
                if (result.ValueKind != JsonValueKind.Undefined)
                    return GetShopeeString(result, "status").ToUpperInvariant();
            }
            return "PROCESSING";
        }

        private static string NormalizeShopeeDocumentType(string? value)
        {
            var normalized = value?.Trim().ToUpperInvariant();
            return normalized switch
            {
                "THERMAL" => "THERMAL_AIR_WAYBILL",
                "NORMAL" or null or "" => "NORMAL_AIR_WAYBILL",
                _ => normalized
            };
        }

        public async Task<bool> ShipOrderAsync(string accessToken, string? shopId, ShipOrderRequest request)
        {
            _logger.LogInformation("🛒 Shopee: Shipping order {OrderId}", request.OrderId);

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/logistics/ship_order";
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);

            var body = string.IsNullOrWhiteSpace(request.PackageId)
                ? JsonSerializer.Serialize(new { order_sn = request.OrderId, dropoff = new { } })
                : JsonSerializer.Serialize(new { order_sn = request.OrderId, package_number = request.PackageId, dropoff = new { } });
            var bodyJson = body;
            var queryString = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}&shop_id={shopIdLong}&sign={sign}";

            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, apiPath + queryString)
                {
                    Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
                };
                var response = await client.SendAsync(req);
                var content = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                    throw CreateShopeeException(content, response.StatusCode.ToString());
                using var json = JsonDocument.Parse(content);
                var error = GetShopeeString(json.RootElement, "error");
                if (!string.IsNullOrWhiteSpace(error))
                    throw CreateShopeeException(content, error);
                return true;
            }
            catch (PlatformApiException) { throw; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error shipping order");
                return false;
            }
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(
            string accessToken,
            string? shopId,
            bool throwOnApiError = false)
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

                if (!response.IsSuccessStatusCode)
                {
                    if (throwOnApiError)
                        throw CreateShopeeException(content, $"HTTP_{(int)response.StatusCode}");
                    return providers;
                }

                var json = JsonDocument.Parse(content);
                var apiError = GetShopeeString(json.RootElement, "error");
                if (throwOnApiError && !string.IsNullOrWhiteSpace(apiError))
                    throw CreateShopeeException(content, apiError);
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
            catch (PlatformApiException) when (throwOnApiError)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Shopee: Error fetching shipping providers");
                if (throwOnApiError)
                    throw;
            }

            return providers;
        }

        public async Task<TrackingInfo?> GetTrackingInfoAsync(
            string accessToken,
            string? shopId,
            string orderId,
            IReadOnlyCollection<string>? packageNumbers = null)
        {
            _logger.LogInformation("🛒 Shopee: Getting tracking for order {OrderId}", orderId);

            // get_order_detail returns package_list, which is the source of truth
            // when Shopee splits one order into multiple parcels. Keep the old
            // single tracking endpoint as a fallback for older/sandbox payloads.
            var detail = await GetOrderDetailAsync(accessToken, shopId, orderId);
            var client = _httpClientFactory.CreateClient("Shopee");
            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;

            // A previous request may have completed split_order before its WMS
            // HTTP request timed out. On retry, use the durable package numbers
            // saved by OMS and never call a split Shopee order with order_sn only.
            var requestedPackageNumbers = packageNumbers?
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? new List<string>();

            // Shopee's unsplit order must be queried with order_sn only. WMS
            // may still send a saved package mapping from a previous retry,
            // so discard it when the current order detail proves that Shopee
            // has only one package.
            if (detail != null && detail.Packages.Count <= 1)
                requestedPackageNumbers.Clear();

            if (requestedPackageNumbers.Count > 0)
            {
                var packages = requestedPackageNumbers.Select(packageNumber =>
                {
                    var existing = detail?.Packages.FirstOrDefault(x =>
                        string.Equals(x.PackageId, packageNumber, StringComparison.OrdinalIgnoreCase));
                    return existing ?? new ShippingPackage { PackageId = packageNumber };
                }).ToList();

                foreach (var package in packages.Where(x => string.IsNullOrWhiteSpace(x.TrackingNumber)))
                {
                    package.TrackingNumber = await GetShopeeTrackingNumberAsync(
                        client, accessToken, shopIdLong, orderId, package.PackageId);
                }

                var primary = packages[0];
                return new TrackingInfo
                {
                    TrackingNumber = primary.TrackingNumber,
                    Carrier = primary.Carrier,
                    Platform = PlatformType.Shopee,
                    OrderId = orderId,
                    Status = primary.Status.Length > 0
                        ? primary.Status : detail?.OriginalStatus ?? string.Empty,
                    Packages = packages
                };
            }

            if (detail != null && detail.Packages.Count > 0)
            {
                // Shopee may expose package_number first and issue the actual
                // tracking number only through get_tracking_number. Resolve
                // each package independently so split orders retain all AWBs.
                foreach (var package in detail.Packages.Where(p =>
                    string.IsNullOrWhiteSpace(p.TrackingNumber) &&
                    !string.IsNullOrWhiteSpace(p.PackageId)))
                {
                    package.TrackingNumber = await GetShopeeTrackingNumberAsync(
                        client,
                        accessToken,
                        shopIdLong,
                        orderId,
                        detail.Packages.Count > 1 ? package.PackageId : null);
                }

                // For a split order, an empty tracking number before Arrange
                // Shipment is expected. Return the package list to the caller so
                // it can arrange each package independently. Never fall through
                // to the legacy order_sn-only tracking request because Shopee
                // requires package_number once an order has been split.
                if (detail.Packages.Count > 1 ||
                    detail.Packages.Any(p => !string.IsNullOrWhiteSpace(p.TrackingNumber)))
                {
                    var primary = detail.Packages[0];
                    return new TrackingInfo
                    {
                        TrackingNumber = primary.TrackingNumber,
                        Carrier = primary.Carrier,
                        Platform = PlatformType.Shopee,
                        OrderId = orderId,
                        Status = primary.Status.Length > 0 ? primary.Status : detail.OriginalStatus,
                        Packages = detail.Packages
                            .Select(p => new ShippingPackage
                            {
                                PackageId = p.PackageId,
                                TrackingNumber = p.TrackingNumber,
                                Carrier = p.Carrier,
                                Status = p.Status,
                                ShippingMethod = p.ShippingMethod,
                                ItemIds = new List<string>(p.ItemIds),
                                Events = new List<TrackingEvent>(p.Events)
                            })
                            .ToList()
                    };
                }
            }

            var trackingNumber = await GetShopeeTrackingNumberAsync(
                client, accessToken, shopIdLong, orderId,
                detail?.Packages.Count > 1 ? detail.Packages[0].PackageId : null);

            if (detail != null && detail.Packages.Count > 0)
            {
                if (detail.Packages.Count == 1 && !string.IsNullOrWhiteSpace(trackingNumber))
                    detail.Packages[0].TrackingNumber = trackingNumber;

                var primary = detail.Packages[0];
                return new TrackingInfo
                {
                    TrackingNumber = !string.IsNullOrWhiteSpace(primary.TrackingNumber)
                        ? primary.TrackingNumber : trackingNumber,
                    Carrier = primary.Carrier,
                    Platform = PlatformType.Shopee,
                    OrderId = orderId,
                    Status = primary.Status.Length > 0 ? primary.Status : detail.OriginalStatus,
                    Packages = detail.Packages
                };
            }

            if (string.IsNullOrWhiteSpace(trackingNumber)) return null;
            return new TrackingInfo
            {
                TrackingNumber = trackingNumber,
                Platform = PlatformType.Shopee,
                OrderId = orderId,
                Status = "Tracked",
                Packages = new List<ShippingPackage>
                {
                    new() { TrackingNumber = trackingNumber, Status = "Tracked" }
                }
            };
        }

        private async Task<string> GetShopeeTrackingNumberAsync(
            HttpClient client, string accessToken, long shopId, string orderId, string? packageNumber)
        {
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/logistics/get_tracking_number";
            var sign = SignatureHelper.GenerateShopeeSignature(_partnerKey, _partnerId, apiPath, timestamp, accessToken, shopId);

            var queryParams = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopId}&sign={sign}&order_sn={Uri.EscapeDataString(orderId)}";
            if (!string.IsNullOrWhiteSpace(packageNumber))
                queryParams += $"&package_number={Uri.EscapeDataString(packageNumber)}";

            try
            {
                var response = await client.GetAsync(apiPath + queryParams);
                var content = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                    throw CreateShopeeException(content, response.StatusCode.ToString());
                using var json = JsonDocument.Parse(content);
                var error = GetShopeeString(json.RootElement, "error");
                if (!string.IsNullOrWhiteSpace(error))
                    throw CreateShopeeException(content, error);
                if (!json.RootElement.TryGetProperty("response", out var responseData)) return "";

                var directTracking = GetShopeeString(responseData, "tracking_number");
                if (!string.IsNullOrWhiteSpace(directTracking)) return directTracking;

                if (responseData.TryGetProperty("success_list", out var successList) &&
                    successList.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in successList.EnumerateArray())
                    {
                        var itemPackageNumber = GetShopeeString(item, "package_number");
                        if (string.IsNullOrWhiteSpace(packageNumber) || itemPackageNumber == packageNumber)
                            return GetShopeeString(item, "tracking_number");
                    }
                }
            }
            catch (PlatformApiException ex) when (
                !string.IsNullOrWhiteSpace(packageNumber) &&
                IsShopeeUnsplitPackageError(ex))
            {
                // A stale WMS/platform mapping can make an unsplit order look
                // packaged. Retry once without package_number as required by
                // Shopee's logistics API.
                _logger.LogInformation(
                    "Shopee order {OrderId} is unsplit; retrying tracking without package_number {PackageNumber}",
                    orderId,
                    packageNumber);
                return await GetShopeeTrackingNumberAsync(
                    client, accessToken, shopId, orderId, null);
            }
            catch (PlatformApiException) { throw; }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Shopee: Error resolving tracking for package {PackageNumber}", packageNumber);
            }
            return "";
        }

        private static bool IsShopeeUnsplitPackageError(PlatformApiException exception)
        {
            return exception.Code.Contains(
                       "logistics.ship_order_not_need_pacakge_number",
                       StringComparison.OrdinalIgnoreCase) ||
                   exception.Message.Contains(
                       "not_need_pacakge_number",
                       StringComparison.OrdinalIgnoreCase) ||
                   exception.Message.Contains(
                       "don't request with package_number",
                       StringComparison.OrdinalIgnoreCase);
        }

        private static PlatformApiException CreateShopeeException(string content, string fallbackCode)
        {
            try
            {
                using var json = JsonDocument.Parse(content);
                var root = json.RootElement;
                var code = GetShopeeString(root, "error");
                var message = GetShopeeString(root, "message");
                var requestId = GetShopeeString(root, "request_id");
                return new PlatformApiException(
                    "Shopee",
                    string.IsNullOrWhiteSpace(code) ? fallbackCode : code,
                    string.IsNullOrWhiteSpace(message) ? "Request failed." : message,
                    requestId);
            }
            catch (JsonException)
            {
                return new PlatformApiException("Shopee", fallbackCode, "Request failed.");
            }
        }

        public async Task<SplitPlatformOrderResult> SplitOrderAsync(
            string accessToken,
            string? shopId,
            SplitPlatformOrderRequest request)
        {
            if (request.Packages.Count < 2)
                throw new InvalidOperationException("Shopee split_order requires at least two WMS packages.");
            if (!long.TryParse(shopId, out var shopIdLong) || shopIdLong <= 0)
                throw new InvalidOperationException("A valid Shopee shop_id is required to split an order.");

            var order = await GetOrderDetailAsync(accessToken, shopId, request.OrderId)
                ?? throw new InvalidOperationException($"Shopee order '{request.OrderId}' was not found.");
            if (order.Items.Count == 0)
                throw new InvalidOperationException("Shopee did not return item_list for the order.");

            var orderedPackages = request.Packages.OrderBy(x => x.BoxNumber).ToList();
            var payloadPackages = new List<ShopeeSplitPackagePayload>();
            var requestedTotals = new Dictionary<string, long>(StringComparer.Ordinal);

            foreach (var package in orderedPackages)
            {
                if (package.Items.Count == 0)
                    throw new InvalidOperationException($"WMS box {package.BoxNumber} does not contain any items.");

                var payloadItems = new List<ShopeeSplitItemPayload>();
                foreach (var wmsItem in package.Items
                    .GroupBy(x => x.ItemNumber.Trim(), StringComparer.OrdinalIgnoreCase)
                    .Select(x => new { ItemNumber = x.Key, Quantity = x.Sum(y => y.Quantity) }))
                {
                    if (wmsItem.Quantity <= 0 || wmsItem.Quantity != decimal.Truncate(wmsItem.Quantity))
                        throw new InvalidOperationException(
                            $"Shopee requires a whole-number quantity for item '{wmsItem.ItemNumber}' in WMS box {package.BoxNumber}.");

                    var matches = order.Items
                        .Where(x => string.Equals(x.Sku?.Trim(), wmsItem.ItemNumber, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                    // The Shopee sandbox Test Order screen displays item_id as
                    // "Item ID" and frequently leaves both model_sku and item_sku
                    // empty. Production WMS data should continue to match seller
                    // SKU first; item_id is an exact, unique sandbox fallback.
                    if (matches.Count == 0)
                    {
                        matches = order.Items
                            .Where(x => string.Equals(
                                x.ItemId?.Trim(),
                                wmsItem.ItemNumber,
                                StringComparison.OrdinalIgnoreCase))
                            .ToList();
                    }
                    // Sandbox products frequently have no seller SKU. A single
                    // Shopee order line is still unambiguous and can be safely
                    // allocated across multiple WMS boxes.
                    if (matches.Count == 0 && order.Items.Count == 1)
                        matches.Add(order.Items[0]);
                    if (matches.Count != 1)
                        throw new InvalidOperationException(
                            $"WMS item '{wmsItem.ItemNumber}' could not be matched uniquely to Shopee item_list " +
                            $"by seller SKU or item_id.");

                    var orderItem = matches[0];
                    if (!long.TryParse(orderItem.ItemId, out var itemId) || itemId <= 0)
                        throw new InvalidOperationException(
                            $"Shopee item_id is missing for WMS item '{wmsItem.ItemNumber}'.");
                    var modelQuantity = decimal.ToInt64(wmsItem.Quantity);
                    var orderItemId = orderItem.OrderItemId > 0 ? orderItem.OrderItemId : itemId;
                    var itemKey = $"{itemId}:{orderItem.ModelId}:{orderItemId}:{orderItem.PromotionGroupId}";
                    requestedTotals[itemKey] = requestedTotals.GetValueOrDefault(itemKey) + modelQuantity;
                    payloadItems.Add(new ShopeeSplitItemPayload
                    {
                        ItemId = itemId,
                        ModelId = orderItem.ModelId,
                        OrderItemId = orderItemId,
                        PromotionGroupId = orderItem.PromotionGroupId,
                        ModelQuantity = modelQuantity
                    });
                }
                payloadPackages.Add(new ShopeeSplitPackagePayload { ItemList = payloadItems });
            }

            foreach (var orderItem in order.Items)
            {
                if (!long.TryParse(orderItem.ItemId, out var itemId) || itemId <= 0)
                    throw new InvalidOperationException("Shopee returned an invalid item_id while validating split quantities.");
                var orderItemId = orderItem.OrderItemId > 0 ? orderItem.OrderItemId : itemId;
                var itemKey = $"{itemId}:{orderItem.ModelId}:{orderItemId}:{orderItem.PromotionGroupId}";
                requestedTotals.TryGetValue(itemKey, out var requestedQuantity);
                if (requestedQuantity != orderItem.Quantity)
                    throw new InvalidOperationException(
                        $"Split quantity for Shopee item '{orderItem.Sku}' is {requestedQuantity}, " +
                        $"but the order quantity is {orderItem.Quantity}. All order items must be included exactly once.");
            }

            var client = _httpClientFactory.CreateClient("Shopee");
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/order/split_order";
            var sign = SignatureHelper.GenerateShopeeSignature(
                _partnerKey, _partnerId, apiPath, timestamp, accessToken, shopIdLong);
            var queryString = $"?partner_id={_partnerId}&timestamp={timestamp}&access_token={accessToken}" +
                              $"&shop_id={shopIdLong}&sign={sign}";
            var body = JsonSerializer.Serialize(new
            {
                order_sn = request.OrderId,
                package_list = payloadPackages
            });
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, apiPath + queryString)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
            var response = await client.SendAsync(httpRequest);
            var content = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                throw CreateShopeeException(content, response.StatusCode.ToString());
            using var json = JsonDocument.Parse(content);
            var error = GetShopeeString(json.RootElement, "error");
            if (!string.IsNullOrWhiteSpace(error))
                throw CreateShopeeException(content, error);
            if (!json.RootElement.TryGetProperty("response", out var responseData) ||
                !responseData.TryGetProperty("package_list", out var packageList) ||
                packageList.ValueKind != JsonValueKind.Array)
                throw new InvalidOperationException("Shopee split_order did not return package_list.");

            var returnedPackages = packageList.EnumerateArray().ToList();
            if (returnedPackages.Count != orderedPackages.Count)
                throw new InvalidOperationException(
                    $"Shopee split_order returned {returnedPackages.Count} package(s), " +
                    $"but WMS requested {orderedPackages.Count} box(es).");

            var result = new SplitPlatformOrderResult();
            for (var index = 0; index < returnedPackages.Count; index++)
            {
                var packageNumber = GetShopeeString(returnedPackages[index], "package_number");
                if (string.IsNullOrWhiteSpace(packageNumber))
                    throw new InvalidOperationException("Shopee split_order returned a package without package_number.");
                result.PackageMappings.Add(new PlatformPackageMappingRequest
                {
                    WmsPackageRef = orderedPackages[index].WmsPackageRef,
                    PlatformPackageId = packageNumber
                });
            }
            return result;
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

            var orderCarrier = order.TryGetProperty("shipping_carrier", out var carrier)
                ? GetShopeeString(carrier) : "";
            var orderTrackingNumber = order.TryGetProperty("tracking_no", out var trackingNo)
                ? GetShopeeString(trackingNo) : "";
            var shippingFee = order.TryGetProperty("estimated_shipping_fee", out var fee)
                ? GetShopeeDecimal(fee) : 0m;

            var packages = new List<ShippingPackage>();
            if (order.TryGetProperty("package_list", out var pkgList) &&
                pkgList.ValueKind == JsonValueKind.Array)
            {
                foreach (var pkg in pkgList.EnumerateArray())
                {
                    var mapped = new ShippingPackage
                    {
                        PackageId = GetShopeeString(pkg, "package_number", "package_id", "package_query_number"),
                        TrackingNumber = GetShopeeString(pkg, "tracking_number", "tracking_no"),
                        Carrier = GetShopeeString(pkg, "shipping_carrier", "shipping_provider", "carrier"),
                        Status = GetShopeeString(pkg, "logistics_status", "package_status", "status"),
                        ShippingMethod = GetShopeeString(pkg, "shipping_type", "shipping_method")
                    };

                    if (mapped.TrackingNumber.Length == 0 && pkgList.GetArrayLength() == 1)
                        mapped.TrackingNumber = orderTrackingNumber;
                    if (mapped.Carrier.Length == 0)
                        mapped.Carrier = orderCarrier;

                    if (mapped.PackageId.Length > 0 || mapped.TrackingNumber.Length > 0 || mapped.Carrier.Length > 0)
                        packages.Add(mapped);
                }
            }

            if (packages.Count == 0 &&
                (!string.IsNullOrWhiteSpace(orderTrackingNumber) || !string.IsNullOrWhiteSpace(orderCarrier)))
            {
                packages.Add(new ShippingPackage
                {
                    TrackingNumber = orderTrackingNumber,
                    Carrier = orderCarrier
                });
            }

            unified.Packages = packages;
            var firstPackage = packages.FirstOrDefault();
            unified.Shipping = new ShippingInfo
            {
                Carrier = firstPackage?.Carrier ?? orderCarrier,
                TrackingNumber = firstPackage?.TrackingNumber ?? orderTrackingNumber,
                PackageNumber = firstPackage?.PackageId ?? "",
                ShippingFee = shippingFee,
                ShippingMethod = firstPackage?.ShippingMethod ?? ""
            };

            if (order.TryGetProperty("recipient_address", out var recipientAddr) && recipientAddr.ValueKind != JsonValueKind.Null)
            {
                if (unified.Shipping == null)
                {
                    unified.Shipping = new ShippingInfo();
                }

                var fullAddress = recipientAddr.TryGetProperty("full_address", out var fa) ? fa.GetString() ?? "" : "";

                unified.Shipping.RecipientAddress = new RecipientAddress
                {
                    Name = recipientAddr.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "",
                    Phone = recipientAddr.TryGetProperty("phone", out var phone) ? phone.GetString() ?? "" : "",
                    SubDistrict = recipientAddr.TryGetProperty("town", out var town) ? town.GetString() ?? "" : "",
                    District = recipientAddr.TryGetProperty("district", out var dist) ? dist.GetString() ?? "" : (recipientAddr.TryGetProperty("city", out var city) ? city.GetString() ?? "" : ""),
                    Province = recipientAddr.TryGetProperty("state", out var state) ? state.GetString() ?? "" : "",
                    PostalCode = recipientAddr.TryGetProperty("zipcode", out var zipcode) ? zipcode.GetString() ?? "" : "",
                    Country = recipientAddr.TryGetProperty("region", out var region) ? region.GetString() ?? "TH" : "TH",
                    FullAddress = fullAddress,
                    AddressLine1 = fullAddress
                };
            }

            if (order.TryGetProperty("item_list", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    var itemId = item.TryGetProperty("item_id", out var iid)
                        ? GetShopeeString(iid) : "";
                    unified.Items.Add(new OrderItem
                    {
                        ItemId = itemId,
                        ModelId = GetShopeeInt64(item, "model_id"),
                        OrderItemId = GetShopeeInt64(item, "order_item_id"),
                        PromotionGroupId = GetShopeeInt64(item, "promotion_group_id", "group_id"),
                        Name = item.TryGetProperty("item_name", out var iname) ? iname.GetString() ?? "" : "",
                        Sku = GetShopeeString(item, "model_sku", "item_sku"),
                        Quantity = item.TryGetProperty("model_quantity_purchased", out var qty) ? qty.GetInt32() : 0,
                        UnitPrice = item.TryGetProperty("model_discounted_price", out var price) ? price.GetDecimal() : 0,
                        ImageUrl = item.TryGetProperty("image_info", out var img) && img.TryGetProperty("image_url", out var url)
                            ? url.GetString() ?? "" : "",
                        Variation = item.TryGetProperty("model_name", out var vname) ? vname.GetString() ?? "" : "",
                        Weight = item.TryGetProperty("weight", out var w) ? w.GetDecimal() : null
                    });

                    var packageId = GetShopeeString(item, "package_number", "package_id");
                    if (packageId.Length > 0)
                    {
                        var package = packages.FirstOrDefault(p => p.PackageId == packageId);
                        // Some Shopee sandbox responses expose package_number on
                        // item_list but omit package_list after a split. Build the
                        // package collection from the item rows so a retry can
                        // still arrange and retrieve each parcel independently.
                        if (package == null)
                        {
                            package = new ShippingPackage
                            {
                                PackageId = packageId,
                                Carrier = orderCarrier
                            };
                            packages.Add(package);
                        }
                        if (package != null && itemId.Length > 0 && !package.ItemIds.Contains(itemId))
                            package.ItemIds.Add(itemId);
                    }
                }
            }

            return unified;
        }

        private static string GetShopeeString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (!element.TryGetProperty(propertyName, out var value) ||
                    value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                    continue;

                var text = value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
                if (!string.IsNullOrWhiteSpace(text)) return text;
            }
            return "";
        }

        private static string GetShopeeString(JsonElement value)
            => value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : value.ToString();

        private static decimal GetShopeeDecimal(JsonElement value)
            => decimal.TryParse(
                GetShopeeString(value),
                System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture,
                out var number) ? number : 0m;

        private static long GetShopeeInt64(JsonElement element, params string[] propertyNames)
        {
            var value = GetShopeeString(element, propertyNames);
            return long.TryParse(value, out var number) ? number : 0;
        }

        private sealed class ShopeeSplitPackagePayload
        {
            [JsonPropertyName("item_list")]
            public List<ShopeeSplitItemPayload> ItemList { get; set; } = new();
        }

        private sealed class ShopeeSplitItemPayload
        {
            [JsonPropertyName("item_id")]
            public long ItemId { get; set; }
            [JsonPropertyName("model_id")]
            public long ModelId { get; set; }
            [JsonPropertyName("order_item_id")]
            public long OrderItemId { get; set; }
            [JsonPropertyName("promotion_group_id")]
            public long PromotionGroupId { get; set; }
            [JsonPropertyName("model_quantity")]
            public long ModelQuantity { get; set; }
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
