using System.Text.Json.Serialization;

namespace ReportViewer.Models
{
    public class ReportExportRequest
    {
        [JsonPropertyName("report_code")]
        public string? ReportCode { get; set; }

        [JsonPropertyName("parameters")]
        public Dictionary<string, string>? Parameters { get; set; } = new Dictionary<string, string>();

        [JsonPropertyName("output_format")]
        public string? OutputFormat { get; set; } = "pdf";
    }
}
