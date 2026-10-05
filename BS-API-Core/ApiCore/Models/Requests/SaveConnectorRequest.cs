using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    public sealed class SaveConnectorRequest
    {
        public long? PlatformCredentialId { get; set; }

        [Required, StringLength(32)]
        public string? Platform { get; set; }

        [Required, StringLength(128)]
        public string? ShopId { get; set; }

        [StringLength(256)]
        public string? ShopName { get; set; }

        [StringLength(2048)]
        public string? AppKey { get; set; }

        [StringLength(4096)]
        public string? AppSecret { get; set; }

        [Required, StringLength(2048)]
        public string? RedirectUrl { get; set; }

        [StringLength(255)]
        public string? ServiceId { get; set; }
        public bool? IsActive { get; set; }
    }
}
