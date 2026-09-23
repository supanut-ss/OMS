namespace BS_Printing_Manager.Models.Request
{
    public class ConfigReportResponse
    {
        public string report_code { get; set; } = default!;
        public string? report_name { get; set; }
        public string report_type { get; set; } = default!;
        public string? is_print_by_server { get; set; }
        public string? printer_name { get; set; }
        public string? bartender_data_path { get; set; }
        public string? bartender_trigger_path { get; set; }
        public string? sql_command { get; set; }
        public string? sql_object_type { get; set; }
        public string? html_page_size { get; set; }
        public string? html_pdf_body { get; set; } 
    }
}
