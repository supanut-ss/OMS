using System.Text.Json.Serialization;

namespace Authentication.Models.Requests
{
    public class ActivityLogRequest
    {
        [JsonPropertyName("action_type")]
        public string ActionType { get; set; }
        [JsonPropertyName("page")]
        public string Page { get; set; }
        [JsonPropertyName("entity")]
        public string Entity { get; set; }
        [JsonPropertyName("entity_id")]
        public string EntityId { get; set; }
        [JsonPropertyName("method")]
        public string Method { get; set; }
        [JsonPropertyName("url")]
        public string Url { get; set; }
        [JsonPropertyName("status")]
        public int? Status { get; set; }
        [JsonPropertyName("description")]
        public string Description { get; set; }
    }
}
