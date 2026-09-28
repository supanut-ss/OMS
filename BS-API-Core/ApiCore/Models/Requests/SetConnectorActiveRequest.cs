using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    public sealed class SetConnectorActiveRequest
    {
        [Range(1, long.MaxValue)]
        public long PlatformCredentialId { get; set; }

        public bool IsActive { get; set; }
    }
}
