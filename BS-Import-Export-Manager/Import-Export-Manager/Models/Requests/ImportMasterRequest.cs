namespace Import_Export_Manager.Models.Requests
{
    public class ImportMasterRequest
    {
        public string import_name { get; set; }
        public string? description { get; set; }
        public string exec_sql_command { get; set; }
        public int seq { get; set; }
        public bool is_active { get; set; }
        public string? confirm_message_th { get; set; }
        public string? confirm_message_en { get; set; }
        public string? confirm_message_other { get; set; }
        public int import_batch_size { get; set; }
        public string import_temp_table_name { get; set; }
        public string create_by { get; set; }
        public string? update_by { get; set; }
    }
}
