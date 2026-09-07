using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

public class PlatformDocumentService : IPlatformDocumentService
{
    private const string WaybillDocumentType = "WAYBILL";
    private readonly ApplicationDbContext _db;
    private readonly IShippingService _shippingService;
    private readonly ILogger<PlatformDocumentService> _logger;
    private readonly string _storageRoot;

    public PlatformDocumentService(
        ApplicationDbContext db,
        IShippingService shippingService,
        ILogger<PlatformDocumentService> logger)
    {
        _db = db;
        _shippingService = shippingService;
        _logger = logger;
        _storageRoot = Path.GetFullPath(
            Environment.GetEnvironmentVariable("WAYBILL_STORAGE_ROOT")
            ?? Path.Combine(Directory.GetCurrentDirectory(), "storage", "waybills"));
    }

    public async Task<List<PlatformDocumentResult>> EnsureWaybillsAsync(
        PlatformType platform,
        string? shopId,
        string platformOrderId,
        IReadOnlyCollection<PlatformPackageRecordResult> packages,
        string shippingDocumentType = "NORMAL_AIR_WAYBILL",
        CancellationToken cancellationToken = default)
    {
        shopId = PlatformShopIdResolver.Resolve(platform, shopId);
        if (packages.Count == 0)
            throw new InvalidOperationException("No platform packages were found for this order.");
        if (packages.Any(x => string.IsNullOrWhiteSpace(x.TrackingNumber)))
            throw new InvalidOperationException("Tracking number is required before creating a waybill.");
        if (packages.Count > 1 && packages.Any(x => string.IsNullOrWhiteSpace(x.PlatformPackageId)))
            throw new InvalidOperationException("Every split package must have a platform_package_id before creating a waybill.");

        var results = new List<PlatformDocumentResult>();
        foreach (var package in packages.OrderBy(x => x.BoxNumber))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var packageId = NullIfWhiteSpace(package.PlatformPackageId);
            var document = await _db.PlatformDocuments.FirstOrDefaultAsync(x =>
                    x.Platform == platform.ToString() &&
                    x.ShopId == shopId &&
                    x.PlatformOrderId == platformOrderId &&
                    x.PlatformPackageId == packageId &&
                    x.DocumentType == WaybillDocumentType,
                cancellationToken);

            if (document == null)
            {
                document = new PlatformDocument
                {
                    Platform = platform.ToString(),
                    ShopId = shopId,
                    PlatformOrderId = platformOrderId,
                    PlatformPackageId = packageId,
                    TrackingNumber = package.TrackingNumber,
                    DocumentType = WaybillDocumentType,
                    SourceFormat = "PDF",
                    DocumentStatus = "PENDING",
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                };
                _db.PlatformDocuments.Add(document);
                await _db.SaveChangesAsync(cancellationToken);
            }

            if (document.DocumentStatus == "READY" && StorageFileExists(document.PrintStorageKey))
            {
                results.Add(ToResult(document, platform));
                continue;
            }

            document.TrackingNumber = package.TrackingNumber;
            document.DocumentStatus = "PROCESSING";
            document.LastError = null;
            document.UpdateDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            try
            {
                var label = await _shippingService.GetShippingLabelAsync(new ShippingLabelRequest
                {
                    Platform = platform,
                    ShopId = shopId,
                    OrderId = platformOrderId,
                    PackageId = packageId,
                    TrackingNumber = package.TrackingNumber,
                    DocumentType = shippingDocumentType
                });

                if (label == null)
                    throw new InvalidOperationException("Platform did not return a waybill result.");
                if (!string.Equals(label.Status, "READY", StringComparison.OrdinalIgnoreCase))
                {
                    document.DocumentStatus = "PROCESSING";
                    document.UpdateDate = DateTime.UtcNow;
                    await _db.SaveChangesAsync(CancellationToken.None);
                    results.Add(ToResult(document, platform));
                    continue;
                }
                if (string.IsNullOrWhiteSpace(label.DocumentBase64))
                    throw new InvalidOperationException("Platform returned READY without document content.");

                var bytes = Convert.FromBase64String(label.DocumentBase64);
                var contentType = string.IsNullOrWhiteSpace(label.ContentType)
                    ? "application/pdf"
                    : label.ContentType;
                var extension = ExtensionFor(contentType);
                var relativeKey = BuildStorageKey(platform, shopId, platformOrderId, packageId, extension);
                var absolutePath = ResolveStoragePath(relativeKey);
                Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);
                await File.WriteAllBytesAsync(absolutePath, bytes, CancellationToken.None);

                document.SourceFormat = extension.TrimStart('.').ToUpperInvariant();
                document.SourceContentType = contentType;
                document.RawStorageKey = relativeKey;
                document.PrintStorageKey = contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)
                    ? relativeKey
                    : null;
                document.FileName = Path.GetFileName(absolutePath);
                document.FileSize = bytes.LongLength;
                document.FileChecksum = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
                document.DocumentStatus = document.PrintStorageKey == null ? "PROCESSING" : "READY";
                document.LastError = document.PrintStorageKey == null
                    ? $"The source format '{contentType}' still requires PDF conversion."
                    : null;
                document.UpdateDate = DateTime.UtcNow;
                await _db.SaveChangesAsync(CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Unable to create waybill for {Platform} order {OrderId}, package {PackageId}",
                    platform,
                    platformOrderId,
                    packageId ?? "(order)");
                document.DocumentStatus = "FAILED";
                document.LastError = Truncate(ex.Message, 2000);
                document.UpdateDate = DateTime.UtcNow;
                await _db.SaveChangesAsync(CancellationToken.None);
            }

            results.Add(ToResult(document, platform));
        }

        return results;
    }

    public async Task<List<PlatformDocumentResult>> GetDocumentsAsync(
        PlatformType platform,
        string? shopId,
        string platformOrderId,
        CancellationToken cancellationToken = default)
    {
        shopId = PlatformShopIdResolver.Resolve(platform, shopId);
        var rows = await _db.PlatformDocuments.AsNoTracking()
            .Where(x => x.Platform == platform.ToString() &&
                        x.ShopId == shopId &&
                        x.PlatformOrderId == platformOrderId)
            .OrderBy(x => x.PlatformPackageId)
            .ToListAsync(cancellationToken);
        return rows.Select(x => ToResult(x, platform)).ToList();
    }

    public async Task<PlatformDocumentFile?> GetFileAsync(
        PlatformType platform,
        string? shopId,
        string platformOrderId,
        string? platformPackageId,
        bool markPrinted,
        CancellationToken cancellationToken = default)
    {
        shopId = PlatformShopIdResolver.Resolve(platform, shopId);
        platformPackageId = NullIfWhiteSpace(platformPackageId);
        var document = await _db.PlatformDocuments.FirstOrDefaultAsync(x =>
                x.Platform == platform.ToString() &&
                x.ShopId == shopId &&
                x.PlatformOrderId == platformOrderId &&
                x.PlatformPackageId == platformPackageId &&
                x.DocumentType == WaybillDocumentType,
            cancellationToken);
        if (document?.DocumentStatus != "READY" || string.IsNullOrWhiteSpace(document.PrintStorageKey))
            return null;

        var path = ResolveStoragePath(document.PrintStorageKey);
        if (!File.Exists(path)) return null;
        var bytes = await File.ReadAllBytesAsync(path, cancellationToken);

        if (markPrinted)
        {
            document.PrintCount += 1;
            document.LastPrintDate = DateTime.UtcNow;
            document.UpdateDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(CancellationToken.None);
        }

        return new PlatformDocumentFile
        {
            Content = bytes,
            ContentType = document.SourceContentType ?? "application/pdf",
            FileName = document.FileName ?? "waybill.pdf"
        };
    }

    private bool StorageFileExists(string? key) =>
        !string.IsNullOrWhiteSpace(key) && File.Exists(ResolveStoragePath(key));

    private string ResolveStoragePath(string key)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_storageRoot, key.Replace('/', Path.DirectorySeparatorChar)));
        var rootWithSeparator = _storageRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid platform document storage key.");
        return fullPath;
    }

    private static string BuildStorageKey(
        PlatformType platform,
        string shopId,
        string orderId,
        string? packageId,
        string extension) =>
        string.Join('/',
            Sanitize(platform.ToString().ToLowerInvariant()),
            Sanitize(shopId),
            Sanitize(orderId),
            Sanitize(packageId ?? "order"),
            $"waybill{extension}");

    private static string Sanitize(string value)
    {
        var chars = value.Select(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.' ? c : '_').ToArray();
        return new string(chars);
    }

    private static string ExtensionFor(string contentType)
    {
        if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)) return ".pdf";
        if (contentType.Contains("html", StringComparison.OrdinalIgnoreCase)) return ".html";
        if (contentType.Contains("png", StringComparison.OrdinalIgnoreCase)) return ".png";
        if (contentType.Contains("jpeg", StringComparison.OrdinalIgnoreCase)) return ".jpg";
        return ".bin";
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    private static PlatformDocumentResult ToResult(PlatformDocument document, PlatformType platform) => new()
    {
        PlatformDocumentId = document.PlatformDocumentId,
        Platform = platform,
        ShopId = document.ShopId,
        PlatformOrderId = document.PlatformOrderId,
        PlatformPackageId = document.PlatformPackageId,
        TrackingNumber = document.TrackingNumber,
        DocumentType = document.DocumentType,
        DocumentStatus = document.DocumentStatus,
        FileName = document.FileName,
        ContentType = document.SourceContentType,
        FileSize = document.FileSize,
        Error = document.LastError
    };
}
