namespace ReportViewer.Models
{
    /// <summary>
    /// Model mapping to rpt.t_com_config_report table
    /// </summary>
    public class ReportConfig
    {
        public string ReportCode { get; set; }
        public string ReportName { get; set; }
        public string ReportType { get; set; }
        public string IsPrintByServer { get; set; }
        public string PrinterName { get; set; }
        public string ReportPath { get; set; }
        public string BartenderDataPath { get; set; }
        public string BartenderTriggerPath { get; set; }
        public string HtmlPageSize { get; set; }
        public string RdlcDatasetName { get; set; }
        public string SsrsServerUrl { get; set; }
        public string SsrsReportPath { get; set; }
        public string SsrsUsername { get; set; }
        public string SsrsPassword { get; set; }
        public string SsrsDomainName { get; set; }
        public string RunAs { get; set; }
        public string JsonParameter { get; set; }
        public string SqlObjectType { get; set; }
        public string SqlCommand { get; set; }
        public string IsActive { get; set; }
    }
}
