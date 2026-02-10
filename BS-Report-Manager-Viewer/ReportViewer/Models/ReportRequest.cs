using System.Collections.Generic;

namespace ReportViewer.Models
{
    /// <summary>
    /// Request model for report viewing and export
    /// Sent from frontend or API as JSON
    /// </summary>
    public class ReportRequest
    {
        /// <summary>
        /// Report code to look up in rpt.t_com_config_report
        /// </summary>
        public string ReportCode { get; set; }

        /// <summary>
        /// Parameters for SQL replacement
        /// Key = field name, Value = field value
        /// For View: FilterConditionString is appended to WHERE clause
        /// For SP: {field} placeholders are replaced with values
        /// </summary>
        public Dictionary<string, string> Parameters { get; set; }

        /// <summary>
        /// Output format: "view", "pdf", "excel", "word"
        /// </summary>
        public string OutputFormat { get; set; }

        public ReportRequest()
        {
            Parameters = new Dictionary<string, string>();
            OutputFormat = "view";
        }
    }
}
