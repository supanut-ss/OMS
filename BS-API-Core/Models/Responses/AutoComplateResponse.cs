namespace BS_API_Core.Models.Responses
{
    public class AutoComplateResponse
    {
        public string message_code { get; set; } = "0";
        public string message_text { get; set; } = "success";
        public List<AutoComplateItem>? data { get; set; } = new List<AutoComplateItem>();
    }
    public class AutoComplateItem
    {
        public string code { get; set; }
        public string value { get; set; }
    }
}
