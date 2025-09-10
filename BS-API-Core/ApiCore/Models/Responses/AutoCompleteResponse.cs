namespace ApiCore.Models.Responses
{
    public class AutoCompleteResponse
    {
        public string message_code { get; set; } = "0";
        public string message_text { get; set; } = "success";
        public List<AutoCompleteItem>? data { get; set; } = new List<AutoCompleteItem>();
    }
    public class AutoCompleteItem
    {
        public string code { get; set; } = string.Empty;
        public string value { get; set; } = string.Empty;
    }
}
