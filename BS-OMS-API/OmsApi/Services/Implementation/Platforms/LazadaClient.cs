using System.Text;
using System.Text.Json;
using System.Globalization;
using OmsApi.Helpers;
using OmsApi.Models.Common;
using OmsApi.Models.Inventory;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation.Platforms
{
    /// <summary>
    /// Lazada Open Platform API client
    /// API Docs: https://open.lazada.com/apps/doc/getting_started
    /// </summary>
    public class LazadaClient : IPlatformClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<LazadaClient> _logger;
        private readonly string _appKey;
        private readonly string _appSecret;

        public PlatformType Platform => PlatformType.Lazada;

        public LazadaClient(IHttpClientFactory httpClientFactory, ILogger<LazadaClient> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _appKey = Environment.GetEnvironmentVariable("LAZADA_APP_KEY") ?? "";
            _appSecret = Environment.GetEnvironmentVariable("LAZADA_APP_SECRET") ?? "";
        }

        public async Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(string accessToken, string? shopId, OrderFilter filter)
        {
            _logger.LogInformation("🏪 Lazada: Fetching orders");

            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/orders/get";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", timestamp },
                { "access_token", accessToken },
                { "sign_method", "sha256" },
                { "created_after", (filter.DateFrom ?? DateTime.UtcNow.AddDays(-15)).ToString("yyyy-MM-ddTHH:mm:ss+07:00") },
                { "limit", Math.Min(filter.PageSize, 100).ToString() },
                { "offset", ((filter.Page - 1) * filter.PageSize).ToString() },
                { "sort_by", "created_at" },
                { "sort_direction", "DESC" }
            };

            if (filter.Status.HasValue)
            {
                parameters["status"] = MapStatusToLazada(filter.Status.Value);
            }

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;

            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var response = await client.GetAsync(BuildRequestUri(apiPath, queryString));
                var content = await response.Content.ReadAsStringAsync();

                _logger.LogDebug("Lazada response: {Content}", content);

                var result = new PaginatedResult<UnifiedOrder>
                {
                    Page = filter.Page,
                    PageSize = filter.PageSize
                };

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ Lazada API error: {StatusCode} - {Content}", response.StatusCode, content);
                    return result;
                }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    if (data.TryGetProperty("count", out var count))
                    {
                        result.TotalCount = count.GetInt32();
                    }
                    if (data.TryGetProperty("orders", out var orders))
                    {
                        foreach (var order in orders.EnumerateArray())
                        {
                            result.Items.Add(MapLazadaOrder(order));
                        }
                    }
                }

                _logger.LogInformation("✅ Lazada: Retrieved {Count} orders", result.Items.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Lazada: Error fetching orders");
                return new PaginatedResult<UnifiedOrder>();
            }
        }

        public async Task<UnifiedOrder?> GetOrderDetailAsync(string accessToken, string? shopId, string orderId)
        {
            _logger.LogInformation("🏪 Lazada: Fetching order detail {OrderId}", orderId);

            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/order/get";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", timestamp },
                { "access_token", accessToken },
                { "sign_method", "sha256" },
                { "order_id", orderId }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;

            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var response = await client.GetAsync(BuildRequestUri(apiPath, queryString));
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("❌ Lazada order detail error: {Content}", content);
                    return null;
                }

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    var unified = MapLazadaOrderDetail(data);

                    // Fetch order items separately
                    var items = await GetOrderItemsAsync(accessToken, orderId, client);
                    unified.Items = items;

                    return unified;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Lazada: Error fetching order detail");
                return null;
            }
        }

        private async Task<List<OrderItem>> GetOrderItemsAsync(string accessToken, string orderId, HttpClient client)
        {
            var apiPath = "/order/items/get";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", timestamp },
                { "access_token", accessToken },
                { "sign_method", "sha256" },
                { "order_id", orderId }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;

            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            var items = new List<OrderItem>();

            try
            {
                var response = await client.GetAsync(BuildRequestUri(apiPath, queryString));
                var content = await response.Content.ReadAsStringAsync();

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    foreach (var item in data.EnumerateArray())
                    {
                        items.Add(new OrderItem
                        {
                            ItemId = item.TryGetProperty("order_item_id", out var iid) ? iid.GetInt64().ToString() : "",
                            Name = item.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "",
                            Sku = item.TryGetProperty("sku", out var sku) ? sku.GetString() ?? "" : "",
                            Quantity = 1, // Lazada treats each item individually
                            UnitPrice = item.TryGetProperty("paid_price", out var price) ? price.GetDecimal() : 0,
                            TotalPrice = item.TryGetProperty("paid_price", out var tp) ? tp.GetDecimal() : 0,
                            ImageUrl = item.TryGetProperty("product_main_image", out var img) ? img.GetString() ?? "" : "",
                            Variation = item.TryGetProperty("variation", out var v) ? v.GetString() ?? "" : ""
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Lazada: Error fetching order items");
            }

            return items;
        }

        private static UnifiedOrder MapLazadaOrder(JsonElement order)
        {
            var statuses = "";
            if (order.TryGetProperty("statuses", out var st))
            {
                statuses = st.EnumerateArray().FirstOrDefault().GetString() ?? "";
            }

            var unified = new UnifiedOrder
            {
                OrderId = order.TryGetProperty("order_id", out var oid) ? oid.GetInt64().ToString() : "",
                Platform = PlatformType.Lazada,
                Status = OrderStatusMapper.FromLazada(statuses),
                OriginalStatus = statuses,
                TotalAmount = order.TryGetProperty("price", out var price) ? price.GetDecimal() : 0,
                CreatedAt = order.TryGetProperty("created_at", out var ca)
                    ? DateTime.TryParse(ca.GetString(), out var dt) ? dt : DateTime.MinValue
                    : DateTime.MinValue,
                BuyerRemarks = order.TryGetProperty("remarks", out var rem) ? rem.GetString() ?? "" : ""
            };

            MapLazadaPackages(order, unified);
            MapLazadaAddress(order, unified);
            return unified;
        }

        private static void MapLazadaPackages(JsonElement order, UnifiedOrder unified)
        {
            var packageMap = new Dictionary<string, ShippingPackage>(StringComparer.OrdinalIgnoreCase);
            var packageOrder = new List<string>();

            ShippingPackage GetOrCreate(string packageId, string trackingNumber, string carrier)
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

            void MergePackage(JsonElement source, string itemId = "", bool allowGenericId = true)
            {
                var packageId = allowGenericId
                    ? GetLazadaString(source, "package_id", "package_number", "shipment_id", "id")
                    : GetLazadaString(source, "package_id", "package_number", "shipment_id");
                var trackingNumber = GetLazadaString(source, "tracking_number", "tracking_code", "tracking_no");
                var carrier = GetLazadaString(source, "shipping_provider", "shipment_provider", "shipping_carrier", "provider_name");
                var status = GetLazadaString(source, "package_status", "logistics_status", "status");
                var shippingMethod = GetLazadaString(source, "shipping_type", "shipping_method");

                if (packageId.Length == 0 && trackingNumber.Length == 0 && carrier.Length == 0)
                    return;

                if (packageMap.Count == 1)
                {
                    var existing = packageMap.Values.First();
                    if (packageId.Length > 0 && existing.PackageId.Length == 0)
                    {
                        existing.PackageId = packageId;
                        if (existing.TrackingNumber.Length == 0) existing.TrackingNumber = trackingNumber;
                        if (existing.Carrier.Length == 0) existing.Carrier = carrier;
                        if (existing.Status.Length == 0) existing.Status = status;
                        if (existing.ShippingMethod.Length == 0) existing.ShippingMethod = shippingMethod;
                        if (itemId.Length > 0 && !existing.ItemIds.Contains(itemId)) existing.ItemIds.Add(itemId);
                        return;
                    }
                    if (packageId.Length == 0 && trackingNumber.Length > 0 &&
                        existing.TrackingNumber.Length == 0)
                    {
                        existing.TrackingNumber = trackingNumber;
                        if (existing.Carrier.Length == 0) existing.Carrier = carrier;
                        if (existing.Status.Length == 0) existing.Status = status;
                        if (existing.ShippingMethod.Length == 0) existing.ShippingMethod = shippingMethod;
                        if (itemId.Length > 0 && !existing.ItemIds.Contains(itemId)) existing.ItemIds.Add(itemId);
                        return;
                    }
                }

                var package = GetOrCreate(packageId, trackingNumber, carrier);
                if (package.Status.Length == 0) package.Status = status;
                if (package.ShippingMethod.Length == 0) package.ShippingMethod = shippingMethod;
                if (itemId.Length > 0 && !package.ItemIds.Contains(itemId)) package.ItemIds.Add(itemId);
            }

            foreach (var propertyName in new[] { "packages", "package_list" })
            {
                if (!order.TryGetProperty(propertyName, out var packageArray) ||
                    packageArray.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var package in packageArray.EnumerateArray())
                    MergePackage(package);
            }

            foreach (var propertyName in new[] { "order_items", "items" })
            {
                if (!order.TryGetProperty(propertyName, out var itemArray) ||
                    itemArray.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var item in itemArray.EnumerateArray())
                {
                    var itemId = GetLazadaString(item, "order_item_id", "item_id", "id");
                    MergePackage(item, itemId, allowGenericId: false);
                }
            }

            var orderTrackingNumber = GetLazadaString(order, "tracking_number", "tracking_code", "tracking_no");
            var orderCarrier = GetLazadaString(order, "shipping_provider", "shipment_provider", "shipping_carrier");
            if (packageMap.Count == 0 && (orderTrackingNumber.Length > 0 || orderCarrier.Length > 0))
                GetOrCreate("", orderTrackingNumber, orderCarrier);
            else if (packageMap.Count == 1)
            {
                var onlyPackage = packageMap.Values.First();
                if (onlyPackage.TrackingNumber.Length == 0) onlyPackage.TrackingNumber = orderTrackingNumber;
                if (onlyPackage.Carrier.Length == 0) onlyPackage.Carrier = orderCarrier;
            }

            unified.Packages = packageOrder.Select(key => packageMap[key]).ToList();
            if (unified.Packages.Count == 0 &&
                string.IsNullOrWhiteSpace(orderTrackingNumber) &&
                string.IsNullOrWhiteSpace(orderCarrier))
                return;

            var firstPackage = unified.Packages.FirstOrDefault();
            unified.Shipping ??= new ShippingInfo();
            unified.Shipping.TrackingNumber = firstPackage?.TrackingNumber ?? orderTrackingNumber;
            unified.Shipping.Carrier = firstPackage?.Carrier ?? orderCarrier;
            unified.Shipping.PackageNumber = firstPackage?.PackageId ?? "";
            unified.Shipping.ShippingMethod = firstPackage?.ShippingMethod ?? "";
        }

        private static string GetLazadaString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (!TryGetLazadaProperty(element, propertyName, out var value) ||
                    value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                    continue;

                var text = value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
                if (!string.IsNullOrWhiteSpace(text)) return text;
            }
            return "";
        }

        private static decimal GetLazadaDecimal(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (!TryGetLazadaProperty(element, propertyName, out var value) ||
                    value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                    continue;

                if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number))
                    return number;

                if (decimal.TryParse(value.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out number))
                    return number;
            }

            return 0;
        }

        private static bool TryGetLazadaProperty(
            JsonElement element,
            string propertyName,
            out JsonElement value)
        {
            if (element.TryGetProperty(propertyName, out value))
                return true;

            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        value = property.Value;
                        return true;
                    }
                }
            }

            value = default;
            return false;
        }

        private static DateTime GetLazadaDateTime(JsonElement element, params string[] propertyNames)
        {
            var value = GetLazadaString(element, propertyNames);
            if (DateTime.TryParse(value, out var dateTime)) return dateTime;
            if (long.TryParse(value, out var timestamp))
            {
                try
                {
                    return value.Length >= 13
                        ? DateTimeOffset.FromUnixTimeMilliseconds(timestamp).UtcDateTime
                        : DateTimeOffset.FromUnixTimeSeconds(timestamp).UtcDateTime;
                }
                catch (ArgumentOutOfRangeException)
                {
                    // Keep the response usable when a provider sends an invalid timestamp.
                }
            }
            return DateTime.MinValue;
        }

        private static UnifiedOrder MapLazadaOrderDetail(JsonElement order)
        {
            var statuses = "";
            if (order.TryGetProperty("statuses", out var st))
            {
                statuses = st.EnumerateArray().FirstOrDefault().GetString() ?? "";
            }

            var unified = new UnifiedOrder
            {
                OrderId = order.TryGetProperty("order_id", out var oid) ? oid.GetInt64().ToString() : "",
                Platform = PlatformType.Lazada,
                Status = OrderStatusMapper.FromLazada(statuses),
                OriginalStatus = statuses,
                BuyerName = order.TryGetProperty("customer_first_name", out var fn) ? fn.GetString() ?? "" : "",
                BuyerRemarks = order.TryGetProperty("remarks", out var rem) ? rem.GetString() ?? "" : "",
                TotalAmount = order.TryGetProperty("price", out var price) ? price.GetDecimal() : 0,
                CreatedAt = order.TryGetProperty("created_at", out var ca)
                    ? DateTime.TryParse(ca.GetString(), out var dt) ? dt : DateTime.MinValue
                    : DateTime.MinValue,
                UpdatedAt = order.TryGetProperty("updated_at", out var ua)
                    ? DateTime.TryParse(ua.GetString(), out var udt) ? udt : null
                    : null
            };

            // Tax invoice
            if (order.TryGetProperty("tax_code", out var taxCode) &&
                !string.IsNullOrEmpty(taxCode.GetString()))
            {
                unified.TaxInvoiceRequested = true;
                unified.TaxInvoice = new TaxInvoiceInfo
                {
                    TaxId = taxCode.GetString() ?? ""
                };
            }

            // Shipping deadline (cancellation)
            if (order.TryGetProperty("shipping_deadline", out var deadline))
            {
                if (DateTime.TryParse(deadline.GetString(), out var dlDt))
                {
                    unified.CancellationDeadline = dlDt;
                }
            }

            MapLazadaPackages(order, unified);
            MapLazadaAddress(order, unified);
            return unified;
        }

        private static void MapLazadaAddress(JsonElement order, UnifiedOrder unified)
        {
            if (order.TryGetProperty("address_shipping", out var addr) && addr.ValueKind != JsonValueKind.Null)
            {
                var firstName = addr.TryGetProperty("first_name", out var fn) ? fn.GetString() ?? "" : "";
                var lastName = addr.TryGetProperty("last_name", out var ln) ? ln.GetString() ?? "" : "";
                var phone = addr.TryGetProperty("phone", out var ph) ? ph.GetString() ?? "" : "";

                var address1 = addr.TryGetProperty("address1", out var a1) ? a1.GetString() ?? "" : "";
                var address2 = addr.TryGetProperty("address2", out var a2) ? a2.GetString() ?? "" : "";
                var address3 = addr.TryGetProperty("address3", out var a3) ? a3.GetString() ?? "" : ""; // Province
                var address4 = addr.TryGetProperty("address4", out var a4) ? a4.GetString() ?? "" : ""; // City/District
                var address5 = addr.TryGetProperty("address5", out var a5) ? a5.GetString() ?? "" : ""; // Sub-district
                var postCode = addr.TryGetProperty("post_code", out var pc) ? pc.GetString() ?? "" : "";
                var country = addr.TryGetProperty("country", out var co) ? co.GetString() ?? "TH" : "TH";

                if (unified.Shipping == null)
                {
                    unified.Shipping = new ShippingInfo();
                }

                // Construct full address: address1 address2 address5 address4 address3 postCode
                var parts = new List<string> { address1, address2, address5, address4, address3, postCode }
                    .Where(s => !string.IsNullOrWhiteSpace(s));
                var fullAddress = string.Join(" ", parts);

                unified.Shipping.RecipientAddress = new RecipientAddress
                {
                    Name = $"{firstName} {lastName}".Trim(),
                    Phone = phone,
                    AddressLine1 = address1,
                    AddressLine2 = address2,
                    SubDistrict = address5,
                    District = address4,
                    Province = address3,
                    PostalCode = postCode,
                    Country = country,
                    FullAddress = fullAddress
                };
            }
        }

        private static string MapStatusToLazada(OrderStatus status) => status switch
        {
            OrderStatus.Unpaid => "unpaid",
            OrderStatus.Pending => "pending",
            OrderStatus.ReadyToShip => "ready_to_ship",
            OrderStatus.Shipped => "shipped",
            OrderStatus.Delivered => "delivered",
            OrderStatus.Cancelled => "canceled",
            OrderStatus.ReturnRefund => "returned",
            _ => ""
        };

        // ── Inventory ─────────────────────────────────────

        public async Task<PaginatedResult<ProductItem>> GetProductsAsync(string accessToken, string? shopId, ProductFilter filter)
        {
            _logger.LogInformation("🏪 Lazada: Fetching products");
            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/products/get";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" },
                { "filter", filter.ItemStatus ?? "all" },
                { "limit", Math.Min(filter.PageSize, 100).ToString() },
                { "offset", ((filter.Page - 1) * filter.PageSize).ToString() }
            };
            if (!string.IsNullOrEmpty(filter.Keyword)) parameters["search"] = filter.Keyword;

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            var result = new PaginatedResult<ProductItem> { Page = filter.Page, PageSize = filter.PageSize };
            try
            {
                var resp = await client.GetAsync(BuildRequestUri(apiPath, qs));
                var content = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode) return result;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    if (data.TryGetProperty("total_products", out var total)) result.TotalCount = total.GetInt32();
                    if (data.TryGetProperty("products", out var products))
                    {
                        foreach (var p in products.EnumerateArray())
                        {
                            var item = new ProductItem
                            {
                                Platform = PlatformType.Lazada,
                                ItemId = p.TryGetProperty("item_id", out var iid) ? iid.GetInt64().ToString() : "",
                                Status = p.TryGetProperty("status", out var st) ? st.GetString() ?? "" : "",
                                CreatedAt = p.TryGetProperty("created_time", out var ct)
                                    ? DateTime.TryParse(ct.GetString(), out var ctd) ? ctd : DateTime.MinValue : DateTime.MinValue
                            };

                            if (p.TryGetProperty("skus", out var skus))
                            {
                                foreach (var sku in skus.EnumerateArray())
                                {
                                    var name = sku.TryGetProperty("SkuId", out var sid) ? sid.GetInt64().ToString() : "";
                                    item.Variations.Add(new VariationStock
                                    {
                                        VariationId = name,
                                        Sku = sku.TryGetProperty("SellerSku", out var ss) ? ss.GetString() ?? "" : "",
                                        Price = sku.TryGetProperty("price", out var pr) ? pr.GetDecimal() : 0,
                                        CurrentStock = sku.TryGetProperty("quantity", out var qty) ? qty.GetInt32() : 0
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

                            if (p.TryGetProperty("attributes", out var attrs))
                            {
                                item.Name = attrs.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                            }
                            if (p.TryGetProperty("images", out var imgs) && imgs.GetArrayLength() > 0)
                                item.ImageUrl = imgs[0].GetString() ?? "";

                            result.Items.Add(item);
                        }
                    }
                }
                _logger.LogInformation("✅ Lazada: Retrieved {Count} products", result.Items.Count);
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ Lazada: Error fetching products"); }
            return result;
        }

        public async Task<ProductItem?> GetProductDetailAsync(string accessToken, string? shopId, string itemId)
        {
            var filter = new ProductFilter { AccessToken = accessToken, ShopId = shopId, Page = 1, PageSize = 1 };
            var result = await GetProductsAsync(accessToken, shopId, filter);
            return result.Items.FirstOrDefault(p => p.ItemId == itemId);
        }

        public async Task<bool> UpdateStockAsync(string accessToken, string? shopId, string itemId, string? variationId, int newStock)
        {
            _logger.LogInformation("🏪 Lazada: Updating stock for item {ItemId}", itemId);
            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/product/stock/sellable/update";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" },
                { "payload", $"<Request><Product><Skus><Sku><ItemId>{itemId}</ItemId><SkuId>{variationId ?? itemId}</SkuId><SellableQuantity>{newStock}</SellableQuantity></Sku></Skus></Product></Request>" }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var resp = await client.PostAsync(BuildRequestUri(apiPath, qs), null);
                return resp.IsSuccessStatusCode;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ Lazada: Error updating stock"); return false; }
        }

        // ── Shipping ──────────────────────────────────────

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(string accessToken, string? shopId, string orderId, string? packageId, string? trackingNumber, string documentType)
        {
            _logger.LogInformation("🏪 Lazada: Getting shipping label for order {OrderId}", orderId);
            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/order/package/document/get";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
            var requestedPackageId = string.IsNullOrWhiteSpace(packageId) ? orderId : packageId;
            var documentRequest = JsonSerializer.Serialize(new
            {
                doc_type = "PDF",
                packages = new[] { new { package_id = requestedPackageId } },
                print_item_list = true
            });

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" },
                { "getDocumentReq", documentRequest }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var resp = await client.GetAsync(BuildRequestUri(apiPath, qs));
                var content = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode) return null;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("result", out var result) &&
                    result.TryGetProperty("success", out var success) &&
                    success.ValueKind == JsonValueKind.False)
                    return null;

                var data = json.RootElement.TryGetProperty("result", out result) &&
                           result.TryGetProperty("data", out var resultData)
                    ? resultData
                    : json.RootElement.TryGetProperty("data", out var rootData)
                        ? rootData
                        : default;
                if (data.ValueKind != JsonValueKind.Object)
                    return null;

                var fileValue = data.TryGetProperty("file", out var fileElement)
                    ? fileElement.GetString()
                    : null;
                var pdfUrl = data.TryGetProperty("pdf_url", out var pdfUrlElement)
                    ? pdfUrlElement.GetString()
                    : null;

                var document = await ReadLazadaDocumentAsync(client, fileValue, pdfUrl);
                if (document == null || document.Content.Length == 0)
                    return null;

                return new ShippingLabelResult
                {
                    Platform = PlatformType.Lazada,
                    OrderId = orderId,
                    PackageId = packageId,
                    TrackingNumber = trackingNumber ?? string.Empty,
                    DocumentUrl = pdfUrl,
                    DocumentBase64 = Convert.ToBase64String(document.Content),
                    ContentType = document.ContentType,
                    DocumentType = documentType,
                    Status = "READY"
                };
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ Lazada: Error getting shipping label"); return null; }
        }

        private static async Task<DownloadedDocument?> ReadLazadaDocumentAsync(
            HttpClient client,
            string? fileValue,
            string? pdfUrl)
        {
            if (!string.IsNullOrWhiteSpace(pdfUrl) && Uri.TryCreate(pdfUrl, UriKind.Absolute, out _))
            {
                using var response = await client.GetAsync(pdfUrl);
                if (response.IsSuccessStatusCode)
                {
                    var bytes = await response.Content.ReadAsByteArrayAsync();
                    if (bytes.Length > 0)
                    {
                        var contentType = response.Content.Headers.ContentType?.MediaType;
                        return new DownloadedDocument(bytes, IsPdf(bytes)
                            ? "application/pdf"
                            : string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType);
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(fileValue))
                return null;

            var value = fileValue.Trim();
            if (Uri.TryCreate(value, UriKind.Absolute, out var fileUri) &&
                (fileUri.Scheme == Uri.UriSchemeHttp || fileUri.Scheme == Uri.UriSchemeHttps))
                return await ReadLazadaDocumentAsync(client, null, fileUri.ToString());

            if (value.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                var comma = value.IndexOf(',');
                if (comma > 0)
                {
                    var metadata = value.Substring(5, comma - 5);
                    var payload = value.Substring(comma + 1);
                    var bytes = metadata.IndexOf(";base64", StringComparison.OrdinalIgnoreCase) >= 0
                        ? Convert.FromBase64String(payload)
                        : Encoding.UTF8.GetBytes(Uri.UnescapeDataString(payload));
                    return new DownloadedDocument(bytes, ContentTypeFor(bytes, metadata.Split(';')[0]));
                }
            }

            try
            {
                var decoded = Convert.FromBase64String(value);
                if (decoded.Length > 0)
                    return new DownloadedDocument(decoded, ContentTypeFor(decoded, null));
            }
            catch (FormatException)
            {
                // Lazada may return the HTML document directly instead of Base64.
            }

            var raw = Encoding.UTF8.GetBytes(value);
            return new DownloadedDocument(raw, "text/html");
        }

        private static string ContentTypeFor(byte[] bytes, string? declaredContentType)
        {
            if (IsPdf(bytes))
                return "application/pdf";
            if (!string.IsNullOrWhiteSpace(declaredContentType))
                return declaredContentType;
            return "text/html";
        }

        private static bool IsPdf(byte[] bytes) =>
            bytes.Length >= 4 && bytes[0] == (byte)'%' && bytes[1] == (byte)'P' &&
            bytes[2] == (byte)'D' && bytes[3] == (byte)'F';

        private sealed class DownloadedDocument
        {
            public DownloadedDocument(byte[] content, string contentType)
            {
                Content = content;
                ContentType = contentType;
            }

            public byte[] Content { get; }
            public string ContentType { get; }
        }

        public async Task<SplitPlatformOrderResult> SplitOrderAsync(
            string accessToken,
            string? shopId,
            SplitPlatformOrderRequest request)
        {
            if (request.Packages.Count < 2)
                throw new InvalidOperationException("Lazada package split requires at least two WMS packages.");

            if (!long.TryParse(request.OrderId, out var orderId) || orderId <= 0)
                throw new InvalidOperationException($"Lazada order_id '{request.OrderId}' is invalid.");

            var client = _httpClientFactory.CreateClient("Lazada");
            var orderItems = await GetLazadaPackItemsAsync(accessToken, request.OrderId, client);
            if (orderItems.Count == 0)
                throw new InvalidOperationException(
                    $"Lazada did not return order items for order '{request.OrderId}'.");

            var assignedItemIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var mappings = new List<PlatformPackageMappingRequest>();
            foreach (var package in request.Packages.OrderBy(x => x.BoxNumber))
            {
                if (package.Items.Count == 0)
                    throw new InvalidOperationException(
                        $"WMS box {package.BoxNumber} does not contain any items.");

                var itemIds = new List<string>();
                foreach (var wmsItem in package.Items
                    .Where(x => !string.IsNullOrWhiteSpace(x.ItemNumber))
                    .GroupBy(x => NormalizeLazadaItemNumber(x.ItemNumber), StringComparer.OrdinalIgnoreCase)
                    .Select(x => new { ItemNumber = x.Key, Quantity = x.Sum(y => y.Quantity) }))
                {
                    if (wmsItem.Quantity <= 0)
                        throw new InvalidOperationException(
                            $"WMS item '{wmsItem.ItemNumber}' in box {package.BoxNumber} has an invalid quantity.");

                    // Lazada may return one order-item object per unit.  Do not
                    // require a single row for a WMS SKU; collect all still
                    // unassigned rows for that SKU until the WMS quantity is
                    // satisfied.  This also allows the same SKU to be split
                    // across two WMS boxes when Lazada exposes separate item
                    // ids for each unit.
                    var candidates = orderItems.Where(item =>
                            !assignedItemIds.Contains(item.ItemId) &&
                            item.ItemNumberAliases.Any(alias =>
                                string.Equals(
                                    NormalizeLazadaItemNumber(alias),
                                    wmsItem.ItemNumber,
                                    StringComparison.OrdinalIgnoreCase)))
                        .OrderBy(item => item.ItemId, StringComparer.OrdinalIgnoreCase)
                        .ToList();
                    var matches = new List<LazadaPackItem>();
                    var remainingQuantity = wmsItem.Quantity;
                    foreach (var candidate in candidates)
                    {
                        if (candidate.Quantity <= 0 || candidate.Quantity > remainingQuantity)
                            continue;
                        matches.Add(candidate);
                        remainingQuantity -= candidate.Quantity;
                        if (remainingQuantity == 0)
                            break;
                    }
                    if (remainingQuantity != 0)
                    {
                        throw new InvalidOperationException(
                            $"WMS item '{wmsItem.ItemNumber}' in box {package.BoxNumber} " +
                            $"could not be allocated at quantity {wmsItem.Quantity} from Lazada order items. " +
                            "Ensure the WMS item_number and quantity match Lazada seller_sku/shop_sku.");
                    }

                    var alreadyPacked = matches.FirstOrDefault(item => IsLazadaPackedStatus(item.Status));
                    if (alreadyPacked != null)
                    {
                        throw new InvalidOperationException(
                            $"Lazada order item '{alreadyPacked.ItemId}' is already packed " +
                            $"in package '{alreadyPacked.PackageId}'. Repack it in Lazada or use a new pending order before splitting WMS boxes.");
                    }

                    foreach (var orderItem in matches)
                    {
                        if (!assignedItemIds.Add(orderItem.ItemId))
                            throw new InvalidOperationException(
                                $"Lazada order item '{orderItem.ItemId}' is assigned to more than one WMS box.");
                        itemIds.Add(orderItem.ItemId);
                    }
                }

                var packed = await PackLazadaItemsAsync(
                    accessToken,
                    orderId,
                    itemIds,
                    client);
                if (packed.Count != 1)
                {
                    throw new InvalidOperationException(
                        $"Lazada Pack API returned {packed.Count} package(s) for WMS box {package.BoxNumber}; expected exactly one.");
                }

                var packageId = packed[0].PackageId;
                if (string.IsNullOrWhiteSpace(packageId))
                    throw new InvalidOperationException(
                        $"Lazada Pack API did not return a package_id for WMS box {package.BoxNumber}.");

                mappings.Add(new PlatformPackageMappingRequest
                {
                    WmsPackageRef = package.WmsPackageRef,
                    PlatformPackageId = packageId
                });
            }

            var missingItems = orderItems
                .Where(item => !assignedItemIds.Contains(item.ItemId) &&
                               !IsLazadaPackedStatus(item.Status))
                .Select(item => item.ItemId)
                .ToList();
            if (missingItems.Count > 0)
            {
                throw new InvalidOperationException(
                    "The WMS boxes do not contain every pending Lazada order item: " +
                    string.Join(", ", missingItems));
            }

            var duplicatePackageIds = mappings
                .GroupBy(x => x.PlatformPackageId, StringComparer.OrdinalIgnoreCase)
                .Where(x => string.IsNullOrWhiteSpace(x.Key) || x.Count() > 1)
                .Select(x => x.Key)
                .ToList();
            if (duplicatePackageIds.Count > 0)
                throw new InvalidOperationException(
                    "Lazada assigned the same package_id to more than one WMS box: " +
                    string.Join(", ", duplicatePackageIds));

            return new SplitPlatformOrderResult { PackageMappings = mappings };
        }

        public async Task<bool> ShipOrderAsync(string accessToken, string? shopId, ShipOrderRequest request)
        {
            _logger.LogInformation("🏪 Lazada: Shipping order {OrderId}", request.OrderId);
            var client = _httpClientFactory.CreateClient("Lazada");
            try
            {
                if (!long.TryParse(request.OrderId, out var orderId) || orderId <= 0)
                    return false;

                var orderItems = await GetLazadaPackItemsAsync(accessToken, request.OrderId, client);
                var pendingItems = orderItems
                    .Where(item => !IsLazadaPackedStatus(item.Status))
                    .Select(item => item.ItemId)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                if (pendingItems.Count == 0)
                    return true;

                var packed = await PackLazadaItemsAsync(accessToken, orderId, pendingItems, client);
                return packed.Count > 0 && packed.All(item => !string.IsNullOrWhiteSpace(item.PackageId));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Lazada: Error packing order");
                return false;
            }
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(
            string accessToken,
            string? shopId,
            bool throwOnApiError = false)
        {
            _logger.LogInformation("🏪 Lazada: Getting shipping providers");
            var client = _httpClientFactory.CreateClient("Lazada");
            // Lazada Open Platform maps GetShipmentProviders to
            // /shipment/providers/get. The old /logistics/buyer/providers
            // path is not a valid LazOP API path and returns InvalidApiPath.
            var apiPath = "/shipment/providers/get";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var resp = await client.GetAsync(BuildRequestUri(apiPath, qs));
                var content = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode && throwOnApiError)
                {
                    var errorJson = TryParseJson(content);
                    var errorCode = errorJson.HasValue
                        ? GetLazadaString(errorJson.Value, "error_code", "errorCode", "code")
                        : $"HTTP_{(int)resp.StatusCode}";
                    var errorMessage = errorJson.HasValue
                        ? GetLazadaString(errorJson.Value, "message", "error_msg", "errorMsg")
                        : content;
                    var requestId = errorJson.HasValue
                        ? GetLazadaString(errorJson.Value, "request_id")
                        : string.Empty;
                    throw new PlatformApiException(
                        "Lazada",
                        string.IsNullOrWhiteSpace(errorCode) ? $"HTTP_{(int)resp.StatusCode}" : errorCode,
                        string.IsNullOrWhiteSpace(errorMessage) ? "Request failed." : errorMessage,
                        requestId);
                }

                if (resp.IsSuccessStatusCode)
                {
                    var json = JsonDocument.Parse(content);
                    var responseCode = GetLazadaString(json.RootElement, "code");
                    if (throwOnApiError && !string.IsNullOrWhiteSpace(responseCode) && responseCode != "0")
                    {
                        throw new PlatformApiException(
                            "Lazada",
                            responseCode,
                            GetLazadaString(json.RootElement, "message", "error_msg", "errorMsg"),
                            GetLazadaString(json.RootElement, "request_id"));
                    }
                    if (json.RootElement.TryGetProperty("data", out var data) &&
                        data.TryGetProperty("provider_list", out var list))
                    {
                        var providers = new List<ShippingProvider>();
                        foreach (var item in list.EnumerateArray())
                        {
                            providers.Add(new ShippingProvider
                            {
                                ProviderId = item.TryGetProperty("provider_code", out var code) ? code.GetString() ?? "" : "",
                                Name = item.TryGetProperty("provider_name", out var name) ? name.GetString() ?? "" : "",
                                Platform = PlatformType.Lazada,
                                Enabled = !item.TryGetProperty("is_active", out var active) || active.GetBoolean()
                            });
                        }
                        if (providers.Count > 0) return providers;
                    }
                }

                _logger.LogWarning("⚠️ Lazada: Could not fetch shipping providers from API, using fallback list. Response: {Status}", resp.StatusCode);
            }
            catch (PlatformApiException) when (throwOnApiError)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Lazada: Error fetching shipping providers from API, using fallback list");
                if (throwOnApiError)
                    throw;
            }

            // Fallback: standard Thai shipping providers
            return new List<ShippingProvider>
            {
                new() { ProviderId = "LEX", Name = "Lazada Express (LEX)", Platform = PlatformType.Lazada, Enabled = true },
                new() { ProviderId = "Kerry", Name = "Kerry Express", Platform = PlatformType.Lazada, Enabled = true },
                new() { ProviderId = "Flash", Name = "Flash Express", Platform = PlatformType.Lazada, Enabled = true },
                new() { ProviderId = "ThaiPost", Name = "Thailand Post", Platform = PlatformType.Lazada, Enabled = true }
            };
        }

        private static JsonElement? TryParseJson(string content)
        {
            try
            {
                using var document = JsonDocument.Parse(content);
                return document.RootElement.Clone();
            }
            catch (JsonException)
            {
                return null;
            }
        }

        public async Task<TrackingInfo?> GetTrackingInfoAsync(
            string accessToken,
            string? shopId,
            string orderId,
            IReadOnlyCollection<string>? packageNumbers = null)
        {
            _logger.LogInformation("🏪 Lazada: Getting tracking for order {OrderId}", orderId);
            var client = _httpClientFactory.CreateClient("Lazada");
            var tracking = new TrackingInfo
            {
                Platform = PlatformType.Lazada,
                OrderId = orderId,
                Packages = await GetTrackingPackagesFromOrderItemsAsync(accessToken, orderId, client)
            };
            SetPrimaryTracking(tracking);

            var assignedTrackingCount = tracking.Packages.Count(package =>
                !string.IsNullOrWhiteSpace(package.TrackingNumber));
            _logger.LogInformation(
                "Lazada GetOrderItems resolved {PackageCount} packages and {TrackingCount} tracking numbers for order {OrderId}",
                tracking.Packages.Count,
                assignedTrackingCount,
                orderId);

            // GetOrderItems is the authoritative source for the tracking code.
            // GetOrderTrace is only needed as a fallback when the order items do
            // not contain it (and may legitimately return success without module).
            if (assignedTrackingCount > 0)
                return tracking;

            var apiPath = "/logistic/order/trace";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
            var packageIds = tracking.Packages
                .Select(package => package.PackageId)
                .Where(packageId => !string.IsNullOrWhiteSpace(packageId))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" },
                { "order_id", orderId },
                { "locale", "th" },
                { "ofcPackageIdList", JsonSerializer.Serialize(packageIds) }
            };

            // GetOrderTrace requires the seller id in addition to the order id.
            // For Lazada this is persisted as shop_id during OAuth.
            if (!string.IsNullOrWhiteSpace(shopId))
            {
                parameters["seller_id"] = shopId.Trim();
            }
            else
            {
                _logger.LogWarning(
                    "Lazada tracking request for order {OrderId} has no seller/shop id; " +
                    "reauthorize Lazada so seller_id is saved with the credential.",
                    orderId);
            }

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var resp = await client.GetAsync(BuildRequestUri(apiPath, qs));
                var content = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Lazada GetOrderTrace failed: HTTP {StatusCode}, endpoint {Endpoint}, response {Content}",
                        (int)resp.StatusCode,
                        resp.RequestMessage?.RequestUri?.GetLeftPart(UriPartial.Path),
                        string.IsNullOrWhiteSpace(content) ? "<empty>" : content);
                    return tracking.Packages.Count > 0 ? tracking : null;
                }

                var json = JsonDocument.Parse(content);

                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    tracking.TrackingNumber = GetLazadaString(data, "tracking_number", "tracking_code", "tracking_no");
                    tracking.Carrier = GetLazadaString(data, "shipping_provider", "shipment_provider", "shipping_carrier");
                    tracking.Status = GetLazadaString(data, "status", "logistics_status");

                    var packageSources = new List<JsonElement>();
                    if (data.TryGetProperty("packages", out var pkgs) && pkgs.ValueKind == JsonValueKind.Array)
                    {
                        packageSources.AddRange(pkgs.EnumerateArray());
                    }
                    if (data.TryGetProperty("package_list", out var packageList) && packageList.ValueKind == JsonValueKind.Array)
                    {
                        packageSources.AddRange(packageList.EnumerateArray());
                    }

                    foreach (var source in packageSources)
                    {
                        var packageId = GetLazadaString(source, "package_id", "package_number", "shipment_id", "id");
                        var trackingNumber = GetLazadaString(
                            source,
                            "tracking_number",
                            "tracking_code",
                            "tracking_no",
                            "seller_tracking_number",
                            "tracking_code_pre");
                        var carrier = GetLazadaString(source, "shipping_provider", "shipment_provider", "shipping_carrier", "provider_name");
                        var status = GetLazadaString(source, "package_status", "logistics_status", "status");
                        var description = GetLazadaString(source, "description", "event", "status_description");
                        var eventTimestamp = GetLazadaDateTime(source, "timestamp", "event_time", "time", "created_at");

                        // In some Lazada responses `packages` is actually the
                        // trace-event list. Only create a package when the
                        // element contains package identity/shipping data.
                        if (packageId.Length > 0 || trackingNumber.Length > 0 || carrier.Length > 0)
                        {
                            var package = new ShippingPackage
                            {
                                PackageId = packageId,
                                TrackingNumber = trackingNumber,
                                Carrier = carrier,
                                Status = status
                            };
                            if (!string.IsNullOrWhiteSpace(description))
                            {
                                package.Events.Add(new TrackingEvent
                                {
                                    Description = description,
                                    Timestamp = eventTimestamp
                                });
                                tracking.Events.Add(package.Events[0]);
                            }

                            var existingPackage = tracking.Packages.FirstOrDefault(existing =>
                                (!string.IsNullOrWhiteSpace(package.PackageId) &&
                                 SameLazadaPackageId(existing.PackageId, package.PackageId)) ||
                                (!string.IsNullOrWhiteSpace(package.TrackingNumber) &&
                                 existing.TrackingNumber == package.TrackingNumber));
                            if (existingPackage == null)
                            {
                                tracking.Packages.Add(package);
                            }
                            else
                            {
                                if (existingPackage.TrackingNumber.Length == 0)
                                    existingPackage.TrackingNumber = package.TrackingNumber;
                                if (existingPackage.Carrier.Length == 0)
                                    existingPackage.Carrier = package.Carrier;
                                if (existingPackage.Status.Length == 0)
                                    existingPackage.Status = package.Status;
                                existingPackage.Events.AddRange(package.Events);
                            }
                        }
                        else if (!string.IsNullOrWhiteSpace(description))
                        {
                            tracking.Events.Add(new TrackingEvent
                            {
                                Description = description,
                                Timestamp = eventTimestamp
                            });
                        }
                    }

                    if (tracking.Packages.Count == 0 &&
                        (!string.IsNullOrWhiteSpace(tracking.TrackingNumber) || !string.IsNullOrWhiteSpace(tracking.Carrier)))
                    {
                        tracking.Packages.Add(new ShippingPackage
                        {
                            TrackingNumber = tracking.TrackingNumber,
                            Carrier = tracking.Carrier,
                            Status = tracking.Status
                        });
                    }

                    var primary = tracking.Packages.FirstOrDefault();
                    if (primary != null)
                    {
                        if (string.IsNullOrWhiteSpace(tracking.TrackingNumber)) tracking.TrackingNumber = primary.TrackingNumber;
                        if (string.IsNullOrWhiteSpace(tracking.Carrier)) tracking.Carrier = primary.Carrier;
                        if (string.IsNullOrWhiteSpace(tracking.Status)) tracking.Status = primary.Status;
                    }
                }

                // GetOrderTrace uses a different envelope from the regular
                // order APIs: result.module[].package_detail_info_list[].
                if (json.RootElement.TryGetProperty("result", out var traceResult) &&
                    traceResult.TryGetProperty("module", out var modules) &&
                    modules.ValueKind == JsonValueKind.Array)
                {
                    foreach (var module in modules.EnumerateArray())
                    {
                        if (!module.TryGetProperty("package_detail_info_list", out var packageList) ||
                            packageList.ValueKind != JsonValueKind.Array)
                            continue;

                        foreach (var source in packageList.EnumerateArray())
                        {
                            var package = new ShippingPackage
                            {
                                PackageId = GetLazadaString(source, "ofc_package_id", "package_id"),
                                TrackingNumber = GetLazadaString(source, "tracking_number", "tracking_code")
                            };

                            if (source.TryGetProperty("logistic_detail_info_list", out var eventList) &&
                                eventList.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var sourceEvent in eventList.EnumerateArray())
                                {
                                    var status = GetLazadaString(sourceEvent, "status_code", "title", "detail_type");
                                    var description = GetLazadaString(sourceEvent, "description", "title");
                                    var trackingEvent = new TrackingEvent
                                    {
                                        Description = description.Length > 0 ? description : status,
                                        Timestamp = GetLazadaDateTime(sourceEvent, "event_time", "event_date", "receive_time")
                                    };

                                    if (status.Length > 0) package.Status = status;
                                    package.Events.Add(trackingEvent);
                                    tracking.Events.Add(trackingEvent);
                                }
                            }

                            var existingPackage = tracking.Packages.FirstOrDefault(existing =>
                                (!string.IsNullOrWhiteSpace(package.PackageId) &&
                                 SameLazadaPackageId(existing.PackageId, package.PackageId)) ||
                                (!string.IsNullOrWhiteSpace(package.TrackingNumber) && existing.TrackingNumber == package.TrackingNumber));

                            if (existingPackage == null)
                            {
                                tracking.Packages.Add(package);
                            }
                            else
                            {
                                if (existingPackage.TrackingNumber.Length == 0)
                                    existingPackage.TrackingNumber = package.TrackingNumber;
                                if (existingPackage.Status.Length == 0)
                                    existingPackage.Status = package.Status;
                                existingPackage.Events.AddRange(package.Events);
                            }
                        }
                    }

                    var primaryPackage = tracking.Packages.FirstOrDefault();
                    if (primaryPackage != null)
                    {
                        tracking.TrackingNumber = primaryPackage.TrackingNumber;
                        if (tracking.Status.Length == 0) tracking.Status = primaryPackage.Status;
                    }
                }
                SetPrimaryTracking(tracking);
                if (tracking.Packages.Count > 0 &&
                    json.RootElement.TryGetProperty("result", out var emptyTraceResult) &&
                    !emptyTraceResult.TryGetProperty("module", out _))
                {
                    _logger.LogInformation(
                        "Lazada GetOrderTrace returned no module for order {OrderId}; " +
                        "using tracking numbers from GetOrderItems.",
                        orderId);
                }
                return tracking;
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Lazada: Error getting tracking");
                return tracking.Packages.Count > 0 ? tracking : null;
            }
        }

        private async Task<List<ShippingPackage>> GetTrackingPackagesFromOrderItemsAsync(
            string accessToken,
            string orderId,
            HttpClient client)
        {
            var apiPath = "/order/items/get";
            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() },
                { "access_token", accessToken },
                { "sign_method", "sha256" },
                { "order_id", orderId }
            };
            parameters["sign"] = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var response = await client.GetAsync(BuildRequestUri(apiPath, queryString));
                var content = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Lazada GetOrderItems failed while resolving tracking packages: HTTP {StatusCode}",
                        (int)response.StatusCode);
                    return new List<ShippingPackage>();
                }

                using var json = JsonDocument.Parse(content);
                var responseCode = GetLazadaString(json.RootElement, "code");
                if (responseCode.Length > 0 && responseCode != "0")
                {
                    var responseMessage = GetLazadaString(json.RootElement, "message");
                    throw new InvalidOperationException(
                        $"Lazada rejected platform order_id '{orderId}' (code {responseCode}): {responseMessage}. " +
                        "Use the order_id returned by /orders/get and the credential for the same Lazada shop.");
                }

                if (!TryGetLazadaProperty(json.RootElement, "data", out var data))
                    return new List<ShippingPackage>();

                var items = data.ValueKind == JsonValueKind.Array
                    ? data.EnumerateArray().ToArray()
                    : TryGetLazadaProperty(data, "order_items", out var orderItems) && orderItems.ValueKind == JsonValueKind.Array
                        ? orderItems.EnumerateArray().ToArray()
                    : TryGetLazadaProperty(data, "order_item_list", out var orderItemList) && orderItemList.ValueKind == JsonValueKind.Array
                        ? orderItemList.EnumerateArray().ToArray()
                    : TryGetLazadaProperty(data, "items", out var itemsProperty) && itemsProperty.ValueKind == JsonValueKind.Array
                        ? itemsProperty.EnumerateArray().ToArray()
                        : Array.Empty<JsonElement>();

                var packageMap = new Dictionary<string, ShippingPackage>(StringComparer.OrdinalIgnoreCase);
                foreach (var item in items)
                {
                    var packageId = GetLazadaString(item, "package_id", "ofc_package_id", "package_number");
                    // The newer Lazada order-items response exposes the
                    // carrier tracking number as tracking_number.  Some
                    // responses also contain tracking_code, which can be a
                    // seller/package code (including SOF_...) rather than
                    // the number shown in Seller Center.  Prefer the
                    // authoritative tracking_number field first.
                    var trackingNumber = GetLazadaString(
                        item,
                        "tracking_number",
                        "tracking_code",
                        "tracking_no",
                        "seller_tracking_number",
                        "tracking_code_pre");
                    var carrier = GetLazadaString(item, "shipment_provider", "shipping_provider", "shipping_carrier");
                    var status = GetLazadaString(item, "status", "package_status", "logistics_status");
                    var itemId = GetLazadaString(item, "order_item_id", "order_line_id", "id");
                    // Lazada exposes the seller's item number under different
                    // names depending on the API version/market. Keep every
                    // non-empty form so matching can choose the one used by WMS.
                    var itemNumberAliases = new[]
                    {
                        GetLazadaString(item, "seller_sku"),
                        GetLazadaString(item, "shop_sku"),
                        GetLazadaString(item, "sku"),
                        GetLazadaString(item, "sku_id"),
                        GetLazadaString(item, "product_id"),
                        GetLazadaString(item, "item_id"),
                        GetLazadaString(item, "order_item_id")
                    }
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                    var itemNumber = itemNumberAliases.FirstOrDefault() ?? string.Empty;
                    var itemQuantity = GetLazadaDecimal(item, "quantity", "item_quantity", "order_item_quantity");
                    if (itemQuantity <= 0) itemQuantity = 1;

                    if (packageId.Length == 0 && trackingNumber.Length == 0)
                        continue;

                    var key = packageId.Length > 0 ? $"id:{packageId}" : $"tracking:{trackingNumber}";
                    if (!packageMap.TryGetValue(key, out var package))
                    {
                        package = new ShippingPackage
                        {
                            PackageId = packageId,
                            TrackingNumber = trackingNumber,
                            Carrier = carrier,
                            Status = status
                        };
                        packageMap[key] = package;
                    }

                    if (package.TrackingNumber.Length == 0) package.TrackingNumber = trackingNumber;
                    if (package.Carrier.Length == 0) package.Carrier = carrier;
                    if (package.Status.Length == 0) package.Status = status;
                    if (itemId.Length > 0 && !package.ItemIds.Contains(itemId)) package.ItemIds.Add(itemId);
                    if (itemNumber.Length > 0)
                    {
                        var existingItem = package.Items.FirstOrDefault(x =>
                            string.Equals(x.ItemId, itemId, StringComparison.OrdinalIgnoreCase) &&
                            string.Equals(x.ItemNumber, itemNumber, StringComparison.OrdinalIgnoreCase));
                        if (existingItem == null)
                        {
                            package.Items.Add(new ShippingPackageItem
                            {
                                ItemId = itemId,
                                ItemNumber = itemNumber,
                                ItemNumberAliases = itemNumberAliases,
                                Quantity = itemQuantity
                            });
                        }
                        else
                        {
                            existingItem.Quantity += itemQuantity;
                            foreach (var alias in itemNumberAliases.Where(alias =>
                                         !existingItem.ItemNumberAliases.Contains(alias, StringComparer.OrdinalIgnoreCase)))
                                existingItem.ItemNumberAliases.Add(alias);
                        }
                    }
                }

                return packageMap.Values.ToList();
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lazada: Could not resolve tracking packages from GetOrderItems");
                return new List<ShippingPackage>();
            }
        }

        private async Task<List<LazadaPackItem>> GetLazadaPackItemsAsync(
            string accessToken,
            string orderId,
            HttpClient client)
        {
            var apiPath = "/order/items/get";
            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() },
                { "access_token", accessToken },
                { "sign_method", "sha256" },
                { "order_id", orderId }
            };
            parameters["sign"] = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            var response = await client.GetAsync(BuildRequestUri(apiPath, queryString));
            var content = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"Lazada GetOrderItems failed with HTTP {(int)response.StatusCode}: {content}");
            }

            using var json = JsonDocument.Parse(content);
            var responseCode = GetLazadaString(json.RootElement, "code");
            if (responseCode.Length > 0 && responseCode != "0")
            {
                var responseMessage = GetLazadaString(json.RootElement, "message");
                throw new InvalidOperationException(
                    $"Lazada rejected order '{orderId}' (code {responseCode}): {responseMessage}.");
            }
            if (!TryGetLazadaProperty(json.RootElement, "data", out var data))
                return new List<LazadaPackItem>();

            var items = data.ValueKind == JsonValueKind.Array
                ? data.EnumerateArray().ToArray()
                : TryGetLazadaProperty(data, "order_items", out var orderItems) && orderItems.ValueKind == JsonValueKind.Array
                    ? orderItems.EnumerateArray().ToArray()
                : TryGetLazadaProperty(data, "order_item_list", out var orderItemList) && orderItemList.ValueKind == JsonValueKind.Array
                    ? orderItemList.EnumerateArray().ToArray()
                : TryGetLazadaProperty(data, "items", out var itemsProperty) && itemsProperty.ValueKind == JsonValueKind.Array
                    ? itemsProperty.EnumerateArray().ToArray()
                    : Array.Empty<JsonElement>();

            var result = new List<LazadaPackItem>();
            foreach (var item in items)
            {
                var itemId = GetLazadaString(item, "order_item_id", "order_line_id", "id");
                if (string.IsNullOrWhiteSpace(itemId))
                    continue;

                var aliases = new[]
                {
                    GetLazadaString(item, "seller_sku"),
                    GetLazadaString(item, "shop_sku"),
                    GetLazadaString(item, "sku"),
                    GetLazadaString(item, "sku_id"),
                    GetLazadaString(item, "product_id"),
                    GetLazadaString(item, "item_id"),
                    itemId
                }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
                var quantity = GetLazadaDecimal(item, "quantity", "item_quantity", "order_item_quantity");
                if (quantity <= 0) quantity = 1;

                var existing = result.FirstOrDefault(x =>
                    string.Equals(x.ItemId, itemId, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    result.Add(new LazadaPackItem
                    {
                        ItemId = itemId,
                        ItemNumberAliases = aliases,
                        Quantity = quantity,
                        Status = GetLazadaString(item, "status", "package_status", "logistics_status"),
                        PackageId = GetLazadaString(item, "package_id", "ofc_package_id", "package_number")
                    });
                }
                else
                {
                    existing.Quantity += quantity;
                    foreach (var alias in aliases.Where(alias =>
                                 !existing.ItemNumberAliases.Contains(alias, StringComparer.OrdinalIgnoreCase)))
                        existing.ItemNumberAliases.Add(alias);
                    if (existing.Status.Length == 0)
                        existing.Status = GetLazadaString(item, "status", "package_status", "logistics_status");
                    if (existing.PackageId.Length == 0)
                        existing.PackageId = GetLazadaString(item, "package_id", "ofc_package_id", "package_number");
                }
            }

            return result;
        }

        private async Task<List<LazadaPackedItem>> PackLazadaItemsAsync(
            string accessToken,
            long orderId,
            IReadOnlyCollection<string> itemIds,
            HttpClient client)
        {
            if (itemIds.Count == 0)
                throw new InvalidOperationException("No Lazada order items were supplied to Pack API.");

            var numericItemIds = itemIds.Select(itemId =>
            {
                if (!long.TryParse(itemId, out var value) || value <= 0)
                    throw new InvalidOperationException($"Lazada order_item_id '{itemId}' is invalid.");
                return value;
            }).ToArray();

            var shippingAllocateType = Environment.GetEnvironmentVariable("LAZADA_SHIPPING_ALLOCATE_TYPE")?.Trim();
            if (string.IsNullOrWhiteSpace(shippingAllocateType))
                shippingAllocateType = "TFS";

            var packRequest = new
            {
                pack_order_list = new[]
                {
                    new
                    {
                        order_item_list = numericItemIds,
                        order_id = orderId
                    }
                },
                delivery_type = "dropship",
                shipping_allocate_type = shippingAllocateType
            };
            var packReq = JsonSerializer.Serialize(packRequest);
            var apiPath = "/order/fulfill/pack";
            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey },
                { "timestamp", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() },
                { "access_token", accessToken },
                { "sign_method", "sha256" },
                { "packReq", packReq }
            };

            // Lazada names this optional query parameter
            // shipment_provider_id. Keep the old *_CODE environment variable
            // as a compatibility fallback for existing deployments.
            var providerId = Environment.GetEnvironmentVariable("LAZADA_SHIPPING_PROVIDER_ID")?.Trim();
            if (string.IsNullOrWhiteSpace(providerId))
                providerId = Environment.GetEnvironmentVariable("LAZADA_SHIPPING_PROVIDER_CODE")?.Trim();
            if (!string.IsNullOrWhiteSpace(providerId))
                parameters["shipment_provider_id"] = providerId;

            parameters["sign"] = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            using var response = await client.PostAsync(BuildRequestUri(apiPath, queryString), null);
            var content = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"Lazada Pack API failed with HTTP {(int)response.StatusCode}: {content}");
            }

            using var json = JsonDocument.Parse(content);
            var root = json.RootElement;
            var errorCode = GetLazadaString(root, "errorCode", "error_code", "code");
            var errorMessage = GetLazadaString(root, "errorMsg", "error_msg", "message");
            if (!string.IsNullOrWhiteSpace(errorCode) && errorCode != "0")
                throw new InvalidOperationException(
                    $"Lazada Pack API error {errorCode}: {errorMessage}");

            JsonElement payload = root;
            if (TryGetLazadaProperty(root, "result", out var result) && result.ValueKind == JsonValueKind.Object)
                payload = result;
            if (TryGetLazadaProperty(payload, "data", out var data) && data.ValueKind == JsonValueKind.Object)
                payload = data;
            if (!TryGetLazadaProperty(payload, "pack_order_list", out var packOrders) ||
                packOrders.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidOperationException("Lazada Pack API did not return pack_order_list.");
            }

            var packedItems = new List<LazadaPackedItem>();
            foreach (var packOrder in packOrders.EnumerateArray())
            {
                if (!TryGetLazadaProperty(packOrder, "order_item_list", out var orderItemList) ||
                    orderItemList.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var packedItem in orderItemList.EnumerateArray())
                {
                    var itemErrorCode = GetLazadaString(packedItem, "item_err_code", "error_code");
                    if (!string.IsNullOrWhiteSpace(itemErrorCode) && itemErrorCode != "0")
                    {
                        var itemMessage = GetLazadaString(packedItem, "msg", "message", "error_msg");
                        throw new InvalidOperationException(
                            $"Lazada Pack API item error {itemErrorCode}: {itemMessage}");
                    }

                    packedItems.Add(new LazadaPackedItem
                    {
                        ItemId = GetLazadaString(packedItem, "order_item_id", "order_line_id", "id"),
                        PackageId = GetLazadaString(packedItem, "package_id", "ofc_package_id", "package_number"),
                        TrackingNumber = GetLazadaString(packedItem, "tracking_number", "tracking_code"),
                        Carrier = GetLazadaString(packedItem, "shipment_provider", "shipping_provider")
                    });
                }
            }

            var packageIds = packedItems
                .Select(x => x.PackageId)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (packageIds.Count == 0)
                throw new InvalidOperationException("Lazada Pack API did not return a package_id.");
            var returnedItemIds = packedItems
                .Select(x => x.ItemId)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var missingItemIds = itemIds
                .Where(itemId => !returnedItemIds.Contains(itemId))
                .ToList();
            if (missingItemIds.Count > 0)
                throw new InvalidOperationException(
                    "Lazada Pack API did not confirm every requested order item: " +
                    string.Join(", ", missingItemIds));
            if (packageIds.Count > 1)
                throw new InvalidOperationException(
                    $"Lazada Pack API returned {packageIds.Count} packages for one WMS box; " +
                    "each WMS box must be packed into exactly one Lazada package.");

            return new List<LazadaPackedItem>
            {
                new LazadaPackedItem
                {
                    ItemId = string.Join(",", packedItems.Select(x => x.ItemId).Where(x => !string.IsNullOrWhiteSpace(x))),
                    PackageId = packageIds[0],
                    TrackingNumber = packedItems.Select(x => x.TrackingNumber).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? string.Empty,
                    Carrier = packedItems.Select(x => x.Carrier).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? string.Empty
                }
            };
        }

        private static bool IsLazadaPackedStatus(string status)
        {
            var normalized = (status ?? string.Empty).Trim().ToUpperInvariant();
            return normalized is "PACKED" or "READY_TO_SHIP" or "SHIPPED" or "DELIVERED";
        }

        private static string NormalizeLazadaItemNumber(string value) =>
            (value ?? string.Empty).Trim().Replace(" ", string.Empty).ToUpperInvariant();

        private sealed class LazadaPackItem
        {
            public string ItemId { get; set; } = string.Empty;
            public List<string> ItemNumberAliases { get; set; } = new();
            public decimal Quantity { get; set; }
            public string Status { get; set; } = string.Empty;
            public string PackageId { get; set; } = string.Empty;
        }

        private sealed class LazadaPackedItem
        {
            public string ItemId { get; set; } = string.Empty;
            public string PackageId { get; set; } = string.Empty;
            public string TrackingNumber { get; set; } = string.Empty;
            public string Carrier { get; set; } = string.Empty;
        }

        private static void SetPrimaryTracking(TrackingInfo tracking)
        {
            var primary = tracking.Packages.FirstOrDefault(package =>
                              !string.IsNullOrWhiteSpace(package.TrackingNumber))
                          ?? tracking.Packages.FirstOrDefault();
            if (primary == null) return;

            if (tracking.TrackingNumber.Length == 0) tracking.TrackingNumber = primary.TrackingNumber;
            if (tracking.Carrier.Length == 0) tracking.Carrier = primary.Carrier;
            if (tracking.Status.Length == 0) tracking.Status = primary.Status;
        }

        private static bool SameLazadaPackageId(string left, string right)
        {
            if (string.Equals(left, right, StringComparison.OrdinalIgnoreCase))
                return true;
            if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right))
                return false;

            static string RemoveSellerFleetPrefix(string value)
            {
                var normalized = value.Trim();
                return normalized.StartsWith("SOF_", StringComparison.OrdinalIgnoreCase)
                    ? normalized[4..]
                    : normalized;
            }

            return string.Equals(
                RemoveSellerFleetPrefix(left),
                RemoveSellerFleetPrefix(right),
                StringComparison.OrdinalIgnoreCase);
        }

        internal static string BuildRequestUri(string apiPath, string queryString)
        {
            // The signing path must retain its leading slash, but the request URI
            // must be relative so HttpClient preserves the `/rest/` base path.
            return $"{apiPath.TrimStart('/')}?{queryString}";
        }
    }
}
