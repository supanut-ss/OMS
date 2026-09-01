using Microsoft.EntityFrameworkCore;
using OmsApi.Models.Persistence;
namespace OmsApi.Data;
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }
    public DbSet<PlatformCredential> PlatformCredentials => Set<PlatformCredential>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<PlatformCredential>(e => {
            e.ToTable("t_interface_platform_credentials", "dbo");
            e.HasKey(x => x.PlatformCredentialId);
            e.HasIndex(x => new { x.Platform, x.ShopId }).IsUnique();
            e.Property(x => x.PlatformCredentialId).HasColumnName("platform_credential_id");
            e.Property(x => x.Platform).HasColumnName("platform").HasMaxLength(32).IsRequired();
            e.Property(x => x.ShopId).HasColumnName("shop_id").HasMaxLength(128).IsRequired();
            e.Property(x => x.ShopName).HasColumnName("shop_name").HasMaxLength(256);
            e.Property(x => x.AccessTokenEncrypted).HasColumnName("access_token_encrypted").HasColumnType("nvarchar(max)");
            e.Property(x => x.RefreshTokenEncrypted).HasColumnName("refresh_token_encrypted").HasColumnType("nvarchar(max)");
            e.Property(x => x.AccessTokenExpiresDate).HasColumnName("access_token_expires_date");
            e.Property(x => x.RefreshTokenExpiresDate).HasColumnName("refresh_token_expires_date");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasMaxLength(3).HasDefaultValue("YES");
            e.Property(x => x.RequiresReauthorization).HasColumnName("requires_reauthorization").HasMaxLength(3).HasDefaultValue("NO");
            e.Property(x => x.LastRefreshDate).HasColumnName("last_refresh_date");
            e.Property(x => x.LastUseDate).HasColumnName("last_use_date");
            e.Property(x => x.LastError).HasColumnName("last_error").HasMaxLength(2000);
            e.Property(x => x.CreateDate).HasColumnName("create_date");
            e.Property(x => x.UpdateDate).HasColumnName("update_date");
            e.Property(x => x.RowVersion).HasColumnName("rowversion").IsRowVersion();
        });
    }
}