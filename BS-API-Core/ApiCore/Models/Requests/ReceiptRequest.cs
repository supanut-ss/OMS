using System.Text.Json.Serialization;

namespace ApiCore.Models.Requests
{
    public class GetReceiptRequest
    {
        [JsonPropertyName("receipt_header_id")]
        public int ReceiptHeaderId { get; set; }
    }

    public class CloseReceiptRequest
    {
        [JsonPropertyName("inbound_master_id")]
        public long? InboundMasterId { get; set; }

        [JsonPropertyName("receipt_header_id")]
        public string? ReceiptHeaderId { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }
    }

    public class SaveReceiptRequest
    {
        [JsonPropertyName("receipt_header_id")]
        public int ReceiptHeaderId { get; set; }

        [JsonPropertyName("inbound_master_id")]
        public long InboundMasterId { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [JsonPropertyName("user_def1")]
        public string? UserDef1 { get; set; }

        [JsonPropertyName("user_def2")]
        public string? UserDef2 { get; set; }

        [JsonPropertyName("user_def3")]
        public string? UserDef3 { get; set; }

        [JsonPropertyName("user_def4")]
        public string? UserDef4 { get; set; }

        [JsonPropertyName("user_def5")]
        public string? UserDef5 { get; set; }

        [JsonPropertyName("user_def6")]
        public string? UserDef6 { get; set; }

        [JsonPropertyName("user_def7")]
        public decimal? UserDef7 { get; set; }

        [JsonPropertyName("user_def8")]
        public decimal? UserDef8 { get; set; }

        [JsonPropertyName("user_def9")]
        public DateTime? UserDef9 { get; set; }

        [JsonPropertyName("user_def10")]
        public DateTime? UserDef10 { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }

    }

    public class ReceiptDetailItem
    {
        [JsonPropertyName("item_code")]
        public string? ItemCode { get; set; }

        [JsonPropertyName("item_name")]
        public string? ItemName { get; set; }

        [JsonPropertyName("received_quantity")]
        public decimal ReceivedQuantity { get; set; }

        [JsonPropertyName("unit_code")]
        public string? UnitCode { get; set; }

        [JsonPropertyName("lot_no")]
        public string? LotNo { get; set; }

        [JsonPropertyName("location")]
        public string? Location { get; set; }

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }
    }
}
