using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    public sealed class SaveConnectorRequest
    {
        public long? PlatformAppShopId { get; set; }

        [Required, StringLength(32)]
        public string? Platform { get; set; }

        [Required, StringLength(128)]
        public string? ShopId { get; set; }

        [StringLength(256)]
        public string? ShopName { get; set; }

        [Range(1, long.MaxValue)]
        public long? PlatformAppId { get; set; }

        /// <summary>
        /// New App Master to create together with this shop mapping.  When supplied,
        /// PlatformAppId must not be supplied.
        /// </summary>
        public NewPlatformAppRequest? NewApp { get; set; }

        public bool? IsActive { get; set; }
    }

    public sealed class NewPlatformAppRequest
    {
        [Required, StringLength(128)]
        public string? AppName { get; set; }

        [Required, StringLength(2048)]
        public string? AppKey { get; set; }

        [Required, StringLength(4096)]
        public string? AppSecret { get; set; }

        [Required, StringLength(2048)]
        public string? RedirectUrl { get; set; }

        [StringLength(255)]
        public string? ServiceId { get; set; }
    }
}
