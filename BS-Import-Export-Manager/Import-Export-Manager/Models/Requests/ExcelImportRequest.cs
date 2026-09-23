namespace Import_Export_Manager.Models.Requests
{
    public class ExcelImportRequest
    {
        public string user_id { get; set; }
        public int import_id { get; set; }
        public string? lang { get; set; }
        public List<IFormFile> files { get; set; }
        public string? device { get; set; }
    }
}
