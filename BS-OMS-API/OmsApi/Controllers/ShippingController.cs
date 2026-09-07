using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;
using Swashbuckle.AspNetCore.Annotations;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;

namespace OmsApi.Controllers
{
    /// <summary>
    /// Shipping management — จัดส่ง ปริ๊นใบปะหน้า ติดตามพัสดุ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ShippingController : ControllerBase
    {
        private readonly IShippingService _shippingService;
        private readonly IPlatformPackageService _platformPackageService;
        private readonly IPlatformDocumentService? _platformDocumentService;
        private readonly ILogger<ShippingController> _logger;

        public ShippingController(
            IShippingService shippingService,
            IPlatformPackageService platformPackageService,
            ILogger<ShippingController> logger,
            IPlatformDocumentService? platformDocumentService = null)
        {
            _shippingService = shippingService;
            _platformPackageService = platformPackageService;
            _logger = logger;
            _platformDocumentService = platformDocumentService;
        }

        /// <summary>
        /// ปริ๊นใบปะหน้าพัสดุ (Shipping Label / AWB)
        /// </summary>
        [HttpPost("print-label")]
        [SwaggerOperation(Summary = "ปริ๊นใบปะหน้าพัสดุ")]
        [SwaggerResponse(200, "Returns shipping label document")]
        public async Task<IActionResult> PrintLabel([FromBody] ShippingLabelRequest request)
        {
            _logger.LogInformation("🏷️ Shipping: Print label for order {OrderId} on {Platform}", request.OrderId, request.Platform);

            var result = await _shippingService.GetShippingLabelAsync(request);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Unable to generate shipping label. Check order status and platform."));

            return Ok(ApiResponse<ShippingLabelResult>.Ok(result, "Shipping label generated successfully"));
        }

        /// <summary>
        /// ปริ๊นใบปะหน้าแบบ Batch (หลายออเดอร์)
        /// </summary>
        [HttpPost("print-labels-batch")]
        [SwaggerOperation(Summary = "ปริ๊นใบปะหน้าหลายออเดอร์พร้อมกัน")]
        [SwaggerResponse(200, "Returns batch shipping labels")]
        public async Task<IActionResult> PrintLabelBatch([FromBody] List<ShippingLabelRequest> requests)
        {
            _logger.LogInformation("🏷️ Shipping: Batch print {Count} labels", requests.Count);

            var results = await _shippingService.GetBatchShippingLabelsAsync(requests);
            return Ok(ApiResponse<List<ShippingLabelResult>>.Ok(results,
                $"Generated {results.Count}/{requests.Count} shipping labels"));
        }

        [HttpPost("waybills/ensure")]
        [SwaggerOperation(Summary = "สร้างหรือตรวจสถานะ Waybill จาก Package ที่ OMS บันทึกไว้")]
        public async Task<IActionResult> EnsureWaybills([FromBody] EnsureWaybillRequest request)
        {
            if (_platformDocumentService == null)
                return StatusCode(503, ApiResponse<string>.Fail("Platform document service is unavailable."));

            var packages = await _platformPackageService.GetPackagesAsync(
                request.Platform,
                request.ShopId,
                request.PlatformOrderId,
                HttpContext.RequestAborted);
            if (packages.Count == 0)
                return NotFound(ApiResponse<string>.Fail("No saved platform packages were found for this order."));

            try
            {
                var documents = await _platformDocumentService.EnsureWaybillsAsync(
                    request.Platform,
                    request.ShopId,
                    request.PlatformOrderId,
                    packages,
                    request.ShippingDocumentType,
                    HttpContext.RequestAborted);
                return Ok(ApiResponse<List<PlatformDocumentResult>>.Ok(
                    documents,
                    $"Waybill ready {documents.Count(x => x.DocumentStatus == "READY")}/{documents.Count}."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpGet("waybills/{platform}/{orderId}")]
        [SwaggerOperation(Summary = "อ่านสถานะ Waybill ที่ OMS บันทึกไว้")]
        public async Task<IActionResult> GetWaybills(
            PlatformType platform,
            string orderId,
            [FromQuery] string shopId)
        {
            if (_platformDocumentService == null)
                return StatusCode(503, ApiResponse<string>.Fail("Platform document service is unavailable."));
            var documents = await _platformDocumentService.GetDocumentsAsync(
                platform, shopId, orderId, HttpContext.RequestAborted);
            return Ok(ApiResponse<List<PlatformDocumentResult>>.Ok(documents));
        }

        [HttpGet("waybills/{platform}/{orderId}/file")]
        [SwaggerOperation(Summary = "ดาวน์โหลด PDF Waybill ของหนึ่ง Package")]
        public async Task<IActionResult> DownloadWaybill(
            PlatformType platform,
            string orderId,
            [FromQuery] string shopId,
            [FromQuery] string? packageId = null,
            [FromQuery] bool markPrinted = false)
        {
            if (_platformDocumentService == null)
                return StatusCode(503, ApiResponse<string>.Fail("Platform document service is unavailable."));
            var file = await _platformDocumentService.GetFileAsync(
                platform, shopId, orderId, packageId, markPrinted, HttpContext.RequestAborted);
            if (file == null)
                return NotFound(ApiResponse<string>.Fail("Waybill is not ready or the file was not found."));
            return File(file.Content, file.ContentType, file.FileName);
        }

        [HttpPost("waybills/review")]
        [SwaggerOperation(Summary = "รวม Waybill ของกล่อง WMS ที่เลือกเป็น PDF สำหรับ Review/Print")]
        public async Task<IActionResult> ReviewWaybills([FromBody] ReviewWaybillRequest request)
        {
            if (_platformDocumentService == null)
                return StatusCode(503, ApiResponse<string>.Fail("Platform document service is unavailable."));

            var savedPackages = await _platformPackageService.GetPackagesAsync(
                request.Platform, request.ShopId, request.PlatformOrderId, HttpContext.RequestAborted);
            var selectedRefs = request.WmsPackageRefs.ToHashSet();
            var selectedPackages = savedPackages
                .Where(x => selectedRefs.Contains(x.WmsPackageRef))
                .OrderBy(x => x.BoxNumber)
                .ToList();
            if (selectedPackages.Count != selectedRefs.Count)
                return BadRequest(ApiResponse<string>.Fail(
                    "One or more selected WMS boxes do not belong to this platform order."));

            var documents = await _platformDocumentService.EnsureWaybillsAsync(
                request.Platform,
                request.ShopId,
                request.PlatformOrderId,
                selectedPackages,
                request.ShippingDocumentType,
                HttpContext.RequestAborted);
            var pending = documents.Where(x => x.DocumentStatus != "READY").ToList();
            if (pending.Count > 0)
                return BadRequest(ApiResponse<List<PlatformDocumentResult>>.Fail(
                    "Waybill is not ready for every selected box. Please try again."));

            using var merged = new PdfDocument();
            foreach (var package in selectedPackages)
            {
                var file = await _platformDocumentService.GetFileAsync(
                    request.Platform,
                    request.ShopId,
                    request.PlatformOrderId,
                    package.PlatformPackageId,
                    true,
                    HttpContext.RequestAborted);
                if (file == null || !file.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(ApiResponse<string>.Fail(
                        $"Printable PDF was not found for WMS box {package.BoxNumber}."));

                using var sourceStream = new MemoryStream(file.Content, writable: false);
                using var source = PdfReader.Open(sourceStream, PdfDocumentOpenMode.Import);
                for (var pageIndex = 0; pageIndex < source.PageCount; pageIndex++)
                    merged.AddPage(source.Pages[pageIndex]);
            }

            using var output = new MemoryStream();
            merged.Save(output, false);
            var safeOrderId = string.Concat(request.PlatformOrderId
                .Where(c => char.IsLetterOrDigit(c) || c is '-' or '_'));
            return File(output.ToArray(), "application/pdf", $"{safeOrderId}-waybills.pdf");
        }

        /// <summary>
        /// จัดส่งสินค้า (Arrange Shipment / Ship Order)
        /// </summary>
        [HttpPost("arrange")]
        [SwaggerOperation(Summary = "จัดส่งสินค้า (Ship Order)")]
        [SwaggerResponse(200, "Order shipped successfully")]
        public async Task<IActionResult> ArrangeShipment([FromBody] ShipOrderRequest request)
        {
            _logger.LogInformation("📦 Shipping: Arrange shipment for order {OrderId}", request.OrderId);

            var success = await _shippingService.ShipOrderAsync(request);
            if (!success)
                return BadRequest(ApiResponse<string>.Fail("Failed to arrange shipment. Check order status."));

            return Ok(ApiResponse<string>.Ok("", "Shipment arranged successfully"));
        }

        /// <summary>
        /// ติดตามพัสดุ
        /// </summary>
        [HttpGet("tracking/{platform}/{orderId}")]
        [SwaggerOperation(Summary = "ติดตามสถานะพัสดุ")]
        [SwaggerResponse(200, "Returns tracking info")]
        public async Task<IActionResult> GetTracking(
            PlatformType platform, string orderId,
            [FromQuery] string? shopId = null)
        {
            try
            {
                _logger.LogInformation("📍 Tracking: Get tracking for order {OrderId}", orderId);

                // Tracking always uses the encrypted credential stored by OMS.
                // Access tokens must never be accepted in a query string because URLs may be logged.
                var tracking = await _shippingService.GetTrackingInfoAsync(platform, orderId, null, shopId);
                if (tracking == null)
                    return NotFound(ApiResponse<string>.Fail("Tracking info not available"));

                return Ok(ApiResponse<TrackingInfo>.Ok(tracking));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// อ่านกล่องและรายการสินค้าในแต่ละกล่องจาก WMS ก่อนส่งไป Platform
        /// </summary>
        [HttpGet("wms-packages/{customerOrderNumber}")]
        [SwaggerOperation(Summary = "อ่านกล่องจาก WMS ตาม Customer Order Number")]
        [SwaggerResponse(200, "WMS package manifest retrieved")]
        [SwaggerResponse(404, "WMS package manifest not found")]
        public async Task<IActionResult> GetWmsPackages(
            string customerOrderNumber,
            [FromQuery] PlatformType? platform = null)
        {
            var manifest = await _platformPackageService.GetWmsPackageManifestAsync(customerOrderNumber, platform);
            if (manifest == null)
                return NotFound(ApiResponse<string>.Fail("WMS outbound package manifest not found or is ambiguous."));

            return Ok(ApiResponse<WmsPackageManifest>.Ok(manifest, "WMS package manifest retrieved"));
        }

        /// <summary>
        /// ประมวลผลกล่อง WMS แบบ end-to-end: ตรวจกล่อง, เตรียมข้อมูล,
        /// arrange shipment, รอ Tracking No และบันทึกผลกลับ OMS/WMS
        /// </summary>
        [HttpPost("packages/process")]
        [SwaggerOperation(Summary = "Process WMS boxes through platform tracking in one request")]
        [SwaggerResponse(200, "Tracking numbers assigned and saved for all WMS boxes")]
        [SwaggerResponse(400, "Boxes are not ready or the platform could not issue tracking numbers")]
        [SwaggerResponse(404, "WMS outbound order not found")]
        public async Task<IActionResult> ProcessPackages([FromBody] ProcessPlatformPackagesRequest request)
        {
            if (!Enum.IsDefined(request.Platform))
                return BadRequest(ApiResponse<string>.Fail("Invalid platform."));

            var manifest = await _platformPackageService.GetWmsPackageManifestAsync(
                request.CustomerOrderNumber,
                request.Platform,
                HttpContext.RequestAborted);
            if (manifest == null)
                return NotFound(ApiResponse<string>.Fail(
                    "WMS outbound order was not found or is ambiguous for the requested platform."));
            if (manifest.Packages.Count == 0)
                return BadRequest(ApiResponse<string>.Fail("No WMS packing boxes were found for this order."));

            var duplicateRefs = manifest.Packages
                .GroupBy(x => x.WmsPackageRef)
                .Where(x => x.Key == Guid.Empty || x.Count() > 1)
                .Select(x => x.Key)
                .ToList();
            if (duplicateRefs.Count > 0)
                return BadRequest(ApiResponse<string>.Fail("WMS package references must be non-empty and unique."));

            var duplicateBoxNumbers = manifest.Packages
                .GroupBy(x => x.BoxNumber)
                .Where(x => x.Key <= 0 || x.Count() > 1)
                .Select(x => x.Key)
                .ToList();
            if (duplicateBoxNumbers.Count > 0)
                return BadRequest(ApiResponse<string>.Fail("WMS box numbers must be positive and unique."));

            var openBoxes = manifest.Packages
                .Where(x => !string.Equals(x.IsCloseBox, "YES", StringComparison.OrdinalIgnoreCase))
                .Select(x => x.BoxNumber)
                .ToList();
            if (openBoxes.Count > 0)
                return BadRequest(ApiResponse<string>.Fail(
                    $"Close all WMS boxes before processing. Open boxes: {string.Join(", ", openBoxes)}."));

            var invalidBoxes = manifest.Packages
                .Where(x => x.Items.Count == 0 || x.Items.Any(item => item.Quantity <= 0))
                .Select(x => x.BoxNumber)
                .ToList();
            if (invalidBoxes.Count > 0)
                return BadRequest(ApiResponse<string>.Fail(
                    $"Every WMS box must contain items with a positive quantity. Invalid boxes: {string.Join(", ", invalidBoxes)}."));

            var result = await _platformPackageService.PreparePackagesAsync(
                request,
                manifest,
                HttpContext.RequestAborted);

            try
            {
                List<PlatformPackageMappingRequest>? splitMappings = null;
                IReadOnlyCollection<string>? knownPackageNumbers = null;
                var lazadaPackedByOms = false;
                var tiktokSplitByOms = false;
                if (manifest.Packages.Count > 1)
                {
                    var savedPackages = await _platformPackageService.GetPackagesAsync(
                        request.Platform,
                        request.ShopId,
                        request.PlatformOrderId,
                        HttpContext.RequestAborted);
                    if (savedPackages.Count == manifest.Packages.Count &&
                        savedPackages.All(x => !string.IsNullOrWhiteSpace(x.PlatformPackageId)))
                    {
                        splitMappings = savedPackages.Select(x => new PlatformPackageMappingRequest
                        {
                            WmsPackageRef = x.WmsPackageRef,
                            PlatformPackageId = x.PlatformPackageId
                        }).ToList();
                        knownPackageNumbers = splitMappings.Select(x => x.PlatformPackageId!).ToList();
                    }
                }

                var tracking = await _shippingService.GetTrackingInfoAsync(
                    request.Platform,
                    request.PlatformOrderId,
                    null,
                    request.ShopId,
                    knownPackageNumbers);

                if (request.Platform == PlatformType.Shopee &&
                    manifest.Packages.Count > 1 &&
                    (tracking?.Packages.Count ?? 0) <= 1)
                {
                    var existingTracking = tracking?.Packages
                        .Select(x => x.TrackingNumber)
                        .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x))
                        ?? tracking?.TrackingNumber;
                    if (!string.IsNullOrWhiteSpace(existingTracking))
                        throw new InvalidOperationException(
                            "Shopee has already issued one tracking number for this order, so it can no longer be split safely. " +
                            "Use a new READY_TO_SHIP order and let OMS split it before Arrange Shipment.");

                    var split = await _shippingService.SplitOrderAsync(new SplitPlatformOrderRequest
                    {
                        Platform = request.Platform,
                        ShopId = request.ShopId,
                        OrderId = request.PlatformOrderId,
                        Packages = manifest.Packages
                    });
                    splitMappings = split.PackageMappings;
                    knownPackageNumbers = splitMappings.Select(x => x.PlatformPackageId!).ToList();

                    // split_order is an irreversible external mutation. Persist
                    // its package numbers even if the WMS HTTP request has
                    // already timed out or disconnected.
                    await _platformPackageService.SyncPackagesAsync(
                        new SyncPlatformPackagesRequest
                        {
                            Platform = request.Platform,
                            ShopId = request.ShopId,
                            PlatformOrderId = request.PlatformOrderId,
                            CustomerOrderNumber = request.CustomerOrderNumber,
                            Packages = splitMappings.Select(mapping =>
                            {
                                var box = manifest.Packages.Single(x => x.WmsPackageRef == mapping.WmsPackageRef);
                                return new SyncPlatformPackageRequest
                                {
                                    WmsPackageRef = mapping.WmsPackageRef,
                                    BoxNumber = box.BoxNumber,
                                    PlatformPackageId = mapping.PlatformPackageId,
                                    PackageStatus = "CREATED"
                                };
                            }).ToList()
                        },
                        CancellationToken.None);

                    tracking = await _shippingService.GetTrackingInfoAsync(
                        request.Platform,
                        request.PlatformOrderId,
                        null,
                        request.ShopId,
                        knownPackageNumbers);
                }

                // Lazada does not split a pending order merely because WMS has
                // multiple physical boxes. Pack each WMS box with its own
                // order_item_id before asking Lazada for tracking numbers.
                if (request.Platform == PlatformType.Lazada &&
                    manifest.Packages.Count > 1 &&
                    splitMappings == null &&
                    (tracking?.Packages.Count ?? 0) < manifest.Packages.Count)
                {
                    if (tracking?.Packages.Any(x => !string.IsNullOrWhiteSpace(x.TrackingNumber)) == true)
                    {
                        throw new InvalidOperationException(
                            $"Lazada has already issued {tracking.Packages.Count} package(s) for this order, " +
                            $"but WMS has {manifest.Packages.Count} box(es). Create a new pending order or repack it in Lazada before retrying.");
                    }

                    var split = await _shippingService.SplitOrderAsync(new SplitPlatformOrderRequest
                    {
                        Platform = request.Platform,
                        ShopId = request.ShopId,
                        OrderId = request.PlatformOrderId,
                        Packages = manifest.Packages
                    });
                    if (split.PackageMappings.Count != manifest.Packages.Count)
                    {
                        throw new InvalidOperationException(
                            $"Lazada created {split.PackageMappings.Count} package(s), " +
                            $"but WMS requested {manifest.Packages.Count} box(es).");
                    }

                    splitMappings = split.PackageMappings;
                    lazadaPackedByOms = true;
                    knownPackageNumbers = splitMappings.Select(x => x.PlatformPackageId!).ToList();
                    await _platformPackageService.SyncPackagesAsync(
                        new SyncPlatformPackagesRequest
                        {
                            Platform = request.Platform,
                            ShopId = request.ShopId,
                            PlatformOrderId = request.PlatformOrderId,
                            CustomerOrderNumber = request.CustomerOrderNumber,
                            Packages = splitMappings.Select(mapping =>
                            {
                                var box = manifest.Packages.Single(x => x.WmsPackageRef == mapping.WmsPackageRef);
                                return new SyncPlatformPackageRequest
                                {
                                    WmsPackageRef = mapping.WmsPackageRef,
                                    BoxNumber = box.BoxNumber,
                                    PlatformPackageId = mapping.PlatformPackageId,
                                    PackageStatus = "CREATED"
                                };
                            }).ToList()
                        },
                        CancellationToken.None);

                    tracking = await _shippingService.GetTrackingInfoAsync(
                        request.Platform,
                        request.PlatformOrderId,
                        null,
                        request.ShopId,
                        knownPackageNumbers);
                }

                // TikTok requires an explicit order split before its package
                // shipping endpoint can be called. Build one split group per
                // WMS box from the TikTok order-line IDs and persist the
                // returned package IDs before arranging shipment.
                if (request.Platform == PlatformType.TikTok &&
                    manifest.Packages.Count > 1 &&
                    splitMappings == null &&
                    (tracking?.Packages.Count ?? 0) < manifest.Packages.Count)
                {
                    if (tracking?.Packages.Any(x => !string.IsNullOrWhiteSpace(x.TrackingNumber)) == true)
                    {
                        throw new InvalidOperationException(
                            $"TikTok has already issued {tracking.Packages.Count} package(s) for this order, " +
                            $"but WMS has {manifest.Packages.Count} box(es). Use a new Awaiting Shipment order before splitting.");
                    }

                    var split = await _shippingService.SplitOrderAsync(new SplitPlatformOrderRequest
                    {
                        Platform = request.Platform,
                        ShopId = request.ShopId,
                        OrderId = request.PlatformOrderId,
                        Packages = manifest.Packages
                    });
                    if (split.PackageMappings.Count != manifest.Packages.Count)
                    {
                        throw new InvalidOperationException(
                            $"TikTok created {split.PackageMappings.Count} package(s), " +
                            $"but WMS requested {manifest.Packages.Count} box(es).");
                    }

                    splitMappings = split.PackageMappings;
                    tiktokSplitByOms = true;
                    knownPackageNumbers = splitMappings.Select(x => x.PlatformPackageId!).ToList();
                    await _platformPackageService.SyncPackagesAsync(
                        new SyncPlatformPackagesRequest
                        {
                            Platform = request.Platform,
                            ShopId = request.ShopId,
                            PlatformOrderId = request.PlatformOrderId,
                            CustomerOrderNumber = request.CustomerOrderNumber,
                            Packages = splitMappings.Select(mapping =>
                            {
                                var box = manifest.Packages.Single(x => x.WmsPackageRef == mapping.WmsPackageRef);
                                return new SyncPlatformPackageRequest
                                {
                                    WmsPackageRef = mapping.WmsPackageRef,
                                    BoxNumber = box.BoxNumber,
                                    PlatformPackageId = mapping.PlatformPackageId,
                                    PackageStatus = "CREATED"
                                };
                            }).ToList()
                        },
                        CancellationToken.None);

                    tracking = await _shippingService.GetTrackingInfoAsync(
                        request.Platform,
                        request.PlatformOrderId,
                        null,
                        request.ShopId,
                        knownPackageNumbers);
                }

                // Recovery for an order that Shopee split successfully before
                // an earlier OMS request disconnected prior to saving mappings.
                if (request.Platform == PlatformType.Shopee &&
                    manifest.Packages.Count > 1 &&
                    splitMappings == null &&
                    tracking?.Packages.Count == manifest.Packages.Count &&
                    tracking.Packages.All(x => !string.IsNullOrWhiteSpace(x.PackageId)))
                {
                    var orderedBoxes = manifest.Packages.OrderBy(x => x.BoxNumber).ToList();
                    splitMappings = tracking.Packages.Select((package, index) =>
                        new PlatformPackageMappingRequest
                        {
                            WmsPackageRef = orderedBoxes[index].WmsPackageRef,
                            PlatformPackageId = package.PackageId
                        }).ToList();
                    knownPackageNumbers = splitMappings.Select(x => x.PlatformPackageId!).ToList();
                    await _platformPackageService.SyncPackagesAsync(
                        new SyncPlatformPackagesRequest
                        {
                            Platform = request.Platform,
                            ShopId = request.ShopId,
                            PlatformOrderId = request.PlatformOrderId,
                            CustomerOrderNumber = request.CustomerOrderNumber,
                            Packages = splitMappings.Select(mapping => new SyncPlatformPackageRequest
                            {
                                WmsPackageRef = mapping.WmsPackageRef,
                                PlatformPackageId = mapping.PlatformPackageId,
                                PackageStatus = "CREATED"
                            }).ToList()
                        },
                        CancellationToken.None);
                }

                // Lazada can be split from its seller console. In that case
                // the platform response already contains one package per WMS
                // box, but the internal mapping has not been saved yet. Match
                // by SKU and quantity and persist the mapping here so WMS does
                // not need a separate /packages/sync request. Never fall back
                // to response order because that can assign a label to the
                // wrong physical box when an order contains similar items.
                if (manifest.Packages.Count > 1 &&
                    splitMappings == null &&
                    tracking?.Packages.Count == manifest.Packages.Count &&
                    tracking.Packages.All(x => !string.IsNullOrWhiteSpace(x.PackageId)) &&
                    TryBuildItemBasedMappings(tracking.Packages, manifest.Packages, out var itemMappings))
                {
                    splitMappings = itemMappings;
                    knownPackageNumbers = splitMappings.Select(x => x.PlatformPackageId!).ToList();
                    await _platformPackageService.SyncPackagesAsync(
                        new SyncPlatformPackagesRequest
                        {
                            Platform = request.Platform,
                            ShopId = request.ShopId,
                            PlatformOrderId = request.PlatformOrderId,
                            CustomerOrderNumber = request.CustomerOrderNumber,
                            Packages = tracking.Packages.Select(package =>
                            {
                                var mapping = splitMappings.Single(x =>
                                    string.Equals(x.PlatformPackageId, package.PackageId, StringComparison.OrdinalIgnoreCase));
                                var box = manifest.Packages.Single(x => x.WmsPackageRef == mapping.WmsPackageRef);
                                return new SyncPlatformPackageRequest
                                {
                                    WmsPackageRef = mapping.WmsPackageRef,
                                    BoxNumber = box.BoxNumber,
                                    PlatformPackageId = package.PackageId,
                                    PackageStatus = string.IsNullOrWhiteSpace(package.Status) ? "CREATED" : package.Status
                                };
                            }).ToList()
                        },
                        CancellationToken.None);
                }

                if (!HasCompleteTracking(tracking, manifest.Packages.Count))
                {
                    var packagesToArrange = tracking?.Packages
                        .Where(x => !string.IsNullOrWhiteSpace(x.PackageId) &&
                            (request.Platform != PlatformType.Shopee || ShopeePackageNeedsArrange(x.Status)))
                        .ToList() ?? new List<ShippingPackage>();
                    if (packagesToArrange.Count == 0 && tiktokSplitByOms)
                    {
                        packagesToArrange = (knownPackageNumbers ?? Array.Empty<string>())
                            .Where(x => !string.IsNullOrWhiteSpace(x))
                            .Select(x => new ShippingPackage { PackageId = x })
                            .ToList();
                    }
                    if (packagesToArrange.Count == 0 &&
                        !(request.Platform == PlatformType.Shopee && manifest.Packages.Count > 1))
                        packagesToArrange.Add(new ShippingPackage());

                    // Lazada's split branch has already called the new Pack
                    // API once per WMS box. Calling the legacy arrange path
                    // immediately afterwards can repack all pending items
                    // into one package while Lazada is still propagating the
                    // package status, so only arrange when OMS did not just
                    // create the split packages.
                    if (!lazadaPackedByOms)
                    {
                        foreach (var package in packagesToArrange)
                        {
                            var arranged = await _shippingService.ShipOrderAsync(new ShipOrderRequest
                            {
                                Platform = request.Platform,
                                ShopId = request.ShopId,
                                OrderId = request.PlatformOrderId,
                                PackageId = string.IsNullOrWhiteSpace(package.PackageId) ? null : package.PackageId,
                                ShippingMethod = "dropoff"
                            });
                            if (!arranged)
                                throw new InvalidOperationException(
                                    $"{request.Platform} did not accept the arrange shipment request.");
                        }
                    }

                    for (var attempt = 1; attempt <= 3; attempt++)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(attempt), HttpContext.RequestAborted);
                        tracking = await _shippingService.GetTrackingInfoAsync(
                            request.Platform,
                            request.PlatformOrderId,
                            null,
                            request.ShopId,
                            knownPackageNumbers);
                        if (HasCompleteTracking(tracking, manifest.Packages.Count)) break;
                    }
                }

                if (tracking == null)
                    throw new InvalidOperationException(
                        $"{request.Platform} did not return package or tracking information.");

                var platformPackages = tracking.Packages.Count > 0
                    ? tracking.Packages
                    : new List<ShippingPackage>
                    {
                        new() { TrackingNumber = tracking.TrackingNumber, Carrier = tracking.Carrier, Status = tracking.Status }
                    };
                if (platformPackages.Count != manifest.Packages.Count)
                    throw new InvalidOperationException(
                        $"{request.Platform} returned {platformPackages.Count} package(s), but WMS has {manifest.Packages.Count} box(es). " +
                        "Tracking was not assigned because the package counts do not match.");
                if (platformPackages.Any(x => string.IsNullOrWhiteSpace(x.TrackingNumber)))
                {
                    var pendingMappings = splitMappings ?? new List<PlatformPackageMappingRequest>();
                    var pendingResult = await _platformPackageService.SyncTrackingAsync(
                        new SyncPlatformTrackingRequest
                        {
                            Platform = request.Platform,
                            ShopId = request.ShopId,
                            PlatformOrderId = request.PlatformOrderId,
                            CustomerOrderNumber = request.CustomerOrderNumber,
                            PackageMappings = pendingMappings
                        },
                        tracking,
                        CancellationToken.None);

                    result.Stage = "PROCESSING";
                    result.Packages = result.Packages.Select(package =>
                    {
                        var pending = pendingResult.Packages.FirstOrDefault(x =>
                            x.WmsPackageRef == package.WmsPackageRef);
                        if (pending == null) return package;
                        package.PlatformPackageRecordId = pending.PlatformPackageRecordId;
                        package.PlatformPackageId = pending.PlatformPackageId;
                        package.TrackingNumber = pending.TrackingNumber;
                        package.Status = "PROCESSING";
                        package.Error = null;
                        return package;
                    }).ToList();

                    return Ok(ApiResponse<ProcessPlatformPackagesResult>.Ok(
                        result,
                        $"{request.Platform} has not issued tracking numbers for every package yet. " +
                        "The package mapping was saved; please try Get Tracking No again shortly."));
                }
                var duplicateTrackingNumbers = platformPackages
                    .GroupBy(x => x.TrackingNumber.Trim(), StringComparer.OrdinalIgnoreCase)
                    .Where(x => x.Count() > 1)
                    .Select(x => x.Key)
                    .ToList();
                if (duplicateTrackingNumbers.Count > 0)
                    throw new InvalidOperationException(
                        $"{request.Platform} returned the same tracking number for multiple WMS boxes. " +
                        "Tracking was not saved because every box requires a unique tracking number.");

                var mappings = platformPackages.Count == 1
                    ? new List<PlatformPackageMappingRequest>()
                    : splitMappings ?? new List<PlatformPackageMappingRequest>();
                if (platformPackages.Count > 1 &&
                    mappings.Count > 0 &&
                    mappings.Any(x => string.IsNullOrWhiteSpace(x.PlatformPackageId)))
                    throw new InvalidOperationException(
                        $"{request.Platform} did not return a package id for every tracking number.");

                var syncResult = await _platformPackageService.SyncTrackingAsync(
                    new SyncPlatformTrackingRequest
                    {
                        Platform = request.Platform,
                        ShopId = request.ShopId,
                        PlatformOrderId = request.PlatformOrderId,
                        CustomerOrderNumber = request.CustomerOrderNumber,
                        PackageMappings = mappings
                    },
                    tracking,
                    CancellationToken.None);

                result.Stage = syncResult.SucceededPackages == syncResult.TotalPackages
                    ? "COMPLETED"
                    : "PROCESSING";
                result.Packages = result.Packages.Select(package =>
                {
                    var synced = syncResult.Packages.FirstOrDefault(x => x.WmsPackageRef == package.WmsPackageRef);
                    if (synced == null) return package;
                    package.PlatformPackageRecordId = synced.PlatformPackageRecordId;
                    package.PlatformPackageId = synced.PlatformPackageId;
                    package.TrackingNumber = synced.TrackingNumber;
                    package.Status = synced.SyncStatus;
                    package.Error = synced.Error;
                    return package;
                }).ToList();

                if (result.Stage == "COMPLETED" &&
                    request.Platform == PlatformType.Shopee &&
                    _platformDocumentService != null)
                {
                    // Tracking is already durable at this point. Waybill creation
                    // is best-effort and must never roll tracking back.
                    try
                    {
                        await _platformDocumentService.EnsureWaybillsAsync(
                            request.Platform,
                            request.ShopId,
                            request.PlatformOrderId,
                            syncResult.Packages,
                            "NORMAL_AIR_WAYBILL",
                            CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(
                            ex,
                            "Tracking completed but automatic waybill creation failed for order {OrderId}",
                            request.PlatformOrderId);
                    }
                }

                return Ok(ApiResponse<ProcessPlatformPackagesResult>.Ok(
                    result,
                    $"Processed {syncResult.SucceededPackages}/{syncResult.TotalPackages} WMS boxes."));
            }
            catch (PlatformApiException ex)
            {
                _logger.LogWarning(ex, "Platform rejected package processing for order {OrderId}", request.PlatformOrderId);
                await _platformPackageService.MarkPackagesFailedAsync(
                    request, ex.Message, CancellationToken.None);
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                await _platformPackageService.MarkPackagesFailedAsync(
                    request, ex.Message, CancellationToken.None);
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        private static bool HasCompleteTracking(TrackingInfo? tracking, int expectedBoxes)
        {
            if (tracking == null) return false;
            if (tracking.Packages.Count > 0)
                return tracking.Packages.Count == expectedBoxes &&
                       tracking.Packages.All(x => !string.IsNullOrWhiteSpace(x.TrackingNumber)) &&
                       (expectedBoxes == 1 || tracking.Packages
                           .Select(x => x.TrackingNumber.Trim())
                           .Distinct(StringComparer.OrdinalIgnoreCase)
                           .Count() == expectedBoxes);
            return expectedBoxes == 1 && !string.IsNullOrWhiteSpace(tracking.TrackingNumber);
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

                // A package must identify exactly one WMS box. Zero matches
                // means the SKU mapping is incomplete; multiple matches means
                // assigning by order would be unsafe.
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

                // If more than one alias exists in WMS, the platform item is
                // ambiguous (for example both SKU and seller SKU are separate
                // WMS items), so refuse to guess.
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

        private static bool ShopeePackageNeedsArrange(string? logisticsStatus)
        {
            if (string.IsNullOrWhiteSpace(logisticsStatus)) return true;
            var status = logisticsStatus.Trim().ToUpperInvariant();
            return status is "READY_TO_SHIP" or "LOGISTICS_NOT_START" or "LOGISTICS_INVALID" ||
                   status.Contains("NOT_START", StringComparison.Ordinal);
        }

        /// <summary>
        /// บันทึก Package ID และ Tracking No จาก Platform ผูกกับกล่อง WMS
        /// </summary>
        [HttpPost("packages/sync")]
        [SwaggerOperation(Summary = "บันทึก Package/Tracking กลับเข้า OMS และ WMS")]
        [SwaggerResponse(200, "Packages synchronized")]
        [SwaggerResponse(400, "Invalid WMS package mapping")]
        public async Task<IActionResult> SyncPackages([FromBody] SyncPlatformPackagesRequest request)
        {
            try
            {
                var result = await _platformPackageService.SyncPackagesAsync(request, HttpContext.RequestAborted);
                return Ok(ApiResponse<SyncPlatformPackagesResult>.Ok(
                    result,
                    $"Synchronized {result.SucceededPackages}/{result.TotalPackages} platform packages"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error synchronizing platform packages for order {OrderId}", request.PlatformOrderId);
                return StatusCode(500, ApiResponse<string>.Fail("Unable to synchronize platform packages."));
            }
        }

        /// <summary>
        /// ดึง Tracking จาก Platform แล้วบันทึกลงกล่อง WMS โดยอัตโนมัติ
        /// </summary>
        [HttpPost("packages/sync-from-platform")]
        [SwaggerOperation(Summary = "ดึงและบันทึก Tracking แยกกล่องจาก Platform")]
        [SwaggerResponse(200, "Platform packages synchronized")]
        [SwaggerResponse(400, "Invalid package mapping")]
        [SwaggerResponse(404, "Tracking or WMS boxes not found")]
        public async Task<IActionResult> SyncTrackingFromPlatform(
            [FromBody] SyncPlatformTrackingRequest request)
        {
            try
            {
                var tracking = await _shippingService.GetTrackingInfoAsync(
                    request.Platform,
                    request.PlatformOrderId,
                    request.AccessToken,
                    request.ShopId);
                if (tracking == null)
                    return NotFound(ApiResponse<string>.Fail("Tracking info was not returned by the platform."));

                var result = await _platformPackageService.SyncTrackingAsync(
                    request, tracking, HttpContext.RequestAborted);
                return Ok(ApiResponse<SyncPlatformPackagesResult>.Ok(
                    result,
                    $"Synchronized {result.SucceededPackages}/{result.TotalPackages} platform packages"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error syncing platform tracking for order {OrderId}", request.PlatformOrderId);
                return StatusCode(500, ApiResponse<string>.Fail("Unable to synchronize platform tracking."));
            }
        }

        /// <summary>
        /// อ่าน Package/Tracking ที่ OMS เคยบันทึกไว้
        /// </summary>
        [HttpGet("packages/{platform}/{orderId}")]
        [SwaggerOperation(Summary = "อ่าน Package/Tracking ที่บันทึกไว้")]
        [SwaggerResponse(200, "Packages retrieved")]
        public async Task<IActionResult> GetSavedPackages(
            PlatformType platform,
            string orderId,
            [FromQuery] string shopId)
        {
            if (string.IsNullOrWhiteSpace(shopId))
                return BadRequest(ApiResponse<string>.Fail("shopId is required."));

            var packages = await _platformPackageService.GetPackagesAsync(
                platform, shopId, orderId, HttpContext.RequestAborted);
            return Ok(ApiResponse<List<PlatformPackageRecordResult>>.Ok(
                packages,
                $"Found {packages.Count} saved packages"));
        }

        /// <summary>
        /// ดูรายการผู้ให้บริการขนส่ง
        /// </summary>
        [HttpGet("providers/{platform}")]
        [SwaggerOperation(Summary = "ดูรายการผู้ให้บริการขนส่งที่รองรับ")]
        [SwaggerResponse(200, "Returns shipping providers")]
        public async Task<IActionResult> GetShippingProviders(
            PlatformType platform,
            [FromQuery] string accessToken, [FromQuery] string? shopId = null)
        {
            var providers = await _shippingService.GetShippingProvidersAsync(platform, accessToken, shopId);
            return Ok(ApiResponse<List<ShippingProvider>>.Ok(providers,
                $"Found {providers.Count} shipping providers for {platform}"));
        }
    }
}
