namespace Import_Export_Manager.Models.Requests
{
    public class ImportColumnMappingRequest
    {
        public int import_id { get; set; }
        public string excel_column_name { get; set; }
        public string db_column_name { get; set; }
        public string data_type { get; set; }
        public string? datatype_parameter { get; set; }
        public string? format_pattern { get; set; }
        public string create_by { get; set; }
        public DateTime create_date { get; set; }
        public string update_by { get; set; }
        public DateTime? update_date { get; set; }
    }
}