namespace Import_Export_Manager.Models.Responses
{
    public class ImportUploadHistoryResponse
    {
        public string code { get; set; } = "0";
        public string message { get; set; } = "Success";
        public List<ImportUploadHistoryItemResponse> data { get; set; } = new();
        public int total { get; set; }
    }

    public class ImportUploadHistoryItemResponse
    {
        public long import_history_id { get; set; }
        public int import_id { get; set; }
        public DateTime import_date { get; set; }
        public string file_name { get; set; } = string.Empty;
        public int total_rows { get; set; }
        public int success { get; set; }
        public int failed { get; set; }
        public string imported_by { get; set; } = string.Empty;
        public string status { get; set; } = string.Empty;
    }
}
