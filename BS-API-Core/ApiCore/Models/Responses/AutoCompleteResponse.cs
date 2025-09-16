namespace ApiCore.Models.Responses
{
    public class AutoCompleteResponse
    {
        public string message_code { get; set; } = "0";
        public string message_text { get; set; } = "success";
        public List<Dictionary<string, object>>? data { get; set; } = new List<Dictionary<string, object>>();
    }
}
