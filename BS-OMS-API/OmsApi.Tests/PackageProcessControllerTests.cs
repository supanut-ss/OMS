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
                new ShippingPackage
                {
                    PackageId = "PACKAGE-1",
                    TrackingNumber = "TRACK-SAME",
                    Items = { new ShippingPackageItem { ItemNumber = "SKU-1", Quantity = 1 } }
                },
                new ShippingPackage
                {
                    PackageId = "PACKAGE-2",
                    TrackingNumber = "TRACK-SAME",
                    Items = { new ShippingPackageItem { ItemNumber = "SKU-2", Quantity = 1 } }
                }
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

    [Fact]
    public async Task ProcessPackages_WhenSingleShopeePackageHasNoPackageId_RemainsProcessing()
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Shopee,
            Packages = { ClosedBox(1) }
        };
        var tracking = new TrackingInfo
        {
            Platform = PlatformType.Shopee,
            OrderId = "SHOPEE-ORDER-1",
            Packages =
            {
                new ShippingPackage { TrackingNumber = "TRACK-1" }
            }
        };
        var controller = CreateController(manifest, tracking);

        var action = await controller.ProcessPackages(CreateRequest());

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.Equal("PROCESSING", response.Data!.Stage);
        Assert.Contains("platform_package_id", response.Data.Packages[0].Error);
    }

    [Fact]
    public async Task ProcessPackages_WhenLazadaPackageIsPacked_ArrangesEvenWhenTrackingExists()
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Lazada,
            Packages = { ClosedBox(1) }
        };
        var tracking = new TrackingInfo
        {
            Platform = PlatformType.Lazada,
            OrderId = "7001",
            Packages =
            {
                new ShippingPackage
                {
                    PackageId = "FP-1",
                    TrackingNumber = "LEX-1",
                    Status = "packed"
                }
            }
        };
        var shippingService = new UnusedShippingService(
            tracking,
            trackingAfterArrange: tracking);
        var controller = CreateController(
            manifest,
            shippingService: shippingService);

        var action = await controller.ProcessPackages(
            CreateRequest(PlatformType.Lazada, "7001"));

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.Equal("COMPLETED", response.Data!.Stage);
        var arrange = Assert.Single(shippingService.ShipRequests);
        Assert.Equal(PlatformType.Lazada, arrange.Platform);
        Assert.Equal("FP-1", arrange.PackageId);
    }

    [Fact]
    public async Task ProcessPackages_WhenTikTokPackageNeedsShipping_ArrangesThenTracksIt()
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.TikTok,
            Packages = { ClosedBox(1) }
        };
        var beforeArrange = new TrackingInfo
        {
            Platform = PlatformType.TikTok,
            OrderId = "TT-1",
            Packages =
            {
                new ShippingPackage
                {
                    PackageId = "PKG-1",
                    Status = "AWAITING_SHIPMENT"
                }
            }
        };
        var afterArrange = new TrackingInfo
        {
            Platform = PlatformType.TikTok,
            OrderId = "TT-1",
            Packages =
            {
                new ShippingPackage
                {
                    PackageId = "PKG-1",
                    TrackingNumber = "TT-TRACK-1",
                    Status = "PROCESSING"
                }
            }
        };
        var shippingService = new UnusedShippingService(
            beforeArrange,
            trackingAfterArrange: afterArrange);
        var controller = CreateController(
            manifest,
            shippingService: shippingService);

        var action = await controller.ProcessPackages(
            CreateRequest(PlatformType.TikTok, "TT-1"));

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.Equal("COMPLETED", response.Data!.Stage);
        var arrange = Assert.Single(shippingService.ShipRequests);
        Assert.Equal(PlatformType.TikTok, arrange.Platform);
        Assert.Equal("PKG-1", arrange.PackageId);
    }

    [Theory]
    [InlineData(PlatformType.Lazada)]
    [InlineData(PlatformType.TikTok)]
    public async Task ProcessPackages_WhenNonShopeeWaybillIsPending_RemainsProcessing(
        PlatformType platform)
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = platform,
            Packages = { ClosedBox(1) }
        };
        var tracking = new TrackingInfo
        {
            Platform = platform,
            OrderId = "PLATFORM-1",
            Packages =
            {
                new ShippingPackage
                {
                    PackageId = "PKG-1",
                    TrackingNumber = "TRACK-1",
                    Status = platform == PlatformType.Lazada
                        ? "ready_to_ship"
                        : "PROCESSING"
                }
            }
        };
        var controller = CreateController(
            manifest,
            tracking,
            documentService: new PendingDocumentService());

        var action = await controller.ProcessPackages(
            CreateRequest(platform, "PLATFORM-1"));

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.Equal("PROCESSING", response.Data!.Stage);
        Assert.Contains("Waybill", response.Data.Packages[0].Error);
    }

    [Fact]
    public async Task ProcessPackages_WhenLazadaPackageUsesSof_CompletesWithoutWaybill()
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Lazada,
            Packages = { ClosedBox(1) }
        };
        var tracking = new TrackingInfo
        {
            Platform = PlatformType.Lazada,
            OrderId = "LAZADA-SOF-1",
            Packages =
            {
                new ShippingPackage
                {
                    PackageId = "PKG-SOF-1",
                    TrackingNumber = "SOF_FP094613283658634",
                    Status = "ready_to_ship"
                }
            }
        };
        var documentService = new PendingDocumentService();
        var controller = CreateController(manifest, tracking, documentService: documentService);

        var action = await controller.ProcessPackages(
            CreateRequest(PlatformType.Lazada, "LAZADA-SOF-1"));

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.Equal("COMPLETED", response.Data!.Stage);
        Assert.False(Assert.Single(response.Data.Packages).WaybillRequired);
        Assert.Empty(documentService.EnsuredPackageIds);
    }

    [Fact]
    public async Task ProcessPackages_WhenLazadaHasSofAndLex_RequiresWaybillOnlyForLex()
    {
        var manifest = new WmsPackageManifest
        {
            CustomerOrderNumber = "ORDER-1",
            Platform = PlatformType.Lazada,
            Packages = { ClosedBox(1), ClosedBox(2) }
        };
        var tracking = new TrackingInfo
        {
            Platform = PlatformType.Lazada,
            OrderId = "LAZADA-MIXED-1",
            Packages =
            {
                new ShippingPackage
                {
                    PackageId = "PKG-SOF-1",
                    TrackingNumber = "SOF-TRACK-1",
                    Carrier = "Seller Own Fleet",
                    Status = "ready_to_ship",
                    Items = { new ShippingPackageItem { ItemNumber = "SKU-1", Quantity = 1 } }
                },
                new ShippingPackage
                {
                    PackageId = "PKG-LEX-2",
                    TrackingNumber = "LEX-TRACK-2",
                    Carrier = "LEX TH",
                    Status = "ready_to_ship",
                    Items = { new ShippingPackageItem { ItemNumber = "SKU-2", Quantity = 1 } }
                }
            }
        };
        var documentService = new PendingDocumentService();
        var controller = CreateController(manifest, tracking, documentService: documentService);

        var action = await controller.ProcessPackages(
            CreateRequest(PlatformType.Lazada, "LAZADA-MIXED-1"));

        var ok = Assert.IsType<OkObjectResult>(action);
        var response = Assert.IsType<ApiResponse<ProcessPlatformPackagesResult>>(ok.Value);
        Assert.Equal("PROCESSING", response.Data!.Stage);
        Assert.Equal("PKG-LEX-2", Assert.Single(documentService.EnsuredPackageIds));
        var sofPackage = response.Data.Packages.Single(package => package.BoxNumber == 1);
        var lexPackage = response.Data.Packages.Single(package => package.BoxNumber == 2);
        Assert.False(sofPackage.WaybillRequired);
        Assert.Null(sofPackage.Error);
        Assert.True(lexPackage.WaybillRequired);
        Assert.Contains("Waybill", lexPackage.Error);
    }

    private static WmsPackageManifestPackage ClosedBox(int boxNumber) => new()
    {
        WmsPackageRef = Guid.NewGuid(),
        BoxNumber = boxNumber,
        IsCloseBox = "YES",
        Items = { new WmsPackageManifestItem { ItemNumber = $"SKU-{boxNumber}", Quantity = 1 } }
    };

    private static ProcessPlatformPackagesRequest CreateRequest(
        PlatformType platform = PlatformType.Shopee,
        string platformOrderId = "SHOPEE-ORDER-1") => new()
    {
        Platform = platform,
        ShopId = "227762129",
        PlatformOrderId = platformOrderId,
        CustomerOrderNumber = "ORDER-1"
    };

    private static ShippingController CreateController(
        WmsPackageManifest? manifest,
        TrackingInfo? tracking = null,
        TrackingInfo? trackingAfterSplit = null,
        UnusedShippingService? shippingService = null,
        IPlatformDocumentService? documentService = null)
    {
        var controller = new ShippingController(
            shippingService ?? new UnusedShippingService(tracking, trackingAfterSplit),
            new StubPlatformPackageService(manifest),
            NullLogger<ShippingController>.Instance,
            documentService ?? new ReadyDocumentService())
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
                ShopId = request.ShopId ?? string.Empty,
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
                    ShippingProviderName = package.Carrier,
                    PackageStatus = package.Status,
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
        private readonly TrackingInfo? _trackingAfterArrange;
        private bool _wasSplit;
        private bool _wasArranged;
        public List<ShipOrderRequest> ShipRequests { get; } = new();

        public UnusedShippingService(
            TrackingInfo? tracking = null,
            TrackingInfo? trackingAfterSplit = null,
            TrackingInfo? trackingAfterArrange = null)
        {
            _tracking = tracking;
            _trackingAfterSplit = trackingAfterSplit;
            _trackingAfterArrange = trackingAfterArrange;
        }

        public Task<ShippingLabelResult?> GetShippingLabelAsync(ShippingLabelRequest request) => throw new NotSupportedException();
        public Task<List<ShippingLabelResult>> GetBatchShippingLabelsAsync(List<ShippingLabelRequest> requests) => throw new NotSupportedException();
        public Task<bool> ShipOrderAsync(ShipOrderRequest request)
        {
            ShipRequests.Add(request);
            _wasArranged = true;
            return Task.FromResult(true);
        }
        public Task ValidateOrderPackagesAsync(
            PlatformType platform,
            string orderId,
            IReadOnlyCollection<WmsPackageManifestPackage> packages,
            string? shopId = null) => Task.CompletedTask;
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
            => Task.FromResult<TrackingInfo?>(_wasArranged && _trackingAfterArrange != null
                ? _trackingAfterArrange
                : _wasSplit && _trackingAfterSplit != null
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

    private sealed class PendingDocumentService : IPlatformDocumentService
    {
        public List<string?> EnsuredPackageIds { get; } = new();

        public Task<List<PlatformDocumentResult>> EnsureWaybillsAsync(
            PlatformType platform,
            string? shopId,
            string platformOrderId,
            IReadOnlyCollection<PlatformPackageRecordResult> packages,
            string shippingDocumentType = "NORMAL_AIR_WAYBILL",
            CancellationToken cancellationToken = default)
        {
            EnsuredPackageIds.AddRange(packages.Select(package => package.PlatformPackageId));
            return Task.FromResult(packages.Select(package => new PlatformDocumentResult
            {
                Platform = platform,
                ShopId = shopId ?? string.Empty,
                PlatformOrderId = platformOrderId,
                PlatformPackageId = package.PlatformPackageId,
                TrackingNumber = package.TrackingNumber,
                DocumentType = "WAYBILL",
                DocumentStatus = "PROCESSING"
            }).ToList());
        }

        public Task<List<PlatformDocumentResult>> GetDocumentsAsync(
            PlatformType platform,
            string? shopId,
            string platformOrderId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new List<PlatformDocumentResult>());

        public Task<PlatformDocumentFile?> GetFileAsync(
            PlatformType platform,
            string? shopId,
            string platformOrderId,
            string? platformPackageId,
            bool markPrinted,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<PlatformDocumentFile?>(null);
    }

    private sealed class ReadyDocumentService : IPlatformDocumentService
    {
        public Task<List<PlatformDocumentResult>> EnsureWaybillsAsync(
            PlatformType platform,
            string? shopId,
            string platformOrderId,
            IReadOnlyCollection<PlatformPackageRecordResult> packages,
            string shippingDocumentType = "NORMAL_AIR_WAYBILL",
            CancellationToken cancellationToken = default) =>
            Task.FromResult(packages.Select(package => new PlatformDocumentResult
            {
                Platform = platform,
                ShopId = shopId ?? string.Empty,
                PlatformOrderId = platformOrderId,
                PlatformPackageId = package.PlatformPackageId,
                TrackingNumber = package.TrackingNumber,
                DocumentType = "WAYBILL",
                DocumentStatus = "READY"
            }).ToList());

        public Task<List<PlatformDocumentResult>> GetDocumentsAsync(
            PlatformType platform,
            string? shopId,
            string platformOrderId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new List<PlatformDocumentResult>());

        public Task<PlatformDocumentFile?> GetFileAsync(
            PlatformType platform,
            string? shopId,
            string platformOrderId,
            string? platformPackageId,
            bool markPrinted,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<PlatformDocumentFile?>(null);
    }
}
