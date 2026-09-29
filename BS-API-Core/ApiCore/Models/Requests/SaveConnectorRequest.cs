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

        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? AccessTokenExpiresDate { get; set; }
        public DateTime? RefreshTokenExpiresDate { get; set; }
        public bool? IsActive { get; set; }
    }
}
