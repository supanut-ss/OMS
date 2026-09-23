using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

/// <summary>
/// Coordinates the existing WMS packing tables with the OMS platform-package
/// tables. Platform-specific clients remain responsible for calling the
/// external APIs; this service owns the durable WMS/package correlation.
/// </summary>
public class PlatformPackageService : IPlatformPackageService
{
    private const string SystemUser = "OMS_API";
    private readonly ApplicationDbContext _db;
    private readonly ILogger<PlatformPackageService> _logger;

    public PlatformPackageService(ApplicationDbContext db, ILogger<PlatformPackageService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<WmsPackageManifest?> GetWmsPackageManifestAsync(
        string customerOrderNumber,
        PlatformType? platform = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(customerOrderNumber))
            return null;

        var orders = await _db.WmsOutboundMasters
            .AsNoTracking()
            .Where(x => x.CustomerOrderNumber == customerOrderNumber)
            .ToListAsync(cancellationToken);

        var candidates = platform.HasValue
            ? orders.Where(x => PlatformMatches(x.Platform, platform.Value)).ToList()
            : orders;
        var order = candidates.Count == 1 ? candidates[0] : null;

        if (order == null)
        {
            _logger.LogWarning(
                "WMS outbound order not found or ambiguous for customer order {CustomerOrderNumber} / platform {Platform}",
                customerOrderNumber, platform?.ToString() ?? "(not specified)");
            return null;
        }

        var masters = await _db.WmsOutboundPackingMasters
            .AsNoTracking()
            .Where(x => x.OutboundOrderMasterId == order.OutboundOrderMasterId)
            .OrderBy(x => x.BoxNumber)
            .ToListAsync(cancellationToken);

        if (masters.Count == 0)
            return new WmsPackageManifest
            {
                CustomerOrderNumber = order.CustomerOrderNumber,
                OutboundOrderNumber = order.OutboundOrderNumber,
                OutboundOrderMasterId = order.OutboundOrderMasterId,
                Platform = ToPlatformType(order.Platform)
            };

        // Use a relational join instead of translating an in-memory Contains
        // collection. EF Core otherwise emits an OPENJSON query with a '$'
        // path, which is not supported by the compatibility level of the WMS
        // SQL Server database.
        var details = await (
                from detail in _db.WmsOutboundPackingDetails.AsNoTracking()
                join master in _db.WmsOutboundPackingMasters.AsNoTracking()
                    on detail.OutboundSortMasterId equals master.OutboundSortMasterId
                where master.OutboundOrderMasterId == order.OutboundOrderMasterId
                orderby detail.ItemNumber
                select detail)
            .ToListAsync(cancellationToken);
        var detailsByPackage = details
            .GroupBy(x => x.OutboundSortMasterId)
            .ToDictionary(x => x.Key, x => x.ToList());

        return new WmsPackageManifest
        {
            CustomerOrderNumber = order.CustomerOrderNumber,
            OutboundOrderNumber = order.OutboundOrderNumber,
            OutboundOrderMasterId = order.OutboundOrderMasterId,
            Platform = ToPlatformType(order.Platform),
            Packages = masters.Select(master => new WmsPackageManifestPackage
            {
                WmsPackageRef = master.OutboundSortMasterId,
                BoxNumber = master.BoxNumber,
                CarrierId = master.CarrierId,
                TrackingNumber = master.TrackingNo ?? string.Empty,
                IsCloseBox = master.IsCloseBox ?? string.Empty,
                TotalWeight = master.TotalWeight,
                BoxSize = master.BoxSize ?? string.Empty,
                Items = detailsByPackage.TryGetValue(master.OutboundSortMasterId, out var packageDetails)
                    ? packageDetails.Select(detail => new WmsPackageManifestItem
                    {
                        WmsItemMasterId = detail.WhItemMasterId,
                        ItemMasterId = detail.ItemMasterId,
                        ItemNumber = detail.ItemNumber,
                        ItemDescription = detail.ItemDescription ?? string.Empty,
                        Quantity = Convert.ToDecimal(detail.QuantitySort),
                        Uom = detail.Uom ?? string.Empty,
                        LotNumber = detail.LotNumber ?? string.Empty
                    }).ToList()
                    : new List<WmsPackageManifestItem>()
            }).ToList()
        };
    }

    public async Task<ProcessPlatformPackagesResult> PreparePackagesAsync(
        ProcessPlatformPackagesRequest request,
        WmsPackageManifest manifest,
        CancellationToken cancellationToken = default)
    {
        request.ShopId = PlatformShopIdResolver.Resolve(request.Platform, request.ShopId);
        var platformName = request.Platform.ToString();
        var shopId = request.ShopId.Trim();
        var platformOrderId = request.PlatformOrderId.Trim();
        var customerOrderNumber = request.CustomerOrderNumber.Trim();

        if (manifest.OutboundOrderMasterId == Guid.Empty)
            throw new InvalidOperationException("WMS outbound order reference is missing.");

        // Load by the scalar outbound order id rather than an in-memory
        // Contains collection so this remains compatible with the WMS SQL
        // Server compatibility level.
        var existingRecords = await _db.PlatformPackages
            .Where(x => x.Platform == platformName &&
                        x.ShopId == shopId &&
                        x.OutboundOrderMasterId == manifest.OutboundOrderMasterId)
            .ToListAsync(cancellationToken);
        var recordsByPackage = existingRecords.ToDictionary(x => x.OutboundSortMasterId);
        var orderRecordId = await ResolveOrderRecordIdAsync(platformName, shopId, platformOrderId, cancellationToken);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            foreach (var package in manifest.Packages)
            {
                if (!recordsByPackage.TryGetValue(package.WmsPackageRef, out var record))
                {
                    record = new PlatformPackage
                    {
                        Platform = platformName,
                        ShopId = shopId,
                        OutboundOrderMasterId = manifest.OutboundOrderMasterId,
                        OutboundSortMasterId = package.WmsPackageRef,
                        CreateBy = SystemUser,
                        CreateDate = DateTime.Now
                    };
                    _db.PlatformPackages.Add(record);
                    recordsByPackage[package.WmsPackageRef] = record;
                }

                record.PlatformOrderId = platformOrderId;
                record.CustomerOrderNumber = customerOrderNumber;
                // The order sync may run before or after packages are prepared,
                // so only overwrite the link when we actually found a match —
                // never erase a link a later order sync already resolved.
                if (orderRecordId.HasValue)
                    record.OrderRecordId = orderRecordId;
                record.BoxNumber = package.BoxNumber;
                // Preparing a retry must never erase a package id or tracking
                // number that a previous platform call already returned.
                if (string.IsNullOrWhiteSpace(record.TrackingNumber))
                {
                    if (string.IsNullOrWhiteSpace(record.PlatformPackageId))
                    {
                        if (!string.Equals(record.PackageStatus, "ARRANGED", StringComparison.OrdinalIgnoreCase))
                        {
                            record.PackageStatus = "PENDING";
                            record.SyncStatus = "PENDING";
                        }
                        else
                        {
                            record.SyncStatus = "PROCESSING";
                        }
                    }
                    else
                    {
                        // A package id means split/creation already succeeded.
                        // Preserve ARRANGED (or another platform status) and
                        // continue polling instead of resetting the retry.
                        if (record.PackageStatus is "FAILED" or "ERROR" or "PENDING")
                            record.PackageStatus = "CREATED";
                        record.SyncStatus = "PROCESSING";
                    }
                }
                record.LastError = null;
                record.UpdateBy = SystemUser;
                record.UpdateDate = DateTime.Now;

                if (record.PlatformPackageRecordId != 0)
                {
                    var oldItems = await _db.PlatformPackageItems
                        .Where(x => x.PlatformPackageRecordId == record.PlatformPackageRecordId)
                        .ToListAsync(cancellationToken);
                    var packageIsFrozen =
                        !string.IsNullOrWhiteSpace(record.PlatformPackageId) ||
                        string.Equals(record.PackageStatus, "ARRANGED", StringComparison.OrdinalIgnoreCase) ||
                        !string.IsNullOrWhiteSpace(record.TrackingNumber);
                    if (packageIsFrozen &&
                        oldItems.Count > 0 &&
                        !SamePersistedItemQuantities(oldItems, package.Items))
                    {
                        throw new InvalidOperationException(
                            $"WMS box {package.BoxNumber} was changed after its platform package was created or arranged. " +
                            "Automatic split/arrange retry was stopped; manual recovery is required.");
                    }
                    if (oldItems.Count > 0)
                        _db.PlatformPackageItems.RemoveRange(oldItems);
                }

                foreach (var item in package.Items)
                {
                    _db.PlatformPackageItems.Add(new PlatformPackageItem
                    {
                        PlatformPackage = record,
                        WmsItemMasterId = item.WmsItemMasterId,
                        ItemNumber = item.ItemNumber,
                        Quantity = item.Quantity,
                        CreateBy = SystemUser,
                        CreateDate = DateTime.Now
                    });
                }
            }

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        var result = new ProcessPlatformPackagesResult
        {
            Platform = request.Platform,
            ShopId = shopId,
            PlatformOrderId = platformOrderId,
            CustomerOrderNumber = customerOrderNumber,
            Stage = "PREPARED",
            TotalBoxes = manifest.Packages.Count,
            Packages = manifest.Packages.Select(package =>
            {
                var record = recordsByPackage[package.WmsPackageRef];
                return new ProcessPlatformPackageResult
                {
                    PlatformPackageRecordId = record.PlatformPackageRecordId,
                    WmsPackageRef = package.WmsPackageRef,
                    BoxNumber = package.BoxNumber,
                    ItemCount = package.Items.Count,
                    TotalQuantity = package.Items.Sum(item => item.Quantity),
                    PlatformPackageId = record.PlatformPackageId,
                    TrackingNumber = record.TrackingNumber ?? string.Empty,
                    Status = record.SyncStatus
                };
            }).ToList()
        };

        _logger.LogInformation(
            "Prepared {BoxCount} WMS packages for {Platform} order {OrderId}",
            result.TotalBoxes,
            platformName,
            platformOrderId);
        return result;
    }

    /// <summary>
    /// Looks up the t_oms_order row matching a platform order, if it has been
    /// synced there yet. Packages may be created before the order sync runs,
    /// so callers must tolerate a null result.
    /// </summary>
    private async Task<long?> ResolveOrderRecordIdAsync(
        string platformName, string shopId, string platformOrderId, CancellationToken cancellationToken)
    {
        return await _db.PlatformOrders
            .Where(x => x.Platform == platformName && x.ShopId == shopId && x.PlatformOrderId == platformOrderId)
            .Select(x => (long?)x.OrderRecordId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task MarkPackagesFailedAsync(
        ProcessPlatformPackagesRequest request,
        string error,
        CancellationToken cancellationToken = default)
    {
        request.ShopId = PlatformShopIdResolver.Resolve(request.Platform, request.ShopId);
        var platformName = request.Platform.ToString();
        var shopId = request.ShopId.Trim();
        var orderId = request.PlatformOrderId.Trim();
        var rows = await _db.PlatformPackages
            .Where(x => x.Platform == platformName &&
                        x.ShopId == shopId &&
                        x.PlatformOrderId == orderId)
            .ToListAsync(cancellationToken);
        var now = DateTime.Now;
        foreach (var row in rows.Where(x => string.IsNullOrWhiteSpace(x.TrackingNumber)))
        {
            row.PackageStatus = "FAILED";
            row.SyncStatus = "FAILED";
            row.AttemptCount += 1;
            row.LastSyncDate = now;
            row.LastError = error.Length <= 2000 ? error : error[..2000];
            row.UpdateBy = SystemUser;
            row.UpdateDate = now;
        }
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<SyncPlatformPackagesResult> SyncPackagesAsync(
        SyncPlatformPackagesRequest request,
        CancellationToken cancellationToken = default)
    {
        request.ShopId = PlatformShopIdResolver.Resolve(request.Platform, request.ShopId);
        var platformName = request.Platform.ToString();
        var result = new SyncPlatformPackagesResult
        {
            Platform = request.Platform,
            PlatformOrderId = request.PlatformOrderId,
            CustomerOrderNumber = request.CustomerOrderNumber,
            TotalPackages = request.Packages.Count
        };

        if (request.Packages.Count == 0)
            throw new ArgumentException("At least one package is required.", nameof(request.Packages));

        var duplicateTrackingNumbers = request.Packages
            .Where(x => !string.IsNullOrWhiteSpace(x.TrackingNumber))
            .GroupBy(x => x.TrackingNumber!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Where(x => x.Count() > 1)
            .Select(x => x.Key)
            .ToList();
        if (duplicateTrackingNumbers.Count > 0)
            throw new InvalidOperationException(
                "The same tracking number cannot be assigned to more than one WMS package.");

        var packageRefs = request.Packages.Select(x => x.WmsPackageRef).ToList();
        if (packageRefs.Any(x => x == Guid.Empty) || packageRefs.Count != packageRefs.Distinct().Count())
            throw new ArgumentException("Each package must contain a unique, non-empty wms_package_ref.", nameof(request.Packages));

        var orders = await _db.WmsOutboundMasters
            .AsNoTracking()
            .Where(x => x.CustomerOrderNumber == request.CustomerOrderNumber)
            .ToListAsync(cancellationToken);
        var matchingOrders = orders.Where(x => PlatformMatches(x.Platform, request.Platform)).ToList();
        var wmsOrder = matchingOrders.Count == 1 ? matchingOrders[0] : null;
        if (wmsOrder == null)
            throw new InvalidOperationException(
                $"WMS outbound order for customer order '{request.CustomerOrderNumber}' and platform '{platformName}' was not found.");

        // Load tracked rows because the same transaction updates WMS tracking_no
        // after the platform result has been persisted.
        var packageRefSet = packageRefs.ToHashSet();
        var wmsMasters = (await _db.WmsOutboundPackingMasters
                .Where(x => x.OutboundOrderMasterId == wmsOrder.OutboundOrderMasterId)
                .ToListAsync(cancellationToken))
            .Where(x => packageRefSet.Contains(x.OutboundSortMasterId))
            .ToList();
        if (wmsMasters.Count != packageRefs.Count ||
            wmsMasters.Any(x => x.OutboundOrderMasterId != wmsOrder.OutboundOrderMasterId))
            throw new InvalidOperationException(
                "One or more wms_package_ref values do not belong to the requested customer order.");

        var details = await (
                from detail in _db.WmsOutboundPackingDetails.AsNoTracking()
                join master in _db.WmsOutboundPackingMasters.AsNoTracking()
                    on detail.OutboundSortMasterId equals master.OutboundSortMasterId
                where master.OutboundOrderMasterId == wmsOrder.OutboundOrderMasterId
                select detail)
            .ToListAsync(cancellationToken);
        details = details.Where(x => packageRefSet.Contains(x.OutboundSortMasterId)).ToList();
        var detailsByPackage = details
            .GroupBy(x => x.OutboundSortMasterId)
            .ToDictionary(x => x.Key, x => x.ToList());

        var existingRecords = (await _db.PlatformPackages
                .Where(x => x.Platform == platformName &&
                            x.ShopId == request.ShopId &&
                            x.OutboundOrderMasterId == wmsOrder.OutboundOrderMasterId)
                .ToListAsync(cancellationToken))
            .Where(x => packageRefSet.Contains(x.OutboundSortMasterId))
            .ToList();
        var recordsByPackage = existingRecords.ToDictionary(x => x.OutboundSortMasterId);
        var wmsMastersByPackage = wmsMasters.ToDictionary(x => x.OutboundSortMasterId);
        var orderRecordId = await ResolveOrderRecordIdAsync(platformName, request.ShopId, request.PlatformOrderId, cancellationToken);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            foreach (var packageRequest in request.Packages)
            {
                var wmsMaster = wmsMastersByPackage[packageRequest.WmsPackageRef];
                var hasTracking = !string.IsNullOrWhiteSpace(packageRequest.TrackingNumber);
                var hasPlatformPackage = !string.IsNullOrWhiteSpace(packageRequest.PlatformPackageId);
                var requestedStatus = packageRequest.PackageStatus?.Trim().ToUpperInvariant();
                var hasError = !string.IsNullOrWhiteSpace(packageRequest.Error) ||
                               requestedStatus is "FAILED" or "ERROR";

                if (!recordsByPackage.TryGetValue(packageRequest.WmsPackageRef, out var record))
                {
                    record = new PlatformPackage
                    {
                        Platform = platformName,
                        ShopId = request.ShopId,
                        PlatformOrderId = request.PlatformOrderId,
                        CustomerOrderNumber = request.CustomerOrderNumber,
                        OutboundOrderMasterId = wmsOrder.OutboundOrderMasterId,
                        OutboundSortMasterId = wmsMaster.OutboundSortMasterId,
                        BoxNumber = packageRequest.BoxNumber ?? wmsMaster.BoxNumber,
                        PackageStatus = "PENDING",
                        SyncStatus = "PENDING",
                        CreateBy = SystemUser,
                        CreateDate = DateTime.Now
                    };
                    _db.PlatformPackages.Add(record);
                    recordsByPackage[record.OutboundSortMasterId] = record;
                }

                record.PlatformOrderId = request.PlatformOrderId;
                record.CustomerOrderNumber = request.CustomerOrderNumber;
                record.BoxNumber = packageRequest.BoxNumber ?? wmsMaster.BoxNumber;
                if (orderRecordId.HasValue)
                    record.OrderRecordId = orderRecordId;
                // Treat omitted values as "not changed" so a retry that only
                // supplies a newly available tracking number does not erase a
                // previously persisted package id or carrier.
                if (hasPlatformPackage)
                    record.PlatformPackageId = packageRequest.PlatformPackageId!.Trim();
                if (hasTracking)
                    record.TrackingNumber = packageRequest.TrackingNumber!.Trim();
                if (!string.IsNullOrWhiteSpace(packageRequest.ShippingProviderId))
                    record.ShippingProviderId = packageRequest.ShippingProviderId.Trim();
                if (!string.IsNullOrWhiteSpace(packageRequest.ShippingProviderName))
                    record.ShippingProviderName = packageRequest.ShippingProviderName.Trim();

                var preserveAcceptedShopeeArrange =
                    request.Platform == PlatformType.Shopee &&
                    !hasTracking &&
                    !hasError &&
                    string.Equals(record.PackageStatus, "ARRANGED", StringComparison.OrdinalIgnoreCase);
                if (!string.IsNullOrWhiteSpace(requestedStatus) && !preserveAcceptedShopeeArrange)
                    record.PackageStatus = requestedStatus;
                else if (hasTracking)
                    record.PackageStatus = "SHIPPED";
                else if (hasPlatformPackage && string.Equals(record.PackageStatus, "PENDING", StringComparison.OrdinalIgnoreCase))
                    record.PackageStatus = "CREATED";

                record.SyncStatus = hasError ? "FAILED" : hasTracking
                    ? "SUCCESS"
                    : hasPlatformPackage ? "PROCESSING" : record.SyncStatus;
                record.AttemptCount += 1;
                record.LastSyncDate = DateTime.Now;
                record.LastError = string.IsNullOrWhiteSpace(packageRequest.Error)
                    ? null : packageRequest.Error.Trim();
                record.UpdateBy = SystemUser;
                record.UpdateDate = DateTime.Now;

                // WMS owns the physical box. Keep its tracking_no in sync with
                // the platform result, but never erase an existing value when
                // the platform response is still pending.
                if (request.PersistTrackingToWms &&
                    hasTracking &&
                    !string.Equals(wmsMaster.TrackingNo, packageRequest.TrackingNumber, StringComparison.Ordinal))
                {
                    wmsMaster.TrackingNo = packageRequest.TrackingNumber;
                    wmsMaster.UpdateBy = SystemUser;
                    wmsMaster.UpdateDate = DateTime.Now;
                }

                if (packageRequest.Items.Count > 0)
                {
                    var oldItems = await _db.PlatformPackageItems
                        .Where(x => x.PlatformPackageRecordId == record.PlatformPackageRecordId)
                        .ToListAsync(cancellationToken);
                    if (oldItems.Count > 0)
                        _db.PlatformPackageItems.RemoveRange(oldItems);

                    var packageDetails = detailsByPackage.TryGetValue(packageRequest.WmsPackageRef, out var foundDetails)
                        ? foundDetails
                        : new List<WmsOutboundPackingDetail>();

                    foreach (var itemRequest in packageRequest.Items)
                    {
                        var detail = packageDetails.FirstOrDefault(x =>
                            (!itemRequest.WmsItemMasterId.HasValue || x.WhItemMasterId == itemRequest.WmsItemMasterId.Value) &&
                            string.Equals(x.ItemNumber, itemRequest.ItemNumber, StringComparison.OrdinalIgnoreCase));
                        if (detail == null)
                            throw new InvalidOperationException(
                                $"Item '{itemRequest.ItemNumber}' is not assigned to WMS package '{packageRequest.WmsPackageRef}'.");

                        _db.PlatformPackageItems.Add(new PlatformPackageItem
                        {
                            PlatformPackage = record,
                            PlatformItemId = itemRequest.PlatformItemId,
                            PlatformSkuId = itemRequest.PlatformSkuId,
                            WmsItemMasterId = detail.WhItemMasterId,
                            ItemNumber = detail.ItemNumber,
                            Quantity = itemRequest.Quantity,
                            CreateBy = SystemUser,
                            CreateDate = DateTime.Now
                        });
                    }
                }
            }

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        foreach (var packageRequest in request.Packages)
        {
            var record = recordsByPackage[packageRequest.WmsPackageRef];
            result.Packages.Add(ToResult(record));
        }

        result.SucceededPackages = result.Packages.Count(x => x.SyncStatus == "SUCCESS");
        result.FailedPackages = result.Packages.Count(x => x.SyncStatus == "FAILED");
        return result;
    }

    public async Task<SyncPlatformPackagesResult> SyncTrackingAsync(
        SyncPlatformTrackingRequest request,
        TrackingInfo tracking,
        CancellationToken cancellationToken = default)
    {
        request.ShopId = PlatformShopIdResolver.Resolve(request.Platform, request.ShopId);
        var manifest = await GetWmsPackageManifestAsync(
            request.CustomerOrderNumber, request.Platform, cancellationToken);
        if (manifest == null || manifest.Packages.Count == 0)
            throw new InvalidOperationException(
                $"No WMS packing boxes were found for customer order '{request.CustomerOrderNumber}'.");

        var platformPackages = tracking.Packages.Count > 0
            ? tracking.Packages
            : new List<ShippingPackage>
            {
                new()
                {
                    TrackingNumber = tracking.TrackingNumber,
                    Carrier = tracking.Carrier,
                    Status = tracking.Status
                }
            };
        if (platformPackages.Count == 0)
            throw new InvalidOperationException("The platform did not return any package or tracking information.");

        var mappings = request.PackageMappings ?? new List<PlatformPackageMappingRequest>();
        var assignments = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);

        if (platformPackages.Count == 1 && manifest.Packages.Count == 1)
        {
            var singleMapping = mappings.Count == 1 ? mappings[0] : null;
            assignments[PackageKey(platformPackages[0], 0)] =
                singleMapping != null && singleMapping.WmsPackageRef != Guid.Empty
                    ? singleMapping.WmsPackageRef
                    : manifest.Packages[0].WmsPackageRef;
        }
        else
        {
            // On retries, reuse a mapping that was already persisted instead
            // of forcing the caller to send the same package map again.
                if (mappings.Count == 0)
                {
                // First-time synchronization may not have a PlatformPackageId
                // in OMS yet. Resolve a split Lazada/Seller Own Fleet response
                // from the SKU and quantity on each platform package before
                // falling back to previously persisted mappings.
                if (TryBuildItemBasedMappings(platformPackages, manifest.Packages, out var itemMappings))
                    mappings = itemMappings;
            }

            if (mappings.Count == 0)
            {
                var savedRecords = await _db.PlatformPackages
                    .AsNoTracking()
                    .Where(x => x.Platform == request.Platform.ToString() &&
                                x.ShopId == request.ShopId &&
                                x.PlatformOrderId == request.PlatformOrderId &&
                                x.PlatformPackageId != null)
                    .ToListAsync(cancellationToken);
                var savedByPlatformId = savedRecords
                    .GroupBy(
                        x => NormalizePackageId(request.Platform, x.PlatformPackageId!),
                        StringComparer.OrdinalIgnoreCase)
                    .Where(x => x.Count() == 1)
                    .ToDictionary(x => x.Key, x => x.Single().OutboundSortMasterId, StringComparer.OrdinalIgnoreCase);
                if (platformPackages.All(x =>
                        !string.IsNullOrWhiteSpace(x.PackageId) &&
                        savedByPlatformId.ContainsKey(NormalizePackageId(request.Platform, x.PackageId))))
                {
                    mappings = platformPackages
                        .Select(x => new PlatformPackageMappingRequest
                        {
                            PlatformPackageId = x.PackageId,
                            WmsPackageRef = savedByPlatformId[
                                NormalizePackageId(request.Platform, x.PackageId!)]
                        })
                        .ToList();
                }
            }

            if (mappings.Count != platformPackages.Count ||
                mappings.Any(x => x.WmsPackageRef == Guid.Empty || string.IsNullOrWhiteSpace(x.PlatformPackageId)))
            {
                _logger.LogWarning(
                    "Unable to map split {Platform} packages for order {OrderId}. Platform item values: {PlatformItems}; WMS item values: {WmsItems}",
                    request.Platform,
                    request.PlatformOrderId,
                    string.Join(", ", platformPackages.SelectMany(x => x.Items)
                        .Select(x => string.IsNullOrWhiteSpace(x.ItemNumber) ? string.Join("/", x.ItemNumberAliases) : x.ItemNumber)
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Distinct(StringComparer.OrdinalIgnoreCase)),
                    string.Join(", ", manifest.Packages.SelectMany(x => x.Items)
                        .Select(x => x.ItemNumber)
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Distinct(StringComparer.OrdinalIgnoreCase)));
                throw new InvalidOperationException(
                    "OMS could not map the split platform packages to WMS boxes automatically. " +
                    "Ensure each platform package contains its SKU/item number and quantity matching exactly one closed WMS box.");
            }

            var manifestRefs = manifest.Packages.Select(x => x.WmsPackageRef).ToHashSet();
            var mappedRefs = new HashSet<Guid>();
            foreach (var platformPackage in platformPackages.Select((value, index) => new { value, index }))
            {
                var platformPackageId = platformPackage.value.PackageId;
                var mapping = mappings.FirstOrDefault(x =>
                    PackageIdsEqual(request.Platform, x.PlatformPackageId, platformPackageId));
                if (mapping == null)
                    throw new InvalidOperationException(
                        $"No WMS mapping was supplied for platform package '{platformPackageId}'.");
                if (!manifestRefs.Contains(mapping.WmsPackageRef) || !mappedRefs.Add(mapping.WmsPackageRef))
                    throw new InvalidOperationException(
                        "Each platform package must map to a different WMS package belonging to the same customer order.");

                assignments[PackageKey(platformPackage.value, platformPackage.index)] = mapping.WmsPackageRef;
            }
        }

        var syncRequest = new SyncPlatformPackagesRequest
        {
            Platform = request.Platform,
            ShopId = request.ShopId,
            PlatformOrderId = request.PlatformOrderId,
            CustomerOrderNumber = request.CustomerOrderNumber,
            PersistTrackingToWms = request.PersistTrackingToWms,
            Packages = platformPackages.Select((platformPackage, index) => new SyncPlatformPackageRequest
            {
                WmsPackageRef = assignments[PackageKey(platformPackage, index)],
                PlatformPackageId = string.IsNullOrWhiteSpace(platformPackage.PackageId)
                    ? null : platformPackage.PackageId,
                TrackingNumber = string.IsNullOrWhiteSpace(platformPackage.TrackingNumber)
                    ? null : platformPackage.TrackingNumber,
                ShippingProviderName = string.IsNullOrWhiteSpace(platformPackage.Carrier)
                    ? null : platformPackage.Carrier,
                PackageStatus = string.IsNullOrWhiteSpace(platformPackage.Status)
                    ? null : platformPackage.Status
            }).ToList()
        };

        return await SyncPackagesAsync(syncRequest, cancellationToken);
    }

    private static bool PackageIdsEqual(
        PlatformType platform,
        string? left,
        string? right)
    {
        if (string.Equals(left, right, StringComparison.OrdinalIgnoreCase))
            return true;
        if (platform != PlatformType.Lazada ||
            string.IsNullOrWhiteSpace(left) ||
            string.IsNullOrWhiteSpace(right))
            return false;

        return string.Equals(
            NormalizePackageId(platform, left),
            NormalizePackageId(platform, right),
            StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizePackageId(PlatformType platform, string value)
    {
        var normalized = value.Trim();
        return platform == PlatformType.Lazada &&
               normalized.StartsWith("SOF_", StringComparison.OrdinalIgnoreCase)
            ? normalized[4..]
            : normalized;
    }

    private static bool TryBuildItemBasedMappings(
        IReadOnlyList<ShippingPackage> platformPackages,
        IReadOnlyList<WmsPackageManifestPackage> wmsPackages,
        out List<PlatformPackageMappingRequest> mappings)
    {
        mappings = new List<PlatformPackageMappingRequest>();
        if (platformPackages.Count != wmsPackages.Count ||
            platformPackages.Any(x => x.Items.Count == 0))
            return false;

        var candidatesByPlatformPackage = new List<(
            ShippingPackage Package,
            List<WmsPackageManifestPackage> Candidates)>();

        foreach (var platformPackage in platformPackages)
        {
            var candidates = wmsPackages.Where(wmsPackage =>
            {
                var wmsItems = wmsPackage.Items
                    .Where(x => !string.IsNullOrWhiteSpace(x.ItemNumber) && x.Quantity > 0)
                    .GroupBy(x => NormalizeItemNumber(x.ItemNumber), StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(
                        x => x.Key,
                        x => x.Sum(item => item.Quantity),
                        StringComparer.OrdinalIgnoreCase);
                return TryBuildPlatformItemQuantities(platformPackage, wmsItems, out var platformItems) &&
                       SameItemQuantities(platformItems, wmsItems);
            }).ToList();

            if (candidates.Count != 1)
                return false;
            candidatesByPlatformPackage.Add((platformPackage, candidates));
        }

        var mappedRefs = new HashSet<Guid>();
        foreach (var candidate in candidatesByPlatformPackage)
        {
            var wmsPackage = candidate.Candidates[0];
            if (!mappedRefs.Add(wmsPackage.WmsPackageRef))
            {
                mappings.Clear();
                return false;
            }

            mappings.Add(new PlatformPackageMappingRequest
            {
                WmsPackageRef = wmsPackage.WmsPackageRef,
                PlatformPackageId = candidate.Package.PackageId
            });
        }

        return mappings.Count == platformPackages.Count;
    }

    private static bool TryBuildPlatformItemQuantities(
        ShippingPackage platformPackage,
        IReadOnlyDictionary<string, decimal> wmsItems,
        out Dictionary<string, decimal> platformItems)
    {
        platformItems = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in platformPackage.Items.Where(x => x.Quantity > 0))
        {
            var aliases = item.ItemNumberAliases.Count > 0
                ? item.ItemNumberAliases
                : new List<string> { item.ItemNumber };
            var matchingAliases = aliases
                .Where(alias => !string.IsNullOrWhiteSpace(alias))
                .Select(NormalizeItemNumber)
                .Where(wmsItems.ContainsKey)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (matchingAliases.Count != 1)
                return false;

            var itemNumber = matchingAliases[0];
            platformItems[itemNumber] = platformItems.TryGetValue(itemNumber, out var quantity)
                ? quantity + item.Quantity
                : item.Quantity;
        }

        return platformItems.Count > 0;
    }

    private static bool SameItemQuantities(
        IReadOnlyDictionary<string, decimal> left,
        IReadOnlyDictionary<string, decimal> right)
    {
        if (left.Count != right.Count) return false;
        foreach (var item in left)
        {
            if (!right.TryGetValue(item.Key, out var quantity) ||
                Math.Abs(quantity - item.Value) > 0.0001m)
                return false;
        }

        return true;
    }

    private static string NormalizeItemNumber(string value) =>
        value.Trim().Replace(" ", string.Empty).ToUpperInvariant();

    private static bool SamePersistedItemQuantities(
        IReadOnlyCollection<PlatformPackageItem> persistedItems,
        IReadOnlyCollection<WmsPackageManifestItem> currentItems)
    {
        var persisted = persistedItems
            .GroupBy(x => NormalizeItemNumber(x.ItemNumber), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                x => x.Key,
                x => x.Sum(item => item.Quantity),
                StringComparer.OrdinalIgnoreCase);
        var current = currentItems
            .GroupBy(x => NormalizeItemNumber(x.ItemNumber), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                x => x.Key,
                x => x.Sum(item => item.Quantity),
                StringComparer.OrdinalIgnoreCase);
        return SameItemQuantities(persisted, current);
    }

    public async Task<List<PlatformPackageRecordResult>> GetPackagesAsync(
        PlatformType platform,
        string? shopId,
        string platformOrderId,
        CancellationToken cancellationToken = default)
    {
        shopId = PlatformShopIdResolver.Resolve(platform, shopId);
        var rows = await _db.PlatformPackages
            .AsNoTracking()
            .Where(x => x.Platform == platform.ToString() &&
                        x.ShopId == shopId &&
                        x.PlatformOrderId == platformOrderId)
            .OrderBy(x => x.BoxNumber)
            .ToListAsync(cancellationToken);

        return rows.Select(ToResult).ToList();
    }

    private static PlatformPackageRecordResult ToResult(PlatformPackage record)
    {
        return new PlatformPackageRecordResult
        {
            PlatformPackageRecordId = record.PlatformPackageRecordId,
            WmsPackageRef = record.OutboundSortMasterId,
            BoxNumber = record.BoxNumber,
            PlatformPackageId = record.PlatformPackageId,
            TrackingNumber = record.TrackingNumber ?? string.Empty,
            ShippingProviderId = record.ShippingProviderId,
            ShippingProviderName = record.ShippingProviderName,
            PackageStatus = record.PackageStatus,
            SyncStatus = record.SyncStatus,
            Error = record.LastError
        };
    }

    private static string PackageKey(ShippingPackage package, int index)
    {
        return string.IsNullOrWhiteSpace(package.PackageId)
            ? $"index:{index}"
            : $"id:{package.PackageId}";
    }

    private static bool PlatformMatches(string? value, PlatformType platform)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var normalized = value.Replace("_", string.Empty).Replace("-", string.Empty).ToUpperInvariant();
        return platform switch
        {
            PlatformType.Shopee => normalized == "SHOPEE",
            PlatformType.Lazada => normalized == "LAZADA",
            PlatformType.TikTok => normalized is "TIKTOK" or "TIKTOKSHOP",
            _ => false
        };
    }

    private static PlatformType? ToPlatformType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (PlatformMatches(value, PlatformType.Shopee)) return PlatformType.Shopee;
        if (PlatformMatches(value, PlatformType.Lazada)) return PlatformType.Lazada;
        if (PlatformMatches(value, PlatformType.TikTok)) return PlatformType.TikTok;
        return null;
    }
}
