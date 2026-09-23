namespace Import_Export_Manager.Models.Responses
{
    public class ImportColumnDefinitionResponse
    {
        public string field { get; set; } = string.Empty;
        public string headerName { get; set; } = string.Empty;
        public int width { get; set; } = 150;
        public string type { get; set; } = "string";
        public bool display { get; set; } = true;
    }

    public class ImportGridConfigResponse
    {
        public string code { get; set; } = string.Empty;
        public string message { get; set; } = string.Empty;
        public List<ImportColumnDefinitionResponse> columns { get; set; } = new();
        public List<Dictionary<string, object?>> data { get; set; } = new();
        public int total { get; set; } = 0;
    }
}
