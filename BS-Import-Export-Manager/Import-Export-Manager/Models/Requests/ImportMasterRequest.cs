namespace Import_Export_Manager.Models.Requests
{
    public class ImportMasterRequest
    {
        public string import_name { get; set; }
        public string? description { get; set; }
        public string exec_sql_command { get; set; }
        public string? excel_example_file_path { get; set; }
        public int seq { get; set; }
        public string is_active { get; set; }
        public string confirm_message { get; set; }
        public string create_by { get; set; }
        public string? update_by { get; set; }
    }
}
