namespace ApiCore.Models.Requests
{
    public class InvoiceRequest
    {
        public int? project_invoice_id { get; set; }
        public int project_header_id { get; set; }
        public string document_type { get; set; }
        public string document_no { get; set; }
        public DateTime document_date { get; set; }
        public DateTime? due_date { get; set; }
        public decimal? amount { get; set; }
        public string description { get; set; } = string.Empty;
    }
}
