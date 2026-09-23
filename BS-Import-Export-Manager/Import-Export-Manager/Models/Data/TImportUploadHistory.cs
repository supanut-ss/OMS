namespace Import_Export_Manager.Models.Data
{
    public class TImportUploadHistory
    {
        public long ImportHistoryId { get; set; }
        public int ImportId { get; set; }
        public DateTime ImportDate { get; set; }
        public string FileName { get; set; } = string.Empty;
        public int TotalRows { get; set; }
        public int SuccessRows { get; set; }
        public int FailedRows { get; set; }
        public string ImportedBy { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}
