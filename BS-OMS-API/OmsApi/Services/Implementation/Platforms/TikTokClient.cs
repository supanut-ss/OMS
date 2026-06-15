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
    /// TikTok Shop API client
    /// API Docs: https://developers.tiktok.com/doc/overview
    /// </summary>
    public class TikTokClient : IPlatformClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TikTokClient> _logger;
        private readonly string _appKey;
        private readonly string _appSecret;

        public PlatformType Platform => PlatformType.TikTok;

        public TikTokClient(IHttpClientFactory httpClientFactory, ILogger<TikTokClient> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _appKey = Environment.GetEnvironmentVariable("TIKTOK_APP_KEY") ?? "";
            _appSecret = Environment.GetEnvironmentVariable("TIKTOK_APP_SECRET") ?? "";
        }

        public async Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(string accessToken, string? shopId, OrderFilter filter)
        {
            _logger.LogInformation("🎵 TikTok: Fetching orders for shop {ShopId}", shopId);

            var client = _httpClientFactory.CreateClient("TikTok");
            var apiPath = "/order/202309/orders/search";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            // Build request body
            var body = new
            {
                page_size = Math.Min(filter.PageSize, 100),
                sort_order = "DESC",
                sort_field = "CREATE_TIME",
                create_time_ge = filter.DateFrom.HasValue
                    ? DateTimeHelper.ToUnixTimestamp(filter.DateFrom.Value)
                    : DateTimeHelper.ToUnixTimestamp(DateTime.UtcNow.AddDays(-15)),
                create_time_lt = filter.DateTo.HasValue
                    ? DateTimeHelper.ToUnixTimestamp(filter.DateTo.Value)
                    : DateTimeHelper.CurrentUnixTimestamp()
            };

            var bodyJson = JsonSerializer.Serialize(body);

            var queryParams = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" },
                { "access_token", accessToken },
                { "version", "202309" }
            };

            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, queryParams, bodyJson);
            queryParams["sign"] = sign;

            var queryString = string.Join("&", queryParams.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{apiPath}?{queryString}")
                {
                    Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
                };

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                _logger.LogDebug("TikTok response: {Content}", content);

                var result = new PaginatedResult<UnifiedOrder>
                {
                    Page = filter.Page,
                    PageSize = filter.PageSize
                };

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ TikTok API error: {StatusCode} - {Content}", response.StatusCode, content);
                    return result;
                }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    if (data.TryGetProperty("total_count", out var total))
                    {
                        result.TotalCount = total.GetInt32();
                    }
                    if (data.TryGetProperty("orders", out var orders))
                    {
                        foreach (var order in orders.EnumerateArray())
                        {
                            result.Items.Add(MapTikTokOrder(order));
                        }
                    }
                }

                _logger.LogInformation("✅ TikTok: Retrieved {Count} orders", result.Items.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ TikTok: Error fetching orders");
                return new PaginatedResult<UnifiedOrder>();
            }
        }

        public async Task<UnifiedOrder?> GetOrderDetailAsync(string accessToken, string? shopId, string orderId)
        {
            _logger.LogInformation("🎵 TikTok: Fetching order detail {OrderId}", orderId);

            var client = _httpClientFactory.CreateClient("TikTok");
            var apiPath = $"/order/202309/orders";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            var queryParams = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" },
                { "access_token", accessToken },
                { "version", "202309" },
                { "ids", orderId }
            };

            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, queryParams);
            queryParams["sign"] = sign;

            var queryString = string.Join("&", queryParams.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var response = await client.GetAsync($"{apiPath}?{queryString}");
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ TikTok order detail error: {Content}", content);
                    return null;
                }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data) &&
                    data.TryGetProperty("orders", out var orders))
                {
                    var orderArr = orders.EnumerateArray().ToList();
                    if (orderArr.Count > 0)
                    {
                        return MapTikTokOrderDetail(orderArr[0]);
                    }
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ TikTok: Error fetching order detail");
                return null;
            }
        }

        private static UnifiedOrder MapTikTokOrder(JsonElement order)
        {
            var status = order.TryGetProperty("status", out var s) ? s.GetString() ?? "" : "";
            var unified = new UnifiedOrder
            {
                OrderId = order.TryGetProperty("id", out var oid) ? oid.GetString() ?? "" : "",
                Platform = PlatformType.TikTok,
                Status = OrderStatusMapper.FromTikTok(status),
                OriginalStatus = status,
                CreatedAt = order.TryGetProperty("create_time", out var ct)
                    ? DateTimeHelper.FromUnixTimestamp(ct.GetInt64()) : DateTime.MinValue,
                TotalAmount = order.TryGetProperty("payment", out var pay) &&
                              pay.TryGetProperty("total_amount", out var amt)
                    ? decimal.TryParse(amt.GetString(), out var d) ? d : 0
                    : 0,
                BuyerRemarks = order.TryGetProperty("buyer_message", out var msg) ? msg.GetString() ?? "" : ""
            };

            MapTikTokAddress(order, unified);
            return unified;
        }

        private static UnifiedOrder MapTikTokOrderDetail(JsonElement order)
        {
            var status = order.TryGetProperty("status", out var s) ? s.GetString() ?? "" : "";

            var unified = new UnifiedOrder
            {
                OrderId = order.TryGetProperty("id", out var oid) ? oid.GetString() ?? "" : "",
                Platform = PlatformType.TikTok,
                Status = OrderStatusMapper.FromTikTok(status),
                OriginalStatus = status,
                BuyerRemarks = order.TryGetProperty("buyer_message", out var msg) ? msg.GetString() ?? "" : "",
                CreatedAt = order.TryGetProperty("create_time", out var ct)
                    ? DateTimeHelper.FromUnixTimestamp(ct.GetInt64()) : DateTime.MinValue,
                UpdatedAt = order.TryGetProperty("update_time", out var ut)
                    ? DateTimeHelper.FromUnixTimestamp(ut.GetInt64()) : null,
                Currency = order.TryGetProperty("payment", out var pay2) &&
                           pay2.TryGetProperty("currency", out var cur)
                    ? cur.GetString() ?? "THB" : "THB"
            };

            // Total amount
            if (order.TryGetProperty("payment", out var pay) &&
                pay.TryGetProperty("total_amount", out var amt))
            {
                unified.TotalAmount = decimal.TryParse(amt.GetString(), out var d) ? d : 0;
            }

            // Cancellation deadline
            if (order.TryGetProperty("cancel_order_sn_deadline", out var deadline))
            {
                if (deadline.TryGetInt64(out var dlTs))
                {
                    unified.CancellationDeadline = DateTimeHelper.FromUnixTimestamp(dlTs);
                }
            }

            // Tax invoice
            if (order.TryGetProperty("invoice_request", out var inv) && inv.ValueKind != JsonValueKind.Null)
            {
                unified.TaxInvoiceRequested = true;
                unified.TaxInvoice = new TaxInvoiceInfo
                {
                    TaxId = inv.TryGetProperty("tax_id", out var tid) ? tid.GetString() ?? "" : "",
                    CompanyName = inv.TryGetProperty("company_name", out var cn) ? cn.GetString() ?? "" : ""
                };
            }

            // Line items
            if (order.TryGetProperty("line_items", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    unified.Items.Add(new OrderItem
                    {
                        ItemId = item.TryGetProperty("id", out var iid) ? iid.GetString() ?? "" : "",
                        Name = item.TryGetProperty("product_name", out var pname) ? pname.GetString() ?? "" : "",
                        Sku = item.TryGetProperty("seller_sku", out var sku) ? sku.GetString() ?? "" : "",
                        Quantity = item.TryGetProperty("quantity", out var qty) ? qty.GetInt32() : 0,
                        UnitPrice = item.TryGetProperty("sale_price", out var sp)
                            ? decimal.TryParse(sp.GetString(), out var spd) ? spd : 0 : 0,
                        ImageUrl = item.TryGetProperty("product_image", out var img) &&
                                   img.TryGetProperty("url", out var url)
                            ? url.GetString() ?? "" : "",
                        Variation = item.TryGetProperty("sku_name", out var vn) ? vn.GetString() ?? "" : ""
                    });
                }
            }

            // Shipping
            if (order.TryGetProperty("packages", out var packages))
            {
                var pkg = packages.EnumerateArray().FirstOrDefault();
                if (pkg.ValueKind != JsonValueKind.Undefined)
                {
                    unified.Shipping = new ShippingInfo
                    {
                        TrackingNumber = pkg.TryGetProperty("tracking_number", out var tn) ? tn.GetString() ?? "" : "",
                        Carrier = pkg.TryGetProperty("shipping_provider_name", out var spn) ? spn.GetString() ?? "" : ""
                    };
                }
            }

            MapTikTokAddress(order, unified);
            return unified;
        }

        private static void MapTikTokAddress(JsonElement order, UnifiedOrder unified)
        {
            if (order.TryGetProperty("recipient_address", out var addr) && addr.ValueKind != JsonValueKind.Null)
            {
                if (unified.Shipping == null)
                {
                    unified.Shipping = new ShippingInfo();
                }

                var line1 = addr.TryGetProperty("address_line1", out var a1) ? a1.GetString() ?? "" : "";
                var line2 = addr.TryGetProperty("address_line2", out var a2) ? a2.GetString() ?? "" : "";
                var line3 = addr.TryGetProperty("address_line3", out var a3) ? a3.GetString() ?? "" : "";
                var line4 = addr.TryGetProperty("address_line4", out var a4) ? a4.GetString() ?? "" : "";

                var extraLines = new List<string> { line2, line3, line4 }.Where(s => !string.IsNullOrWhiteSpace(s));
                var addressLine2Combined = string.Join(", ", extraLines);

                var city = addr.TryGetProperty("city", out var c) ? c.GetString() ?? "" : "";
                var state = addr.TryGetProperty("state", out var stVal) ? stVal.GetString() ?? "" : "";
                var postalCode = addr.TryGetProperty("postal_code", out var pc) ? pc.GetString() ?? "" : "";
                var country = addr.TryGetProperty("country_code", out var co) ? co.GetString() ?? "TH" : "TH";

                // Construct full address
                var allParts = new List<string> { line1, line2, line3, line4, city, state, postalCode }
                    .Where(s => !string.IsNullOrWhiteSpace(s));
                var fullAddress = string.Join(" ", allParts);

                unified.Shipping.RecipientAddress = new RecipientAddress
                {
                    Name = addr.TryGetProperty("full_name", out var fn) ? fn.GetString() ?? "" : "",
                    Phone = addr.TryGetProperty("phone_number", out var pn) ? pn.GetString() ?? "" : "",
                    AddressLine1 = line1,
                    AddressLine2 = addressLine2Combined,
                    District = city, // In TH, city represents Amphur/District
                    Province = state, // In TH, state represents Changwat/Province
                    PostalCode = postalCode,
                    Country = country,
                    FullAddress = fullAddress
                };
            }
        }

        // ── Inventory ─────────────────────────────────────

        public async Task<PaginatedResult<ProductItem>> GetProductsAsync(string accessToken, string? shopId, ProductFilter filter)
        {
            _logger.LogInformation("🎵 TikTok: Fetching products");
            var client = _httpClientFactory.CreateClient("TikTok");
            var apiPath = "/product/202309/products/search";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            var body = new { page_size = Math.Min(filter.PageSize, 100) };
            var bodyJson = JsonSerializer.Serialize(body);

            var qp = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" }, { "access_token", accessToken }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp, bodyJson);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            var result = new PaginatedResult<ProductItem> { Page = filter.Page, PageSize = filter.PageSize };
            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, $"{apiPath}?{qs}")
                { Content = new StringContent(bodyJson, Encoding.UTF8, "application/json") };
                var resp = await client.SendAsync(req);
                var content = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode) return result;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    if (data.TryGetProperty("total_count", out var total)) result.TotalCount = total.GetInt32();
                    if (data.TryGetProperty("products", out var products))
                    {
                        foreach (var p in products.EnumerateArray())
                        {
                            var item = new ProductItem
                            {
                                Platform = PlatformType.TikTok,
                                ItemId = p.TryGetProperty("id", out var pid) ? pid.GetString() ?? "" : "",
                                Name = p.TryGetProperty("title", out var title) ? title.GetString() ?? "" : "",
                                Status = p.TryGetProperty("status", out var st) ? st.GetString() ?? "" : "",
                                CreatedAt = p.TryGetProperty("create_time", out var ct)
                                    ? DateTimeHelper.FromUnixTimestamp(ct.GetInt64()) : DateTime.MinValue
                            };

                            if (p.TryGetProperty("skus", out var skus))
                            {
                                foreach (var sku in skus.EnumerateArray())
                                {
                                    item.Variations.Add(new VariationStock
                                    {
                                        VariationId = sku.TryGetProperty("id", out var sid) ? sid.GetString() ?? "" : "",
                                        VariationName = sku.TryGetProperty("name", out var sn) ? sn.GetString() ?? "" : "",
                                        Sku = sku.TryGetProperty("seller_sku", out var ss) ? ss.GetString() ?? "" : "",
                                        Price = sku.TryGetProperty("price", out var pr) &&
                                                pr.TryGetProperty("sale_price", out var sp)
                                                ? decimal.TryParse(sp.GetString(), out var spd) ? spd : 0 : 0,
                                        CurrentStock = sku.TryGetProperty("inventory", out var inv) &&
                                                       inv.EnumerateArray().FirstOrDefault().TryGetProperty("quantity", out var qty)
                                                       ? qty.GetInt32() : 0
                                    });
                                }
                                if (item.Variations.Count == 1)
                                {
                                    item.Sku = item.Variations[0].Sku;
                                    item.Price = item.Variations[0].Price;
                                    item.Stock = new StockInfo { CurrentStock = item.Variations[0].CurrentStock };
                                    item.Variations.Clear();
                                }
                            }

                            if (p.TryGetProperty("main_images", out var imgs) && imgs.GetArrayLength() > 0)
                            {
                                var firstImg = imgs[0];
                                item.ImageUrl = firstImg.TryGetProperty("url", out var imgUrl) ? imgUrl.GetString() ?? "" : "";
                            }

                            result.Items.Add(item);
                        }
                    }
                }
                _logger.LogInformation("✅ TikTok: Retrieved {Count} products", result.Items.Count);
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ TikTok: Error fetching products"); }
            return result;
        }

        public async Task<ProductItem?> GetProductDetailAsync(string accessToken, string? shopId, string itemId)
        {
            var filter = new ProductFilter { Page = 1, PageSize = 100 };
            var result = await GetProductsAsync(accessToken, shopId, filter);
            return result.Items.FirstOrDefault(p => p.ItemId == itemId);
        }

        public async Task<bool> UpdateStockAsync(string accessToken, string? shopId, string itemId, string? variationId, int newStock)
        {
            _logger.LogInformation("🎵 TikTok: Updating stock for item {ItemId}", itemId);
            var client = _httpClientFactory.CreateClient("TikTok");
            var apiPath = "/product/202309/inventory/update";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            var body = new
            {
                product_id = itemId,
                skus = new[] { new { id = variationId ?? itemId, inventory = new[] { new { quantity = newStock } } } }
            };
            var bodyJson = JsonSerializer.Serialize(body);

            var qp = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" }, { "access_token", accessToken }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp, bodyJson);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, $"{apiPath}?{qs}")
                { Content = new StringContent(bodyJson, Encoding.UTF8, "application/json") };
                var resp = await client.SendAsync(req);
                return resp.IsSuccessStatusCode;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ TikTok: Error updating stock"); return false; }
        }

        // ── Shipping ──────────────────────────────────────

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(string accessToken, string? shopId, string orderId, string? packageId, string documentType)
        {
            _logger.LogInformation("🎵 TikTok: Getting shipping label for package {PackageId}", packageId);
            var client = _httpClientFactory.CreateClient("TikTok");
            var apiPath = "/fulfillment/202309/packages/get";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            var qp = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" }, { "access_token", accessToken },
                { "version", "202309" }, { "package_id", packageId ?? orderId }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var resp = await client.GetAsync($"{apiPath}?{qs}");
                var content = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode) return null;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    return new ShippingLabelResult
                    {
                        Platform = PlatformType.TikTok,
                        OrderId = orderId,
                        DocumentUrl = data.TryGetProperty("label_url", out var url) ? url.GetString() ?? "" : "",
                        TrackingNumber = data.TryGetProperty("tracking_number", out var tn) ? tn.GetString() ?? "" : "",
                        Carrier = data.TryGetProperty("shipping_provider_name", out var spn) ? spn.GetString() ?? "" : "",
                        ContentType = "application/pdf",
                        Status = "READY"
                    };
                }
                return null;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ TikTok: Error getting shipping label"); return null; }
        }

        public async Task<bool> ShipOrderAsync(string accessToken, string? shopId, ShipOrderRequest request)
        {
            _logger.LogInformation("🎵 TikTok: Shipping order {OrderId}", request.OrderId);
            var client = _httpClientFactory.CreateClient("TikTok");
            var apiPath = "/fulfillment/202309/packages";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            var body = new { order_id = request.OrderId };
            var bodyJson = JsonSerializer.Serialize(body);

            var qp = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" }, { "access_token", accessToken }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp, bodyJson);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, $"{apiPath}?{qs}")
                { Content = new StringContent(bodyJson, Encoding.UTF8, "application/json") };
                var resp = await client.SendAsync(req);
                return resp.IsSuccessStatusCode;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ TikTok: Error shipping order"); return false; }
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(string accessToken, string? shopId)
        {
            _logger.LogInformation("🎵 TikTok: Getting shipping providers");
            var client = _httpClientFactory.CreateClient("TikTok");
            var apiPath = "/logistics/202309/shipping_providers";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            var qp = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" }, { "access_token", accessToken }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            var providers = new List<ShippingProvider>();
            try
            {
                var resp = await client.GetAsync($"{apiPath}?{qs}");
                var content = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode) return providers;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data) &&
                    data.TryGetProperty("shipping_providers", out var sps))
                {
                    foreach (var sp in sps.EnumerateArray())
                    {
                        providers.Add(new ShippingProvider
                        {
                            ProviderId = sp.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "",
                            Name = sp.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
                            Platform = PlatformType.TikTok,
                            Enabled = true
                        });
                    }
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ TikTok: Error fetching shipping providers"); }
            return providers;
        }

        public async Task<TrackingInfo?> GetTrackingInfoAsync(string accessToken, string? shopId, string orderId)
        {
            // TikTok provides tracking via order detail - packages field
            var orderDetail = await GetOrderDetailAsync(accessToken, shopId, orderId);
            if (orderDetail?.Shipping == null) return null;

            return new TrackingInfo
            {
                Platform = PlatformType.TikTok,
                OrderId = orderId,
                TrackingNumber = orderDetail.Shipping.TrackingNumber,
                Carrier = orderDetail.Shipping.Carrier,
                Status = orderDetail.Status.ToString()
            };
        }
    }
}
