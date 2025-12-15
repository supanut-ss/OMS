namespace ApiCore.Models.Responses
{
    public class InvoiceHistoryResponse
    {
        public int project_invoice_id { get; set; }
        public int project_header_id { get; set; }
        public string document_type { get; set; }
        public string document_no { get; set; }
        public DateTime document_date { get; set; }
        public DateTime? due_date { get; set; }
        public decimal? amount { get; set; }
        public string? description { get; set; }
        public string is_incentive_requested { get; set; }
        public string is_cancel { get; set; }
        public string create_by { get; set; }
        public DateTime create_date { get; set; }
        public string update_by { get; set; }
        public DateTime? update_date { get; set; }
    }
    public class InvoiceResponse
    {
        public string message_code { get; set; }
        public string message_text { get; set; }
    }
}
