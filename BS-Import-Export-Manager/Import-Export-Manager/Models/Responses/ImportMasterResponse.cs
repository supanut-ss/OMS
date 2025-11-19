namespace Import_Export_Manager.Models.Responses
{
    public class ImportMasterResponse
    {
        public string code { get; set; }
        public string message { get; set; }
        public List<ImportMasterListResponse?> data { get; set; }
        public int total { get; set; }
    }
    public class ImportMasterListResponse
    {
        public int import_id { get; set; }
        public string import_name { get; set; }
        public string? description { get; set; }
        public string exec_sql_command { get; set; }
        public string? excel_example_file_path { get; set; }
        public int seq { get; set; }
        public string is_active { get; set; }
        public string confirm_message { get; set; }
        public string create_by { get; set; }
        public DateTime created_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }
    }
}
