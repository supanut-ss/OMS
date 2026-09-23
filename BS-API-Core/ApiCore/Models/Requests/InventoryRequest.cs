using System.Text.Json.Serialization;

namespace ApiCore.Models.Requests
{
    // 1. ตัวหลักสำหรับรับ Request (Header)
    public class ChangeLocationRequest
    {
        [JsonPropertyName("inventory_id_serials")]
        public List<string> InventoryIdSerials { get; set; } = new();

        [JsonPropertyName("location")]
        public string Location { get; set; } // โลเคชันปลายทางที่ทุก ID จะย้ายไปร่วมกัน

        [JsonPropertyName("quantity")]
        public decimal? Quantity { get; set; }

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }

        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("lang")]
        public string? Lang { get; set; }
    }

    // --- สำหรับ Status Change ---
    public class StatusChangeRequest
    {
        [JsonPropertyName("inventory_id_serials")]
        public List<string> InventoryIdSerials { get; set; } = new();

        [JsonPropertyName("inventory_status")]
        public string InventoryStatus { get; set; } = string.Empty; // สถานะใหม่ที่ทุก ID จะเปลี่ยนร่วมกัน

        [JsonPropertyName("quantity")]
        public decimal? Quantity { get; set; }

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }
        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("lang")]
        public string? Lang { get; set; }
    }
    public class AdjustmentRequest
    {
        [JsonPropertyName("items")]
        public List<AdjustmentItemDetail> Items { get; set; } = new();
        [JsonPropertyName("adjustment_type")]
        public string? AdjustmentType { get; set; }
        [JsonPropertyName("remark")]
        public string? Remark { get; set; }
        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("lang")]
        public string? Lang { get; set; }
    }
    public class AdjustmentItemDetail
    {
        [JsonPropertyName("inventory_id_serials")]
        public string InventoryIdSerials { get; set; }

        [JsonPropertyName("quantity")]
        public decimal Quantity { get; set; }
        [JsonPropertyName("serial_number")]
        public string? SerialNumber { get; set; }

    }
    public class AdjustInRequest
    {
        [JsonPropertyName("item_number")]
        public string ItemNumber { get; set; }
        [JsonPropertyName("lot_number")]
        public string? LotNumber { get; set; }
        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }
        [JsonPropertyName("serial_number")]
        public string? SerialNumber { get; set; }
        [JsonPropertyName("quantity")]
        public decimal Quantity { get; set; }
        [JsonPropertyName("location")]
        public string Location { get; set; }
        [JsonPropertyName("inv_status")]
        public string InventoryStatus { get; set; }
        [JsonPropertyName("receive_date")]
        public DateTime ReceiveDate { get; set; }
        [JsonPropertyName("remark")]
        public string? Remark { get; set; }
        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("lang")]
        public string? Lang { get; set; }
    }
    public class InventorySerial
    {
        [JsonPropertyName("inventory_id")]
        public int InventoryId { get; set; }
        [JsonPropertyName("warehouse_id")]
        public int? WarehouseId { get; set; }
        [JsonPropertyName("warehouse")]
        public string? Warehouse { get; set; }
        [JsonPropertyName("owner_id")]
        public int? OwnerId { get; set; }
        [JsonPropertyName("owner_code")]
        public string? OwnerCode { get; set; }
        [JsonPropertyName("zone_id")]
        public int? ZoneId { get; set; }
        [JsonPropertyName("zone")]
        public string? Zone { get; set; }
        [JsonPropertyName("location_id")]
        public int? LocationId { get; set; }
        [JsonPropertyName("location")]
        public string? Location { get; set; }
        [JsonPropertyName("loc_type")]
        public string? LocationType { get; set; }
        [JsonPropertyName("item_master_id")]
        public int? ItemMasterId { get; set; }
        [JsonPropertyName("item_number")]
        public string? ItemNumber { get; set; }
        [JsonPropertyName("item_description")]
        public string? ItemDescription { get; set; }
        [JsonPropertyName("category_id")]
        public int? CategoryId { get; set; }
        [JsonPropertyName("item_category")]
        public string? ItemCategory { get; set; }
        [JsonPropertyName("uom")]
        public string? Uom { get; set; }
        [JsonPropertyName("quantity")]
        public decimal? Quantity { get; set; }
        [JsonPropertyName("quantity_allocated")]
        public decimal? QuantityAllocated { get; set; }
        [JsonPropertyName("inv_status")]
        public string? InventoryStatus { get; set; }
        [JsonPropertyName("receive_date")]
        public DateTime? ReceiveDate { get; set; }
        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }
        [JsonPropertyName("lot_number")]
        public string? LotNumber { get; set; }
        [JsonPropertyName("serial_number")]
        public string? SerialNumber { get; set; }
    }
}
