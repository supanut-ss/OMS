namespace AiAssistant.Models.Responses
{
    public class GenerateDashboardResponse
    {
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string Question { get; set; } = "";
        public object? Widget { get; set; }
        public DateTime GeneratedAt { get; set; }
        public int DataPoints { get; set; }
    }
}
