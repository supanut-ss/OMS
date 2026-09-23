namespace Import_Export_Manager.Models.Responses
{
    public class ImportColumnMappingResponse
    {
        public string code { get; set; }
        public string message { get; set; }
        public List<ImportColumnMappingListResponse?> data { get; set; }
        public int total { get; set; }
    }

    public class ImportColumnMappingListResponse
    {
        public int mapping_id { get; set; }
        public int import_id { get; set; }
        public string excel_column_name { get; set; }
        public string db_column_name { get; set; }
        public string data_type { get; set; }
        public string? allowed_values { get; set; }
        public string? datatype_parameter { get; set; }
        public string? format_pattern { get; set; }
        public bool is_required { get; set; }
        public int column_order { get; set; }
        public string? default_value { get; set; }
        public string create_by { get; set; }
        public DateTime create_date { get; set; }
        public string update_by { get; set; }
        public DateTime? update_date { get; set; }
    }
}