using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Controllers;
using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;

namespace OmsApi.Tests;

public class PackageProcessControllerTests
{
    [Fact]
    public async Task ProcessPackages_WhenBoxesAreClosed_ReturnsValidatedPackages()
    {
        var packageRef = Guid.NewGuid();
        var controller = CreateController(new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Shopee,
            Packages =
            {
                new WmsPackageManifestPackage
                {
                    WmsPackageRef = packageRef,
                    BoxNumber = 1,
                    IsCloseBox = "YES",
                    Items =
                    {
                        new WmsPackageManifestItem { ItemNumber = "SKU-1", Quantity = 2 }
                    }
                }
            }
        });

        var action = await controller.ProcessPackages(CreateRequest());

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.True(response.Success);
        Assert.Equal("COMPLETED", response.Data!.Stage);
        Assert.Equal(1, response.Data.TotalBoxes);
        Assert.Equal(packageRef, response.Data.Packages[0].WmsPackageRef);
        Assert.Equal(2, response.Data.Packages[0].TotalQuantity);
        Assert.Equal("SUCCESS", response.Data.Packages[0].Status);
        Assert.Equal("TRACK-1", response.Data.Packages[0].TrackingNumber);
    }

    [Fact]
    public async Task ProcessPackages_WhenABoxIsOpen_ReturnsBadRequest()
    {
        var controller = CreateController(new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Shopee,
            Packages =
            {
                new WmsPackageManifestPackage
                {
                    WmsPackageRef = Guid.NewGuid(),
                    BoxNumber = 2,
                    IsCloseBox = "NO",
                    Items = { new WmsPackageManifestItem { ItemNumber = "SKU-1", Quantity = 1 } }
                }
            }
        });

        var action = await controller.ProcessPackages(CreateRequest());

        var badRequest = Assert.IsType<BadRequestObjectResult>(action);
        var response = Assert.IsType<ApiResponse<string>>(badRequest.Value);
        Assert.Contains("Open boxes: 2", response.Message);
    }

    [Fact]
    public async Task ProcessPackages_WhenOrderDoesNotExist_ReturnsNotFound()
    {
        var controller = CreateController(null);

        var action = await controller.ProcessPackages(CreateRequest());

        Assert.IsType<NotFoundObjectResult>(action);
    }

    [Fact]
    public async Task ProcessPackages_WhenPlatformReturnsDuplicateTracking_DoesNotSaveIt()
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Shopee,
            Packages =
            {
                ClosedBox(1),
                ClosedBox(2)
            }
        };
        var tracking = new TrackingInfo
        {
            Platform = PlatformType.Shopee,
            OrderId = "SHOPEE-ORDER-1",
            Packages =
            {
                new ShippingPackage { PackageId = "PACKAGE-1", TrackingNumber = "TRACK-SAME" },
                new ShippingPackage { PackageId = "PACKAGE-2", TrackingNumber = "TRACK-SAME" }
            }
        };
        var controller = CreateController(manifest, tracking);

        var action = await controller.ProcessPackages(CreateRequest());

        var badRequest = Assert.IsType<BadRequestObjectResult>(action);
        var response = Assert.IsType<ApiResponse<string>>(badRequest.Value);
        Assert.Contains("same tracking number", response.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ProcessPackages_WhenShopeeHasOneUntrackedPackage_SplitsBeforeTracking()
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Shopee,
            Packages = { ClosedBox(1), ClosedBox(2) }
        };
        var beforeSplit = new TrackingInfo
        {
            Platform = PlatformType.Shopee,
            Packages = { new ShippingPackage { PackageId = "ORIGINAL" } }
        };
        var afterSplit = new TrackingInfo
        {
            Platform = PlatformType.Shopee,
            Packages =
            {
                new ShippingPackage { PackageId = "SPLIT-1", TrackingNumber = "TRACK-1" },
                new ShippingPackage { PackageId = "SPLIT-2", TrackingNumber = "TRACK-2" }
            }
        };
        var controller = CreateController(manifest, beforeSplit, afterSplit);

        var action = await controller.ProcessPackages(CreateRequest());

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.Equal("COMPLETED", response.Data!.Stage);
        Assert.Equal(["TRACK-1", "TRACK-2"],
            response.Data.Packages.OrderBy(x => x.BoxNumber).Select(x => x.TrackingNumber));
    }

    private static WmsPackageManifestPackage ClosedBox(int boxNumber) => new()
    {
        WmsPackageRef = Guid.NewGuid(),
        BoxNumber = boxNumber,
        IsCloseBox = "YES",
        Items = { new WmsPackageManifestItem { ItemNumber = $"SKU-{boxNumber}", Quantity = 1 } }
    };

    private static ProcessPlatformPackagesRequest CreateRequest() => new()
    {
        Platform = PlatformType.Shopee,
        ShopId = "227762129",
        PlatformOrderId = "SHOPEE-ORDER-1",
        CustomerOrderNumber = "ORDER-1"
    };

    private static ShippingController CreateController(
        WmsPackageManifest? manifest,
        TrackingInfo? tracking = null,
        TrackingInfo? trackingAfterSplit = null)
    {
        var controller = new ShippingController(
            new UnusedShippingService(tracking, trackingAfterSplit),
            new StubPlatformPackageService(manifest),
            NullLogger<ShippingController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        return controller;
    }

    private sealed class StubPlatformPackageService : IPlatformPackageService
    {
        private readonly WmsPackageManifest? _manifest;
        public StubPlatformPackageService(WmsPackageManifest? manifest) => _manifest = manifest;

        public Task<WmsPackageManifest?> GetWmsPackageManifestAsync(string customerOrderNumber, PlatformType? platform = null, CancellationToken cancellationToken = default)
            => Task.FromResult(_manifest);
        public Task<ProcessPlatformPackagesResult> PreparePackagesAsync(ProcessPlatformPackagesRequest request, WmsPackageManifest manifest, CancellationToken cancellationToken = default)
            => Task.FromResult(new ProcessPlatformPackagesResult
            {
                Platform = request.Platform,
                ShopId = request.ShopId,
                PlatformOrderId = request.PlatformOrderId,
                CustomerOrderNumber = request.CustomerOrderNumber,
                Stage = "PREPARED",
                TotalBoxes = manifest.Packages.Count,
                Packages = manifest.Packages.Select(package => new ProcessPlatformPackageResult
                {
                    WmsPackageRef = package.WmsPackageRef,
                    BoxNumber = package.BoxNumber,
                    ItemCount = package.Items.Count,
                    TotalQuantity = package.Items.Sum(item => item.Quantity),
                    Status = "PENDING"
                }).ToList()
            });
        public Task MarkPackagesFailedAsync(ProcessPlatformPackagesRequest request, string error, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
        public Task<SyncPlatformPackagesResult> SyncPackagesAsync(SyncPlatformPackagesRequest request, CancellationToken cancellationToken = default)
            => Task.FromResult(new SyncPlatformPackagesResult
            {
                Platform = request.Platform,
                PlatformOrderId = request.PlatformOrderId,
                CustomerOrderNumber = request.CustomerOrderNumber,
                TotalPackages = request.Packages.Count,
                SucceededPackages = request.Packages.Count
            });
        public Task<SyncPlatformPackagesResult> SyncTrackingAsync(SyncPlatformTrackingRequest request, TrackingInfo tracking, CancellationToken cancellationToken = default)
        {
            var platformPackages = tracking.Packages.Count > 0
                ? tracking.Packages
                : new List<ShippingPackage> { new() { TrackingNumber = tracking.TrackingNumber } };
            var packageResults = platformPackages.Select((package, index) =>
            {
                var mappedRef = request.PackageMappings.FirstOrDefault(x =>
                    x.PlatformPackageId == package.PackageId)?.WmsPackageRef
                    ?? _manifest!.Packages[index].WmsPackageRef;
                return new PlatformPackageRecordResult
                {
                    PlatformPackageRecordId = index + 1,
                    WmsPackageRef = mappedRef,
                    BoxNumber = _manifest!.Packages.Single(x => x.WmsPackageRef == mappedRef).BoxNumber,
                    PlatformPackageId = package.PackageId,
                    TrackingNumber = package.TrackingNumber,
                    SyncStatus = "SUCCESS"
                };
            }).ToList();
            return Task.FromResult(new SyncPlatformPackagesResult
            {
                Platform = request.Platform,
                PlatformOrderId = request.PlatformOrderId,
                CustomerOrderNumber = request.CustomerOrderNumber,
                TotalPackages = packageResults.Count,
                SucceededPackages = packageResults.Count,
                Packages = packageResults
            });
        }
        public Task<List<PlatformPackageRecordResult>> GetPackagesAsync(PlatformType platform, string? shopId, string platformOrderId, CancellationToken cancellationToken = default)
            => Task.FromResult(new List<PlatformPackageRecordResult>());
    }

    private sealed class UnusedShippingService : IShippingService
    {
        private readonly TrackingInfo? _tracking;
        private readonly TrackingInfo? _trackingAfterSplit;
        private bool _wasSplit;

        public UnusedShippingService(TrackingInfo? tracking = null, TrackingInfo? trackingAfterSplit = null)
        {
            _tracking = tracking;
            _trackingAfterSplit = trackingAfterSplit;
        }

        public Task<ShippingLabelResult?> GetShippingLabelAsync(ShippingLabelRequest request) => throw new NotSupportedException();
        public Task<List<ShippingLabelResult>> GetBatchShippingLabelsAsync(List<ShippingLabelRequest> requests) => throw new NotSupportedException();
        public Task<bool> ShipOrderAsync(ShipOrderRequest request) => Task.FromResult(true);
        public Task<SplitPlatformOrderResult> SplitOrderAsync(SplitPlatformOrderRequest request)
        {
            _wasSplit = true;
            return Task.FromResult(new SplitPlatformOrderResult
            {
                PackageMappings = request.Packages.OrderBy(x => x.BoxNumber)
                    .Select((package, index) => new PlatformPackageMappingRequest
                    {
                        WmsPackageRef = package.WmsPackageRef,
                        PlatformPackageId = $"SPLIT-{index + 1}"
                    }).ToList()
            });
        }
        public Task<List<ShippingProvider>> GetShippingProvidersAsync(
            PlatformType platform,
            string accessToken,
            string? shopId = null,
            bool throwOnApiError = false) => throw new NotSupportedException();
        public Task<PlatformConnectionTestResult> TestConnectionAsync(
            PlatformType platform,
            string? shopId = null) => throw new NotSupportedException();
        public Task<TrackingInfo?> GetTrackingInfoAsync(
            PlatformType platform,
            string orderId,
            string? accessToken = null,
            string? shopId = null,
            IReadOnlyCollection<string>? packageNumbers = null)
            => Task.FromResult<TrackingInfo?>(_wasSplit && _trackingAfterSplit != null
                ? _trackingAfterSplit
                : _tracking ?? new TrackingInfo
            {
                Platform = platform,
                OrderId = orderId,
                TrackingNumber = "TRACK-1",
                Packages =
                {
                    new ShippingPackage { PackageId = "PACKAGE-1", TrackingNumber = "TRACK-1" }
                }
            });
    }
}
