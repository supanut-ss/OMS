namespace BS_Printing_Manager.Models.Request
{
    public class PdfGenerateRequest
    {
        public string html { get; set; } = default!;
        public string? css { get; set; }
        public string page_size { get; set; } = "A4";
        public string orientation { get; set; } = "Portrait";
    }
}
