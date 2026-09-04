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

        private static HttpRequestMessage CreateAuthenticatedRequest(
            HttpMethod method,
            string requestUri,
            string accessToken,
            string? bodyJson = null)
        {
            var request = new HttpRequestMessage(method, requestUri);
            request.Headers.TryAddWithoutValidation("x-tts-access-token", accessToken);
            request.Headers.TryAddWithoutValidation("Accept", "application/json");

            if (bodyJson != null)
                request.Content = new StringContent(bodyJson, Encoding.UTF8, "application/json");

            return request;
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
                { "version", "202309" }
            };

            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, queryParams, bodyJson);
            queryParams["sign"] = sign;

            var queryString = string.Join("&", queryParams.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                using var request = CreateAuthenticatedRequest(
                    HttpMethod.Post, $"{apiPath}?{queryString}", accessToken, bodyJson);

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
                { "ids", orderId }
            };

            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, queryParams);
            queryParams["sign"] = sign;

            var queryString = string.Join("&", queryParams.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                using var request = CreateAuthenticatedRequest(
                    HttpMethod.Get, $"{apiPath}?{queryString}", accessToken);
                var response = await client.SendAsync(request);
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
            return MapTikTokOrderDetail(order);
        }

        private static UnifiedOrder MapTikTokOrderDetail(JsonElement order)
        {
            var status = GetString(order, "status");

            var unified = new UnifiedOrder
            {
                OrderId = GetString(order, "id"),
                Platform = PlatformType.TikTok,
                Status = OrderStatusMapper.FromTikTok(status),
                OriginalStatus = status,
                BuyerRemarks = GetString(order, "buyer_message"),
                CreatedAt = GetUnixDateTime(order, "create_time") ?? DateTime.MinValue,
                UpdatedAt = GetUnixDateTime(order, "update_time"),
                Currency = order.TryGetProperty("payment", out var pay2) &&
                           !string.IsNullOrWhiteSpace(GetString(pay2, "currency"))
                    ? GetString(pay2, "currency") : "THB"
            };

            if (order.TryGetProperty("payment", out var pay) &&
                pay.ValueKind == JsonValueKind.Object)
            {
                unified.TotalAmount = GetDecimal(pay, "total_amount");
            }

            unified.CancellationDeadline =
                GetUnixDateTime(order, "cancel_order_sla_time") ??
                GetUnixDateTime(order, "cancel_order_sn_deadline");

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
                    var originalPrice = GetDecimal(item, "original_price");
                    var salePrice = GetDecimal(item, "sale_price");
                    var quantity = GetInt32(item, "quantity", 1);
                    unified.Items.Add(new OrderItem
                    {
                        ItemId = GetString(item, "product_id", GetString(item, "id")),
                        Name = GetString(item, "product_name"),
                        Sku = GetString(item, "seller_sku", GetString(item, "sku_id")),
                        Quantity = quantity,
                        UnitPrice = salePrice,
                        TotalPrice = salePrice * quantity,
                        Discount = Math.Max(0, originalPrice - salePrice) * quantity,
                        ImageUrl = GetTikTokItemImage(item),
                        Variation = GetString(item, "sku_name")
                    });
                }
            }

            // A TikTok order can be split into multiple packages. Line items
            // carry the package_id/tracking number while the packages array
            // may only contain the package id, so merge both sources.
            var packageMap = new Dictionary<string, ShippingPackage>(StringComparer.OrdinalIgnoreCase);
            var packageOrder = new List<string>();

            ShippingPackage GetOrCreatePackage(string packageId, string trackingNumber, string carrier)
            {
                var key = packageId.Length > 0
                    ? $"id:{packageId}"
                    : trackingNumber.Length > 0
                        ? $"tracking:{trackingNumber}"
                        : "default";

                if (!packageMap.TryGetValue(key, out var package))
                {
                    package = new ShippingPackage { PackageId = packageId };
                    packageMap[key] = package;
                    packageOrder.Add(key);
                }

                if (package.PackageId.Length == 0) package.PackageId = packageId;
                if (package.TrackingNumber.Length == 0) package.TrackingNumber = trackingNumber;
                if (package.Carrier.Length == 0) package.Carrier = carrier;
                return package;
            }

            var shippingMethod = GetString(order, "delivery_option_name",
                GetString(order, "shipping_type"));

            if (items.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in items.EnumerateArray())
                {
                    var packageId = GetString(item, "package_id");
                    var trackingNumber = GetString(item, "tracking_number");
                    var carrier = GetString(item, "shipping_provider_name");
                    if (packageId.Length == 0 && trackingNumber.Length == 0 && carrier.Length == 0)
                        continue;

                    var package = GetOrCreatePackage(packageId, trackingNumber, carrier);
                    var itemId = GetString(item, "id", GetString(item, "product_id"));
                    if (itemId.Length > 0 && !package.ItemIds.Contains(itemId))
                        package.ItemIds.Add(itemId);
                    if (package.Status.Length == 0)
                        package.Status = GetString(item, "package_status", GetString(item, "display_status"));
                }
            }

            if (order.TryGetProperty("packages", out var packageArray) &&
                packageArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var pkg in packageArray.EnumerateArray())
                {
                    var packageId = GetString(pkg, "id", GetString(pkg, "package_id"));
                    var trackingNumber = GetString(pkg, "tracking_number");
                    var carrier = GetString(pkg, "shipping_provider_name",
                        GetString(pkg, "shipping_provider"));
                    if (packageId.Length == 0 && trackingNumber.Length == 0 && carrier.Length == 0)
                        continue;

                    // Some responses omit package_id on line_items and only
                    // return the id in packages[]. Reuse the sole package
                    // already built from the line item instead of duplicating it.
                    if (packageId.Length > 0 && packageMap.Count == 1)
                    {
                        var existing = packageMap.Values.First();
                        if (existing.PackageId.Length == 0)
                        {
                            existing.PackageId = packageId;
                            if (existing.TrackingNumber.Length == 0) existing.TrackingNumber = trackingNumber;
                            if (existing.Carrier.Length == 0) existing.Carrier = carrier;
                            if (existing.Status.Length == 0)
                                existing.Status = GetString(pkg, "package_status", GetString(pkg, "status"));
                            continue;
                        }
                    }

                    var package = GetOrCreatePackage(packageId, trackingNumber, carrier);
                    if (package.Status.Length == 0)
                        package.Status = GetString(pkg, "package_status", GetString(pkg, "status"));
                }
            }

            var orderTrackingNumber = GetString(order, "tracking_number");
            var orderCarrier = GetString(order, "shipping_provider");
            if (packageMap.Count == 0 && (orderTrackingNumber.Length > 0 || orderCarrier.Length > 0))
                GetOrCreatePackage("", orderTrackingNumber, orderCarrier);
            else if (packageMap.Count == 1)
            {
                var onlyPackage = packageMap.Values.First();
                if (onlyPackage.TrackingNumber.Length == 0) onlyPackage.TrackingNumber = orderTrackingNumber;
                if (onlyPackage.Carrier.Length == 0) onlyPackage.Carrier = orderCarrier;
            }

            unified.Packages = packageOrder
                .Select(key => packageMap[key])
                .ToList();

            foreach (var package in unified.Packages)
            {
                if (package.ShippingMethod.Length == 0)
                    package.ShippingMethod = shippingMethod;
            }

            var firstPackage = unified.Packages.FirstOrDefault();
            unified.Shipping = new ShippingInfo
            {
                TrackingNumber = firstPackage?.TrackingNumber ?? orderTrackingNumber,
                Carrier = firstPackage?.Carrier ?? orderCarrier,
                PackageNumber = firstPackage?.PackageId ?? "",
                ShippingMethod = shippingMethod,
                ShippingFee = pay.ValueKind == JsonValueKind.Object
                    ? GetDecimal(pay, "shipping_fee")
                    : 0
            };

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

                var subDistrict = "";
                var district = GetString(addr, "city");
                var province = GetString(addr, "state");
                if (addr.TryGetProperty("district_info", out var districtInfo) &&
                    districtInfo.ValueKind == JsonValueKind.Array)
                {
                    foreach (var level in districtInfo.EnumerateArray())
                    {
                        var levelCode = GetString(level, "address_level");
                        var levelName = GetString(level, "address_name");
                        if (levelCode == "L1") province = levelName;
                        else if (levelCode == "L2") district = levelName;
                        else if (levelCode == "L3") subDistrict = levelName;
                    }
                }

                var postalCode = GetString(addr, "postal_code");
                var country = GetString(addr, "region_code", GetString(addr, "country_code", "TH"));

                var allParts = new List<string> { line1, line2, line3, line4, subDistrict, district, province, postalCode }
                    .Where(s => !string.IsNullOrWhiteSpace(s));
                var fullAddress = GetString(addr, "full_address",
                    GetString(addr, "address_detail", string.Join(" ", allParts)));
                var recipientName = GetString(addr, "name", GetString(addr, "full_name"));
                unified.BuyerName = recipientName;

                unified.Shipping.RecipientAddress = new RecipientAddress
                {
                    Name = recipientName,
                    Phone = GetString(addr, "phone_number"),
                    AddressLine1 = line1,
                    AddressLine2 = addressLine2Combined,
                    SubDistrict = subDistrict,
                    District = district,
                    Province = province,
                    PostalCode = postalCode,
                    Country = country,
                    FullAddress = fullAddress
                };
            }
        }

        private static string GetTikTokItemImage(JsonElement item)
        {
            var skuImage = GetString(item, "sku_image");
            if (!string.IsNullOrWhiteSpace(skuImage))
                return skuImage;

            return item.TryGetProperty("product_image", out var productImage) &&
                   productImage.ValueKind == JsonValueKind.Object
                ? GetString(productImage, "url")
                : "";
        }

        private static string GetString(JsonElement element, string propertyName, string fallback = "")
        {
            if (element.ValueKind != JsonValueKind.Object ||
                !element.TryGetProperty(propertyName, out var value) ||
                value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                return fallback;

            return value.ValueKind == JsonValueKind.String
                ? value.GetString() ?? fallback
                : value.ToString();
        }

        private static decimal GetDecimal(JsonElement element, string propertyName)
        {
            return decimal.TryParse(
                GetString(element, propertyName),
                System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture,
                out var value)
                ? value
                : 0;
        }

        private static int GetInt32(JsonElement element, string propertyName, int fallback = 0)
        {
            return int.TryParse(GetString(element, propertyName), out var value)
                ? value
                : fallback;
        }

        private static DateTime? GetUnixDateTime(JsonElement element, string propertyName)
        {
            return long.TryParse(GetString(element, propertyName), out var timestamp)
                ? DateTimeHelper.FromUnixTimestamp(timestamp)
                : null;
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
                { "shop_cipher", shopId ?? "" }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp, bodyJson);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            var result = new PaginatedResult<ProductItem> { Page = filter.Page, PageSize = filter.PageSize };
            try
            {
                using var req = CreateAuthenticatedRequest(
                    HttpMethod.Post, $"{apiPath}?{qs}", accessToken, bodyJson);
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
                { "shop_cipher", shopId ?? "" }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp, bodyJson);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                using var req = CreateAuthenticatedRequest(
                    HttpMethod.Post, $"{apiPath}?{qs}", accessToken, bodyJson);
                var resp = await client.SendAsync(req);
                return resp.IsSuccessStatusCode;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ TikTok: Error updating stock"); return false; }
        }

        // ── Shipping ──────────────────────────────────────

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(string accessToken, string? shopId, string orderId, string? packageId, string? trackingNumber, string documentType)
        {
            _logger.LogInformation("🎵 TikTok: Getting shipping label for package {PackageId}", packageId);
            var client = _httpClientFactory.CreateClient("TikTok");
            var requestedPackageId = string.IsNullOrWhiteSpace(packageId) ? orderId : packageId;
            var apiPath = $"/fulfillment/202309/packages/{Uri.EscapeDataString(requestedPackageId)}/shipping_documents";
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();

            var qp = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp.ToString() },
                { "shop_cipher", shopId ?? "" },
                { "version", "202309" },
                { "document_type", "SHIPPING_LABEL" },
                { "document_size", "A6" },
                { "shipping_period", "DEFAULT" },
                { "document_format", "PDF" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                using var req = CreateAuthenticatedRequest(
                    HttpMethod.Get, $"{apiPath}?{qs}", accessToken);
                var resp = await client.SendAsync(req);
                var content = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode) return null;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("code", out var code)
                    && code.ValueKind == JsonValueKind.Number
                    && code.GetInt32() != 0)
                    return null;
                if (!json.RootElement.TryGetProperty("data", out var data)
                    || data.ValueKind != JsonValueKind.Object)
                    return null;

                var documentUrl = data.TryGetProperty("doc_url", out var docUrl)
                    ? docUrl.GetString()
                    : data.TryGetProperty("label_url", out var labelUrl)
                        ? labelUrl.GetString()
                        : null;
                if (string.IsNullOrWhiteSpace(documentUrl))
                    return null;

                var documentBytes = await DownloadDocumentAsync(client, documentUrl);
                if (documentBytes == null || documentBytes.Length == 0)
                    return null;

                var apiTrackingNumber = data.TryGetProperty("tracking_number", out var tn)
                    ? tn.GetString()
                    : null;
                return new ShippingLabelResult
                {
                    Platform = PlatformType.TikTok,
                    OrderId = orderId,
                    PackageId = packageId,
                    DocumentUrl = documentUrl,
                    DocumentBase64 = Convert.ToBase64String(documentBytes),
                    TrackingNumber = string.IsNullOrWhiteSpace(apiTrackingNumber)
                        ? trackingNumber ?? string.Empty
                        : apiTrackingNumber,
                    ContentType = IsPdf(documentBytes) ? "application/pdf" : "application/octet-stream",
                    DocumentType = documentType,
                    Status = "READY"
                };
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ TikTok: Error getting shipping label"); return null; }
        }

        private static async Task<byte[]?> DownloadDocumentAsync(HttpClient client, string documentUrl)
        {
            if (!Uri.TryCreate(documentUrl, UriKind.Absolute, out var uri))
                return null;

            using var response = await client.GetAsync(uri);
            if (!response.IsSuccessStatusCode)
                return null;
            return await response.Content.ReadAsByteArrayAsync();
        }

        private static bool IsPdf(byte[] bytes) =>
            bytes.Length >= 4 && bytes[0] == (byte)'%' && bytes[1] == (byte)'P' &&
            bytes[2] == (byte)'D' && bytes[3] == (byte)'F';

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
                { "shop_cipher", shopId ?? "" }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp, bodyJson);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                using var req = CreateAuthenticatedRequest(
                    HttpMethod.Post, $"{apiPath}?{qs}", accessToken, bodyJson);
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
                { "shop_cipher", shopId ?? "" }, { "version", "202309" }
            };
            var sign = SignatureHelper.GenerateTikTokSignature(_appSecret, apiPath, qp);
            qp["sign"] = sign;
            var qs = string.Join("&", qp.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            var providers = new List<ShippingProvider>();
            try
            {
                using var req = CreateAuthenticatedRequest(
                    HttpMethod.Get, $"{apiPath}?{qs}", accessToken);
                var resp = await client.SendAsync(req);
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

        public async Task<TrackingInfo?> GetTrackingInfoAsync(
            string accessToken,
            string? shopId,
            string orderId,
            IReadOnlyCollection<string>? packageNumbers = null)
        {
            // TikTok provides tracking via order detail - packages field
            var orderDetail = await GetOrderDetailAsync(accessToken, shopId, orderId);
            if (orderDetail?.Shipping == null) return null;

            var primary = orderDetail.Packages.FirstOrDefault();

            return new TrackingInfo
            {
                Platform = PlatformType.TikTok,
                OrderId = orderId,
                TrackingNumber = primary?.TrackingNumber ?? orderDetail.Shipping.TrackingNumber,
                Carrier = primary?.Carrier ?? orderDetail.Shipping.Carrier,
                Status = primary?.Status ?? orderDetail.Status.ToString(),
                Packages = orderDetail.Packages
                    .Select(package => new ShippingPackage
                    {
                        PackageId = package.PackageId,
                        TrackingNumber = package.TrackingNumber,
                        Carrier = package.Carrier,
                        Status = package.Status,
                        ShippingMethod = package.ShippingMethod,
                        ItemIds = new List<string>(package.ItemIds),
                        Events = new List<TrackingEvent>(package.Events)
                    })
                    .ToList()
            };
        }
    }
}
