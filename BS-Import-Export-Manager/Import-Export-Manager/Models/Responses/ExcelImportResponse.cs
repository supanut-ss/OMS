namespace Import_Export_Manager.Models.Responses
{
    public class ExcelImportResponse
    {
        public string code { get; set; }
        public string message { get; set; }
        public List<ExcelImportListResponse>? data { get; set; }  // ✅ เปลี่ยนจาก object → List
        public int total { get; set; }  // ✅ จำนวนรายการใน data
    }

    public class ExcelImportListResponse
    {
        public string code { get; set; }
        public string message { get; set; }
        public string records { get; set; }
    }
}
