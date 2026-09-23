using Microsoft.EntityFrameworkCore;
using OmsApi.Models.Persistence;

namespace OmsApi.Extensions;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }
    public DbSet<PlatformCredential> PlatformCredentials => Set<PlatformCredential>();
    public DbSet<PlatformPackage> PlatformPackages => Set<PlatformPackage>();
    public DbSet<PlatformPackageItem> PlatformPackageItems => Set<PlatformPackageItem>();
    public DbSet<PlatformDocument> PlatformDocuments => Set<PlatformDocument>();

    // Existing WMS tables. OMS only reads the packing manifest and updates the
    // tracking number on the matching packing master row.
    public DbSet<WmsOutboundMaster> WmsOutboundMasters => Set<WmsOutboundMaster>();
    public DbSet<WmsOutboundPackingMaster> WmsOutboundPackingMasters => Set<WmsOutboundPackingMaster>();
    public DbSet<WmsOutboundPackingDetail> WmsOutboundPackingDetails => Set<WmsOutboundPackingDetail>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<PlatformCredential>(entity =>
        {
            entity.ToTable("t_oms_platform_credential", "oms");
            entity.HasKey(e => e.PlatformCredentialId).HasName("PK_t_oms_platform_credential");
            entity.HasIndex(e => new { e.Platform, e.ShopId }).IsUnique().HasDatabaseName("UQ_t_oms_platform_credential_platform_shop");
            entity.Property(e => e.PlatformCredentialId).HasColumnName("platform_credential_id");
            entity.Property(e => e.Platform).HasColumnName("platform").HasColumnType("varchar(32)").IsRequired();
            entity.Property(e => e.ShopId).HasColumnName("shop_id").HasColumnType("varchar(128)").IsRequired();
            entity.Property(e => e.ShopName).HasColumnName("shop_name").HasMaxLength(256);
            entity.Property(e => e.AccessTokenEncrypted).HasColumnName("access_token_encrypted").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.RefreshTokenEncrypted).HasColumnName("refresh_token_encrypted").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AccessTokenExpiresDate).HasColumnName("access_token_expires_date").HasColumnType("datetime").IsRequired();
            entity.Property(e => e.RefreshTokenExpiresDate).HasColumnName("refresh_token_expires_date").HasColumnType("datetime");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasColumnType("varchar(3)").IsRequired().HasDefaultValue("YES");
            entity.Property(e => e.RequiresReauthorization).HasColumnName("requires_reauthorization").HasColumnType("varchar(3)").IsRequired().HasDefaultValue("NO");
            entity.Property(e => e.LastRefreshDate).HasColumnName("last_refresh_date").HasColumnType("datetime");
            entity.Property(e => e.LastUseDate).HasColumnName("last_use_date").HasColumnType("datetime");
            entity.Property(e => e.LastError).HasColumnName("last_error").HasMaxLength(2000);
            entity.Property(e => e.CreateDate).HasColumnName("create_date").HasColumnType("datetime").IsRequired();
            entity.Property(e => e.UpdateDate).HasColumnName("update_date").HasColumnType("datetime").IsRequired();
            entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
        });

        builder.Entity<PlatformPackage>(entity =>
        {
            entity.ToTable("t_oms_platform_package", "oms");
            entity.HasKey(e => e.PlatformPackageRecordId)
                .HasName("PK_t_oms_platform_package");
            entity.HasIndex(e => new { e.Platform, e.ShopId, e.OutboundSortMasterId })
                .IsUnique()
                .HasDatabaseName("UQ_t_oms_platform_package_wms");
            entity.HasIndex(e => new { e.Platform, e.ShopId, e.PlatformOrderId, e.BoxNumber })
                .HasDatabaseName("IX_t_oms_platform_package_order");
            entity.HasIndex(e => new { e.SyncStatus, e.LastSyncDate })
                .HasDatabaseName("IX_t_oms_platform_package_sync");
            entity.HasIndex(e => new { e.Platform, e.ShopId, e.PlatformPackageId })
                .HasDatabaseName("IX_t_oms_platform_package_platform_id")
                .HasFilter("[platform_package_id] IS NOT NULL");

            entity.Property(e => e.PlatformPackageRecordId).HasColumnName("platform_package_record_id");
            entity.Property(e => e.Platform).HasColumnName("platform").HasColumnType("varchar(32)").IsRequired();
            entity.Property(e => e.ShopId).HasColumnName("shop_id").HasColumnType("varchar(128)").IsRequired();
            entity.Property(e => e.PlatformOrderId).HasColumnName("platform_order_id").HasColumnType("varchar(128)").IsRequired();
            entity.Property(e => e.CustomerOrderNumber).HasColumnName("customer_order_number").HasColumnType("varchar(128)").IsRequired();
            entity.Property(e => e.OutboundOrderMasterId).HasColumnName("outbound_order_master_id").IsRequired();
            entity.Property(e => e.OutboundSortMasterId).HasColumnName("outbound_sort_master_id").IsRequired();
            entity.Property(e => e.BoxNumber).HasColumnName("box_number").IsRequired();
            entity.Property(e => e.PlatformPackageId).HasColumnName("platform_package_id").HasColumnType("varchar(128)");
            entity.Property(e => e.TrackingNumber).HasColumnName("tracking_number").HasColumnType("varchar(256)");
            entity.Property(e => e.ShippingProviderId).HasColumnName("shipping_provider_id").HasColumnType("varchar(128)");
            entity.Property(e => e.ShippingProviderName).HasColumnName("shipping_provider_name").HasMaxLength(256);
            entity.Property(e => e.PackageStatus).HasColumnName("package_status").HasColumnType("varchar(32)").IsRequired().HasDefaultValue("PENDING");
            entity.Property(e => e.SyncStatus).HasColumnName("sync_status").HasColumnType("varchar(16)").IsRequired().HasDefaultValue("PENDING");
            entity.Property(e => e.AttemptCount).HasColumnName("attempt_count").IsRequired().HasDefaultValue(0);
            entity.Property(e => e.RequestId).HasColumnName("request_id").HasColumnType("varchar(128)");
            entity.Property(e => e.LastSyncDate).HasColumnName("last_sync_date").HasColumnType("datetime");
            entity.Property(e => e.LastError).HasColumnName("last_error").HasMaxLength(2000);
            entity.Property(e => e.CreateBy).HasColumnName("create_by").HasMaxLength(80);
            entity.Property(e => e.CreateDate).HasColumnName("create_date").HasColumnType("datetime").IsRequired();
            entity.Property(e => e.UpdateBy).HasColumnName("update_by").HasMaxLength(80);
            entity.Property(e => e.UpdateDate).HasColumnName("update_date").HasColumnType("datetime");
            entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();

            entity.HasMany(e => e.Items)
                .WithOne(e => e.PlatformPackage)
                .HasForeignKey(e => e.PlatformPackageRecordId)
                .HasConstraintName("FK_t_oms_platform_package_item_package")
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PlatformPackageItem>(entity =>
        {
            entity.ToTable("t_oms_platform_package_item", "oms");
            entity.HasKey(e => e.PlatformPackageItemId)
                .HasName("PK_t_oms_platform_package_item");
            entity.HasIndex(e => new { e.PlatformPackageRecordId, e.ItemNumber })
                .HasDatabaseName("IX_t_oms_platform_package_item_package");

            entity.Property(e => e.PlatformPackageItemId).HasColumnName("platform_package_item_id");
            entity.Property(e => e.PlatformPackageRecordId).HasColumnName("platform_package_record_id").IsRequired();
            entity.Property(e => e.PlatformItemId).HasColumnName("platform_item_id").HasColumnType("varchar(128)");
            entity.Property(e => e.PlatformSkuId).HasColumnName("platform_sku_id").HasColumnType("varchar(128)");
            entity.Property(e => e.WmsItemMasterId).HasColumnName("wms_item_master_id").IsRequired();
            entity.Property(e => e.ItemNumber).HasColumnName("item_number").HasColumnType("varchar(128)").IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasColumnType("decimal(18,4)").IsRequired();
            entity.Property(e => e.CreateBy).HasColumnName("create_by").HasMaxLength(80);
            entity.Property(e => e.CreateDate).HasColumnName("create_date").HasColumnType("datetime").IsRequired();
            entity.Property(e => e.UpdateBy).HasColumnName("update_by").HasMaxLength(80);
            entity.Property(e => e.UpdateDate).HasColumnName("update_date").HasColumnType("datetime");
            entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
        });

        builder.Entity<PlatformDocument>(entity =>
        {
            entity.ToTable("t_oms_platform_document", "oms");
            entity.HasKey(e => e.PlatformDocumentId).HasName("PK_t_oms_platform_document");
            entity.HasIndex(e => new { e.Platform, e.ShopId, e.PlatformOrderId, e.PlatformPackageId, e.DocumentType })
                .IsUnique().HasDatabaseName("UQ_t_oms_platform_document_package");
            entity.Property(e => e.PlatformDocumentId).HasColumnName("platform_document_id");
            entity.Property(e => e.Platform).HasColumnName("platform").HasColumnType("varchar(32)").IsRequired();
            entity.Property(e => e.ShopId).HasColumnName("shop_id").HasColumnType("varchar(128)").IsRequired();
            entity.Property(e => e.PlatformOrderId).HasColumnName("platform_order_id").HasColumnType("varchar(128)").IsRequired();
            entity.Property(e => e.PlatformPackageId).HasColumnName("platform_package_id").HasColumnType("varchar(128)");
            entity.Property(e => e.TrackingNumber).HasColumnName("tracking_number").HasColumnType("varchar(256)");
            entity.Property(e => e.DocumentType).HasColumnName("document_type").HasColumnType("varchar(32)").IsRequired();
            entity.Property(e => e.SourceFormat).HasColumnName("source_format").HasColumnType("varchar(16)").IsRequired();
            entity.Property(e => e.SourceContentType).HasColumnName("source_content_type").HasColumnType("varchar(128)");
            entity.Property(e => e.RawStorageKey).HasColumnName("raw_storage_key").HasMaxLength(1000);
            entity.Property(e => e.PrintStorageKey).HasColumnName("print_storage_key").HasMaxLength(1000);
            entity.Property(e => e.FileName).HasColumnName("file_name").HasMaxLength(256);
            entity.Property(e => e.FileSize).HasColumnName("file_size");
            entity.Property(e => e.FileChecksum).HasColumnName("file_checksum").HasColumnType("varchar(128)");
            entity.Property(e => e.DocumentStatus).HasColumnName("document_status").HasColumnType("varchar(20)").IsRequired().HasDefaultValue("PENDING");
            entity.Property(e => e.PlatformRequestId).HasColumnName("platform_request_id").HasColumnType("varchar(128)");
            entity.Property(e => e.SourceExpiresDate).HasColumnName("source_expires_date").HasColumnType("datetime");
            entity.Property(e => e.LastError).HasColumnName("last_error").HasMaxLength(2000);
            entity.Property(e => e.PrintCount).HasColumnName("print_count").IsRequired().HasDefaultValue(0);
            entity.Property(e => e.LastPrintDate).HasColumnName("last_print_date").HasColumnType("datetime");
            entity.Property(e => e.CreateDate).HasColumnName("create_date").HasColumnType("datetime").IsRequired();
            entity.Property(e => e.UpdateDate).HasColumnName("update_date").HasColumnType("datetime").IsRequired();
            entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
        });

        builder.Entity<WmsOutboundMaster>(entity =>
        {
            entity.ToTable("t_wms_outbound_master", "dbo", t => t.ExcludeFromMigrations());
            entity.HasKey(e => e.OutboundOrderMasterId);
            entity.Property(e => e.OutboundOrderMasterId).HasColumnName("outbound_order_master_id");
            entity.Property(e => e.WhMasterId).HasColumnName("wh_master_id");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.OutboundOrderNumber).HasColumnName("outbound_order_number").HasMaxLength(128);
            entity.Property(e => e.CustomerOrderNumber).HasColumnName("customer_order_number").HasMaxLength(128);
            entity.Property(e => e.Platform).HasColumnName("platform").HasMaxLength(32);
        });

        builder.Entity<WmsOutboundPackingMaster>(entity =>
        {
            entity.ToTable("t_wms_outbound_packing_master", "dbo", t => t.ExcludeFromMigrations());
            entity.HasKey(e => e.OutboundSortMasterId);
            entity.Property(e => e.OutboundSortMasterId).HasColumnName("outbound_sort_master_id");
            entity.Property(e => e.WhMasterId).HasColumnName("wh_master_id");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.OutboundOrderMasterId).HasColumnName("outbound_order_master_id");
            entity.Property(e => e.OutboundOrderNumber).HasColumnName("outbound_order_number").HasMaxLength(128);
            entity.Property(e => e.CarrierId).HasColumnName("carrier_id");
            entity.Property(e => e.BoxNumber).HasColumnName("box_number");
            entity.Property(e => e.TrackingNo).HasColumnName("tracking_no").HasMaxLength(256);
            entity.Property(e => e.TotalWeight).HasColumnName("total_weight");
            entity.Property(e => e.BoxSize).HasColumnName("box_size").HasMaxLength(128);
            entity.Property(e => e.IsCloseBox).HasColumnName("is_close_box").HasMaxLength(3);
            entity.Property(e => e.CreateDate).HasColumnName("create_date");
            entity.Property(e => e.UpdateBy).HasColumnName("update_by").HasMaxLength(40);
            entity.Property(e => e.UpdateDate).HasColumnName("update_date");
            entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
        });

        builder.Entity<WmsOutboundPackingDetail>(entity =>
        {
            entity.ToTable("t_wms_outbound_packing_detail", "dbo", t => t.ExcludeFromMigrations());
            entity.HasKey(e => e.OutboundSortDetailId);
            entity.Property(e => e.OutboundSortDetailId).HasColumnName("outbound_sort_detail_id");
            entity.Property(e => e.OutboundSortMasterId).HasColumnName("outbound_sort_master_id");
            entity.Property(e => e.WhItemMasterId).HasColumnName("wh_item_master_id");
            entity.Property(e => e.ItemMasterId).HasColumnName("item_master_id");
            entity.Property(e => e.ItemNumber).HasColumnName("item_number").HasMaxLength(128);
            entity.Property(e => e.ItemDescription).HasColumnName("item_description").HasMaxLength(512);
            entity.Property(e => e.QuantitySort).HasColumnName("quantity_sort");
            entity.Property(e => e.ItemUomId).HasColumnName("item_uom_id");
            entity.Property(e => e.Uom).HasColumnName("uom").HasMaxLength(64);
            entity.Property(e => e.LotNumber).HasColumnName("lot_number").HasMaxLength(128);
            entity.Property(e => e.MfgDate).HasColumnName("mfg_date");
            entity.Property(e => e.ExpiryDate).HasColumnName("expiry_date").HasMaxLength(64);
            entity.Property(e => e.CreateDate).HasColumnName("create_date");
            entity.Property(e => e.UpdateBy).HasColumnName("update_by").HasMaxLength(40);
            entity.Property(e => e.UpdateDate).HasColumnName("update_date");
            entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
        });
    }
}
