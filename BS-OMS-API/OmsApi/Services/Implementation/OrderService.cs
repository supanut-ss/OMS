using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Models.Orders;
using OmsApi.Models.Persistence;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation
{
    /// <summary>
    /// Unified order service that aggregates data from all platforms
    /// </summary>
    public class OrderService : IOrderService
    {
        private const string SystemUser = "OMS_API";
        private readonly IPlatformClientFactory _clientFactory;
        private readonly IPlatformCredentialService _credentialService;
        private readonly ApplicationDbContext _db;
        private readonly ILogger<OrderService> _logger;

        public OrderService(
            IPlatformClientFactory clientFactory,
            IPlatformCredentialService credentialService,
            ApplicationDbContext db,
            ILogger<OrderService> logger)
        {
            _clientFactory = clientFactory;
            _credentialService = credentialService;
            _db = db;
            _logger = logger;
        }

        public async Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(OrderFilter filter)
        {
            if (!filter.Platform.HasValue)
                throw new ArgumentException("Platform is required for single-platform query");

            var platform = filter.Platform.Value;
            var client = _clientFactory.GetClient(platform);
            return await _credentialService.ExecuteAsync(
                platform,
                filter.ShopId,
                async credential =>
                {
                    filter.AccessToken = credential.AccessToken;
                    filter.ShopId = credential.ShopId;
                    var result = await client.GetOrdersAsync(
                        credential.AccessToken,
                        credential.ShopId,
                        filter);
                    await SyncOrdersAsync(platform, credential.ShopId, result.Items);
                    return result;
                });
        }

        public async Task<UnifiedOrder?> GetOrderDetailAsync(PlatformType platform, string orderId, string? shopId = null)
        {
            var client = _clientFactory.GetClient(platform);
            return await _credentialService.ExecuteAsync(
                platform,
                shopId,
                async credential =>
                {
                    var order = await client.GetOrderDetailAsync(
                        credential.AccessToken,
                        credential.ShopId,
                        orderId);
                    if (order != null)
                        await SyncOrdersAsync(platform, credential.ShopId, new[] { order });
                    return order;
                });
        }

        public async Task<List<UnifiedOrder>> GetOrdersFromAllPlatformsAsync(OrderFilter filter)
        {
            var selections = filter.PlatformCredentials?.Count > 0
                ? filter.PlatformCredentials
                    .Select(x => new PlatformCredentialSelection(x.Platform, x.ShopId ?? string.Empty))
                    .ToList()
                : (await _credentialService.GetActiveCredentialSelectionsAsync()).ToList();
            if (selections.Count == 0)
                throw new PlatformCredentialException(
                    "CREDENTIAL_NOT_FOUND",
                    "No active platform credentials were found.");

            var allOrders = new List<UnifiedOrder>();
            var tasks = new List<Task<(PlatformType Platform, string? ShopId, PaginatedResult<UnifiedOrder> Result)>>();

            foreach (var selection in selections)
            {
                var platformFilter = new OrderFilter
                {
                    Platform = selection.Platform,
                    ShopId = string.IsNullOrWhiteSpace(selection.ShopId) ? null : selection.ShopId,
                    Status = filter.Status,
                    DateFrom = filter.DateFrom,
                    DateTo = filter.DateTo,
                    Page = filter.Page,
                    PageSize = filter.PageSize
                };

                var client = _clientFactory.GetClient(selection.Platform);
                tasks.Add(FetchAsync(selection, client, platformFilter));
            }

            try
            {
                var results = await Task.WhenAll(tasks);
                foreach (var (platform, shopId, result) in results)
                {
                    allOrders.AddRange(result.Items);
                    await SyncOrdersAsync(platform, shopId, result.Items);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching orders from all platforms");
            }

            // Sort by creation date descending
            return allOrders.OrderByDescending(o => o.CreatedAt).ToList();

            async Task<(PlatformType, string?, PaginatedResult<UnifiedOrder>)> FetchAsync(
                PlatformCredentialSelection selection,
                IPlatformClient client,
                OrderFilter platformFilter)
            {
                return await _credentialService.ExecuteAsync(
                    selection.Platform,
                    string.IsNullOrWhiteSpace(selection.ShopId) ? null : selection.ShopId,
                    async credential =>
                    {
                        platformFilter.AccessToken = credential.AccessToken;
                        platformFilter.ShopId = credential.ShopId;
                        var result = await client.GetOrdersAsync(
                            credential.AccessToken,
                            credential.ShopId,
                            platformFilter);
                        return (selection.Platform, (string?)credential.ShopId, result);
                    });
            }
        }

        public async Task<List<UnifiedOrder>> GetOrdersNearCancellationAsync(OrderFilter filter, int daysThreshold = 2)
        {
            var allOrders = await GetOrdersFromAllPlatformsAsync(filter);
            return allOrders
                .Where(o => o.CancellationDeadline.HasValue &&
                            o.DaysUntilCancellation.HasValue &&
                            o.DaysUntilCancellation.Value <= daysThreshold &&
                            o.DaysUntilCancellation.Value >= 0 &&
                            o.Status != OrderStatus.Shipped &&
                            o.Status != OrderStatus.Delivered &&
                            o.Status != OrderStatus.Cancelled)
                .OrderBy(o => o.CancellationDeadline)
                .ToList();
        }

        /// <summary>
        /// Upserts fetched orders into t_oms_order/t_oms_order_item, keyed by
        /// (platform, shop_id, platform_order_id). Persisting is a best-effort
        /// local cache of what the platform APIs returned — a write failure
        /// here must never break the read response the caller is waiting on.
        /// </summary>
        private async Task SyncOrdersAsync(PlatformType platform, string? rawShopId, IReadOnlyCollection<UnifiedOrder> orders)
        {
            if (orders.Count == 0)
                return;

            try
            {
                var shopId = PlatformShopIdResolver.Resolve(platform, rawShopId);
                var platformName = platform.ToString();
                var orderIds = orders.Select(o => o.OrderId).ToList();

                var existing = await _db.PlatformOrders
                    .Include(x => x.Items)
                    .Where(x => x.Platform == platformName && x.ShopId == shopId && orderIds.Contains(x.PlatformOrderId))
                    .ToListAsync();
                var existingByOrderId = existing.ToDictionary(x => x.PlatformOrderId);

                var now = DateTime.Now;
                foreach (var order in orders)
                {
                    if (!existingByOrderId.TryGetValue(order.OrderId, out var record))
                    {
                        record = new PlatformOrder
                        {
                            Platform = platformName,
                            ShopId = shopId,
                            PlatformOrderId = order.OrderId,
                            CreateBy = SystemUser,
                            CreateDate = now
                        };
                        _db.PlatformOrders.Add(record);
                        existingByOrderId[order.OrderId] = record;
                    }

                    MapToRecord(order, record, now);

                    // Replace items wholesale; this table is a read-through
                    // cache, not a system of record, so there is no history
                    // to preserve on the line items.
                    if (record.Items.Count > 0)
                        _db.PlatformOrderItems.RemoveRange(record.Items);
                    record.Items.Clear();
                    foreach (var item in order.Items)
                    {
                        record.Items.Add(new PlatformOrderItem
                        {
                            PlatformItemId = item.ItemId,
                            ModelId = item.ModelId,
                            PlatformOrderItemId = item.OrderItemId,
                            PromotionGroupId = item.PromotionGroupId,
                            Sku = item.Sku,
                            ItemName = item.Name,
                            Quantity = item.Quantity,
                            UnitPrice = item.UnitPrice,
                            TotalPrice = item.TotalPrice,
                            Discount = item.Discount,
                            ImageUrl = item.ImageUrl,
                            Variation = item.Variation,
                            Weight = item.Weight,
                            CreateDate = now
                        });
                    }
                }

                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to sync {Count} order(s) for {Platform} into t_oms_order", orders.Count, platform);
            }
        }

        private static void MapToRecord(UnifiedOrder order, PlatformOrder record, DateTime now)
        {
            record.ShopName = order.ShopName;
            record.Status = order.Status.ToString();
            record.OriginalStatus = order.OriginalStatus;
            record.BuyerName = order.BuyerName;
            record.BuyerRemarks = order.BuyerRemarks;
            record.TaxInvoiceRequested = order.TaxInvoiceRequested;
            record.TaxInvoiceTaxId = order.TaxInvoice?.TaxId;
            record.TaxInvoiceCompanyName = order.TaxInvoice?.CompanyName;
            record.TaxInvoiceAddress = order.TaxInvoice?.Address;
            record.TaxInvoiceBranchCode = order.TaxInvoice?.BranchCode;
            record.CancellationDeadline = order.CancellationDeadline;
            record.OrderCreatedDate = order.CreatedAt;
            record.OrderUpdatedDate = order.UpdatedAt;
            record.TotalAmount = order.TotalAmount;
            record.Currency = order.Currency;

            var shipping = order.Shipping;
            record.ShippingCarrier = shipping?.Carrier;
            record.TrackingNumber = shipping?.TrackingNumber;
            record.PackageNumber = shipping?.PackageNumber;
            record.ShippingMethod = shipping?.ShippingMethod;
            record.ShippingFee = shipping?.ShippingFee;
            record.EstimatedDeliveryDate = shipping?.EstimatedDeliveryDate;

            var recipient = shipping?.RecipientAddress;
            record.RecipientName = recipient?.Name;
            record.RecipientPhone = recipient?.Phone;
            record.RecipientAddressLine1 = recipient?.AddressLine1;
            record.RecipientAddressLine2 = recipient?.AddressLine2;
            record.RecipientSubDistrict = recipient?.SubDistrict;
            record.RecipientDistrict = recipient?.District;
            record.RecipientProvince = recipient?.Province;
            record.RecipientPostalCode = recipient?.PostalCode;
            record.RecipientCountry = recipient?.Country;
            record.RecipientFullAddress = recipient?.FullAddress;

            record.SyncStatus = "SYNCED";
            record.LastSyncDate = now;
            record.UpdateBy = SystemUser;
            record.UpdateDate = now;
        }
    }
}
