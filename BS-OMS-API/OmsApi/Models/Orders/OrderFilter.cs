using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using OmsApi.Models.Common;

namespace OmsApi.Models.Orders
{
    /// <summary>
    /// Filter for querying orders
    /// </summary>
    public class OrderFilter
    {
        /// <summary>Platform to query (null = all platforms)</summary>
        public PlatformType? Platform { get; set; }

        /// <summary>Resolved internally from the encrypted OMS credential store.</summary>
        [JsonIgnore]
        [StringLength(512)]
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>Shop ID (required for Shopee)</summary>
        public string? ShopId { get; set; }

        /// <summary>Filter by status</summary>
        public OrderStatus? Status { get; set; }

        /// <summary>Start date filter (order creation date)</summary>
        public DateTime? DateFrom { get; set; }

        /// <summary>End date filter (order creation date)</summary>
        public DateTime? DateTo { get; set; }

        /// <summary>Page number (1-based)</summary>
        public int Page { get; set; } = 1;

        /// <summary>Page size</summary>
        public int PageSize { get; set; } = 50;

        /// <summary>Optional platform/shop selectors for a multi-platform query.</summary>
        public List<PlatformCredentialInput>? PlatformCredentials { get; set; }
    }

    /// <summary>
    /// Credential input for querying a specific platform
    /// </summary>
    public class PlatformCredentialInput
    {
        public PlatformType Platform { get; set; }

        [JsonIgnore]
        [StringLength(512)]
        public string AccessToken { get; set; } = string.Empty;

        public string? ShopId { get; set; }
    }
}
