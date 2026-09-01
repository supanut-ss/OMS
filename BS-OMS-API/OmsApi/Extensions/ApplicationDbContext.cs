using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using OmsApi.Models.Persistence;

namespace OmsApi.Extensions;

public class ApplicationDbContext : IdentityDbContext<IdentityUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }
    public DbSet<PlatformCredential> PlatformCredentials => Set<PlatformCredential>();
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<PlatformCredential>(entity =>
        {
            entity.ToTable("t_interface_platform_credentials", "dbo");
            entity.HasKey(e => e.PlatformCredentialId).HasName("pk_platform_credentials");
            entity.HasIndex(e => new { e.Platform, e.ShopId }).IsUnique().HasDatabaseName("uq_platform_credentials_platform_shop");
            entity.Property(e => e.PlatformCredentialId).HasColumnName("platform_credential_id");
            entity.Property(e => e.Platform).HasColumnName("platform").HasMaxLength(32).IsRequired();
            entity.Property(e => e.ShopId).HasColumnName("shop_id").HasMaxLength(128).IsRequired();
            entity.Property(e => e.ShopName).HasColumnName("shop_name").HasMaxLength(256);
            entity.Property(e => e.AccessTokenEncrypted).HasColumnName("access_token_encrypted").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.RefreshTokenEncrypted).HasColumnName("refresh_token_encrypted").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AccessTokenExpiresDate).HasColumnName("access_token_expires_date").HasColumnType("datetime2(0)").IsRequired();
            entity.Property(e => e.RefreshTokenExpiresDate).HasColumnName("refresh_token_expires_date").HasColumnType("datetime2(0)");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasMaxLength(3).IsRequired().HasDefaultValue("YES");
            entity.Property(e => e.RequiresReauthorization).HasColumnName("requires_reauthorization").HasMaxLength(3).IsRequired().HasDefaultValue("NO");
            entity.Property(e => e.LastRefreshDate).HasColumnName("last_refresh_date").HasColumnType("datetime2(0)");
            entity.Property(e => e.LastUseDate).HasColumnName("last_use_date").HasColumnType("datetime2(0)");
            entity.Property(e => e.LastError).HasColumnName("last_error").HasMaxLength(2000);
            entity.Property(e => e.CreateDate).HasColumnName("create_date").HasColumnType("datetime2(0)").IsRequired();
            entity.Property(e => e.UpdateDate).HasColumnName("update_date").HasColumnType("datetime2(0)").IsRequired();
            entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
        });
    }
}