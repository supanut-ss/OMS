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
                var response = await client.GetAsync($"{apiPath}?{queryString}");
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
                var response = await client.GetAsync($"{apiPath}?{queryString}");
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
                var response = await client.GetAsync($"{apiPath}?{queryString}");
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

            return new UnifiedOrder
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

            return unified;
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
                var resp = await client.GetAsync($"{apiPath}?{qs}");
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
                var resp = await client.PostAsync($"{apiPath}?{qs}", null);
                return resp.IsSuccessStatusCode;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ Lazada: Error updating stock"); return false; }
        }

        // ── Shipping ──────────────────────────────────────

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(string accessToken, string? shopId, string orderId, string? packageId, string documentType)
        {
            _logger.LogInformation("🏪 Lazada: Getting shipping label for order {OrderId}", orderId);
            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/order/document/get";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" },
                { "order_id", orderId }, { "document_type", "shippingLabel" }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var resp = await client.GetAsync($"{apiPath}?{qs}");
                var content = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode) return null;

                var json = JsonDocument.Parse(content);
                if (json.RootElement.TryGetProperty("data", out var data) &&
                    data.TryGetProperty("document", out var doc))
                {
                    return new ShippingLabelResult
                    {
                        Platform = PlatformType.Lazada,
                        OrderId = orderId,
                        DocumentUrl = doc.TryGetProperty("file", out var file) ? file.GetString() ?? "" : "",
                        ContentType = "application/pdf",
                        Status = "READY"
                    };
                }
                return null;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ Lazada: Error getting shipping label"); return null; }
        }

        public async Task<bool> ShipOrderAsync(string accessToken, string? shopId, ShipOrderRequest request)
        {
            _logger.LogInformation("🏪 Lazada: Shipping order {OrderId}", request.OrderId);
            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/order/pack";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" },
                { "shipping_provider", request.ShippingProviderId ?? "" },
                { "order_item_ids", $"[{request.OrderId}]" }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try { var resp = await client.PostAsync($"{apiPath}?{qs}", null); return resp.IsSuccessStatusCode; }
            catch (Exception ex) { _logger.LogError(ex, "❌ Lazada: Error shipping order"); return false; }
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(string accessToken, string? shopId)
        {
            _logger.LogInformation("🏪 Lazada: Getting shipping providers");
            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/logistics/buyer/providers";
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
                var resp = await client.GetAsync($"{apiPath}?{qs}");
                var content = await resp.Content.ReadAsStringAsync();

                if (resp.IsSuccessStatusCode)
                {
                    var json = JsonDocument.Parse(content);
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
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Lazada: Error fetching shipping providers from API, using fallback list");
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

        public async Task<TrackingInfo?> GetTrackingInfoAsync(string accessToken, string? shopId, string orderId)
        {
            _logger.LogInformation("🏪 Lazada: Getting tracking for order {OrderId}", orderId);
            var client = _httpClientFactory.CreateClient("Lazada");
            var apiPath = "/logistic/order/trace";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _appKey }, { "timestamp", timestamp },
                { "access_token", accessToken }, { "sign_method", "sha256" },
                { "order_id", orderId }
            };

            var sign = SignatureHelper.GenerateLazadaSignature(_appSecret, apiPath, parameters);
            parameters["sign"] = sign;
            var qs = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

            try
            {
                var resp = await client.GetAsync($"{apiPath}?{qs}");
                var content = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode) return null;

                var json = JsonDocument.Parse(content);
                var tracking = new TrackingInfo { Platform = PlatformType.Lazada, OrderId = orderId };

                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    tracking.TrackingNumber = data.TryGetProperty("tracking_number", out var tn) ? tn.GetString() ?? "" : "";
                    if (data.TryGetProperty("packages", out var pkgs))
                    {
                        foreach (var evt in pkgs.EnumerateArray())
                        {
                            tracking.Events.Add(new TrackingEvent
                            {
                                Description = evt.TryGetProperty("description", out var desc) ? desc.GetString() ?? "" : "",
                                Timestamp = evt.TryGetProperty("timestamp", out var ts)
                                    ? DateTime.TryParse(ts.GetString(), out var tsd) ? tsd : DateTime.MinValue : DateTime.MinValue
                            });
                        }
                    }
                }
                return tracking;
            }
            catch (Exception ex) { _logger.LogError(ex, "❌ Lazada: Error getting tracking"); return null; }
        }
    }
}
