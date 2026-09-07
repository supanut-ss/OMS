using OmsApi.Models.Common;
using OmsApi.Models.Shipping;

namespace OmsApi.Services.Interfaces;

public interface IPlatformPackageService
{
    /// <summary>อ่านกล่องและรายการสินค้าในกล่องจาก WMS</summary>
    Task<WmsPackageManifest?> GetWmsPackageManifestAsync(
        string customerOrderNumber,
        PlatformType? platform = null,
        CancellationToken cancellationToken = default);

    /// <summary>บันทึก snapshot กล่องและสินค้าเป็น PENDING ก่อนเรียก Platform</summary>
    Task<ProcessPlatformPackagesResult> PreparePackagesAsync(
        ProcessPlatformPackagesRequest request,
        WmsPackageManifest manifest,
        CancellationToken cancellationToken = default);

    /// <summary>บันทึกผลล้มเหลวจาก Platform ให้ทุกกล่องที่กำลังประมวลผล</summary>
    Task MarkPackagesFailedAsync(
        ProcessPlatformPackagesRequest request,
        string error,
        CancellationToken cancellationToken = default);

    /// <summary>บันทึก Package/Tracking จาก Platform ผูกกับกล่อง WMS</summary>
    Task<SyncPlatformPackagesResult> SyncPackagesAsync(
        SyncPlatformPackagesRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>ดึง Tracking จาก Platform แล้วบันทึกลงกล่อง WMS</summary>
    Task<SyncPlatformPackagesResult> SyncTrackingAsync(
        SyncPlatformTrackingRequest request,
        TrackingInfo tracking,
        CancellationToken cancellationToken = default);

    /// <summary>อ่านผลการซิงก์ Package ที่บันทึกไว้ใน OMS</summary>
    Task<List<PlatformPackageRecordResult>> GetPackagesAsync(
        PlatformType platform,
        string? shopId,
        string platformOrderId,
        CancellationToken cancellationToken = default);
}
