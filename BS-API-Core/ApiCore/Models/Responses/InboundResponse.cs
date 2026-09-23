using System.Text.Json.Serialization;

namespace ApiCore.Models.Responses
{
    public class InboundResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("inbound_master_id")]
        public long? InboundMasterId { get; set; }

        [JsonPropertyName("inbound_order_number")]
        public string? InboundOrderNumber { get; set; }

        [JsonPropertyName("data")]
        public object? Data { get; set; }
    }

    public class DeleteInboundOrderResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }

    public class CloseInboundOrderResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }

    public class ReceiptResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        //[JsonPropertyName("receipt_no")]
        //public string? ReceiptNo { get; set; }

        //[JsonPropertyName("data")]
        //public object? Data { get; set; }
    }

    public class ReceiptHeaderResponse
    {
        [JsonPropertyName("receipt_header_id")]
        public int ReceiptHeaderId { get; set; }

        [JsonPropertyName("receipt_number")]
        public string? ReceiptNumber { get; set; }

        [JsonPropertyName("inbound_master_id")]
        public int? InboundMasterId { get; set; }

        [JsonPropertyName("inbound_order_number")]
        public string? InboundOrderNumber { get; set; }

        [JsonPropertyName("receipt_status")]
        public string? ReceiptStatus { get; set; }

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
        public string? UserDef7 { get; set; }

        [JsonPropertyName("user_def8")]
        public string? UserDef8 { get; set; }

        [JsonPropertyName("user_def9")]
        public string? UserDef9 { get; set; }

        [JsonPropertyName("user_def10")]
        public string? UserDef10 { get; set; }

        [JsonPropertyName("close_by")]
        public string? CloseBy { get; set; }

        [JsonPropertyName("close_date")]
        public DateTime? CloseDate { get; set; }

        [JsonPropertyName("create_by")]
        public string? CreateBy { get; set; }

        [JsonPropertyName("create_date")]
        public DateTime? CreateDate { get; set; }

        [JsonPropertyName("update_by")]
        public string? UpdateBy { get; set; }

        [JsonPropertyName("update_date")]
        public DateTime? UpdateDate { get; set; }
    }

    public class InboundDetailResponse
    {
        [JsonPropertyName("inbound_detail_id")]
        public int InboundDetailId { get; set; }

        [JsonPropertyName("inbound_master_id")]
        public int InboundMasterId { get; set; }

        [JsonPropertyName("inbound_order_number")]
        public string? InboundOrderNumber { get; set; }

        [JsonPropertyName("line_number")]
        public int? LineNumber { get; set; }

        [JsonPropertyName("item_master_id")]
        public int? ItemMasterId { get; set; }

        [JsonPropertyName("item_number")]
        public string? ItemNumber { get; set; }

        [JsonPropertyName("item_description")]
        public string? ItemDescription { get; set; }

        [JsonPropertyName("item_uom_id")]
        public int? ItemUomId { get; set; }

        [JsonPropertyName("uom")]
        public string? Uom { get; set; }

        [JsonPropertyName("quantity_order")]
        public decimal? QuantityOrder { get; set; }

        [JsonPropertyName("quantity_received")]
        public decimal? QuantityReceived { get; set; }

        [JsonPropertyName("inv_status")]
        public string? InvStatus { get; set; }

        [JsonPropertyName("lot_number")]
        public string? LotNumber { get; set; }

        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }

        [JsonPropertyName("serial_number")]
        public string? SerialNumber { get; set; }

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
        public string? UserDef7 { get; set; }

        [JsonPropertyName("user_def8")]
        public string? UserDef8 { get; set; }

        [JsonPropertyName("user_def9")]
        public string? UserDef9 { get; set; }

        [JsonPropertyName("user_def10")]
        public string? UserDef10 { get; set; }

        [JsonPropertyName("create_by")]
        public string? CreateBy { get; set; }

        [JsonPropertyName("create_date")]
        public DateTime? CreateDate { get; set; }

        [JsonPropertyName("update_by")]
        public string? UpdateBy { get; set; }

        [JsonPropertyName("update_date")]
        public DateTime? UpdateDate { get; set; }

        [JsonPropertyName("lot_control")]
        public string? LotControl { get; set; }

        [JsonPropertyName("expiry_date_control")]
        public string? ExpiryDateControl { get; set; }

        [JsonPropertyName("sn_control")]
        public string? SnControl { get; set; }
    }
}
