using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    public sealed class SavePlatformAppRequest
    {
        public long? PlatformAppId { get; set; }

        [Required, StringLength(32)]
        public string? Platform { get; set; }

        [Required, StringLength(128)]
        public string? AppName { get; set; }

        [StringLength(2048)]
        public string? AppKey { get; set; }

        [StringLength(4096)]
        public string? AppSecret { get; set; }

        [Required, StringLength(2048)]
        public string? RedirectUrl { get; set; }

        [StringLength(255)]
        public string? ServiceId { get; set; }

        [Required, StringLength(2, MinimumLength = 2)]
        public string? CountryCode { get; set; }

        [Required, StringLength(16)]
        public string? Environment { get; set; }

        public bool IsDefault { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
