using System.Text.Json.Serialization;

namespace ApiCore.Models.Requests
{
    public class SaveInboundRequest
    {
        [JsonPropertyName("inbound_master_id")]
        public long? InboundMasterId { get; set; }

        [JsonPropertyName("inbound_order_number")]
        public string? InboundOrderNumber { get; set; }

        [JsonPropertyName("warehouse_id")]
        public int WarehouseId { get; set; }

        [JsonPropertyName("warehouse")]
        public string? Warehouse { get; set; }

        [JsonPropertyName("owner_id")]
        public int OwnerId { get; set; }

        [JsonPropertyName("owner_code")]
        public string? OwnerCode { get; set; }

        [JsonPropertyName("order_type")]
        public string? OrderType { get; set; }

        [JsonPropertyName("order_status")]
        public string OrderStatus { get; set; } = "OPEN";

        [JsonPropertyName("order_date")]
        public DateTime OrderDate { get; set; }

        [JsonPropertyName("supplier_id")]
        public int? SupplierId { get; set; }

        [JsonPropertyName("customer_id")]
        public int? CustomerId { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("expected_delivery_date")]
        public DateTime? ExpectedDeliveryDate { get; set; }

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }

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

        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }

        [JsonPropertyName("details")]
        public List<InboundDetailItem> Details { get; set; } = new();
    }

    public class InboundDetailItem
    {
        [JsonPropertyName("action")]
        public string Action { get; set; } = "update"; // "update" or "delete"

        [JsonPropertyName("line_number")]
        public int LineNumber { get; set; }

        [JsonPropertyName("item_master_id")]
        public int ItemMasterId { get; set; }

        [JsonPropertyName("item_number")]
        public string ItemNumber { get; set; } = string.Empty;

        [JsonPropertyName("item_description")]
        public string ItemDescription { get; set; } = string.Empty;

        [JsonPropertyName("item_uom_id")]
        public int ItemUomId { get; set; }

        [JsonPropertyName("uom")]
        public string Uom { get; set; } = string.Empty;

        [JsonPropertyName("quantity_order")]
        public decimal QuantityOrder { get; set; }

        [JsonPropertyName("quantity_received")]
        public decimal QuantityReceived { get; set; }

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
        public decimal? UserDef7 { get; set; }

        [JsonPropertyName("user_def8")]
        public decimal? UserDef8 { get; set; }

        [JsonPropertyName("user_def9")]
        public DateTime? UserDef9 { get; set; }

        [JsonPropertyName("user_def10")]
        public DateTime? UserDef10 { get; set; }
    } 

    public class DeleteInboundOrderRequest
    {
        [JsonPropertyName("inbound_master_id")]
        public int InboundMasterId { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }
    }

    public class CloseInboundOrderRequest
    {
        [JsonPropertyName("inbound_master_id")]
        public int InboundMasterId { get; set; }

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }
    }
}
