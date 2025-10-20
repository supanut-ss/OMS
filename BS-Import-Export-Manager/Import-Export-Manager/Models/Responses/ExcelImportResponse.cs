namespace Import_Export_Manager.Models.Responses
{
    public class ExcelImportResponse
    {
        public string code { get; set; }
        public string message { get; set; }
        public ExcelImportListResponse? data { get; set; }
    }
    public class ExcelImportListResponse
    {
        public string code { get; set; }
        public string message { get; set; }
        public int records { get; set; }
    }
}
