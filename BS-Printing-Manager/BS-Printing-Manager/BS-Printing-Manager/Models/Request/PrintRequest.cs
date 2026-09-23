using System.Text.Json.Serialization;

namespace BS_Printing_Manager.Models.Request
{
    public class PrintRequest
    {
        [JsonPropertyName("report_code")]
        public string ReportCode { get; set; } = default!;

        [JsonPropertyName("parameters")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Dictionary<string, object?>? JsonData { get; set; } = default!;

        [JsonPropertyName("copy")]
        public int? Copy { get; set; } = 1;
    }
}
