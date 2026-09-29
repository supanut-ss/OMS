using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    public sealed class SetConnectorReauthorizationRequest
    {
        [Range(1, long.MaxValue)]
        public long PlatformCredentialId { get; set; }

        public bool RequiresReauthorization { get; set; }

        [StringLength(2000)]
        public string? LastError { get; set; }
    }
}
