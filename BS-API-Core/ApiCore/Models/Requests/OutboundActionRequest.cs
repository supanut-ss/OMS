using System.Text.Json.Serialization;

namespace ApiCore.Models.Requests
{
    public class OutboundActionRequest
    {
        [JsonPropertyName("outbound_master_id")]
        public long outbound_master_id { get; set; }

        [JsonPropertyName("warehouse_id")]
        public long? warehouse_id { get; set; }

        [JsonPropertyName("owner_id")]
        public long? owner_id { get; set; }

        [JsonPropertyName("cancel_remark")]
        public string? cancel_remark { get; set; }

        [JsonPropertyName("device")]
        public string? device { get; set; }

        [JsonPropertyName("lang")]
        public string? lang { get; set; }

        [JsonPropertyName("is_check_pick_list")]
        public bool? IsCheckPickList { get; set; }
    }
}
