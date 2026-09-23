namespace ApiCore.Models.Responses
{
    public class ApiResponse<T>
    {
        public int message_code { get; set; }
        public string? message_text { get; set; }
        public T? data { get; set; }
    }
}
