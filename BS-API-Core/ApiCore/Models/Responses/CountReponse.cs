using System.Text.Json.Serialization;

namespace ApiCore.Models.Responses
{
    public class CountResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("count_master_id")]
        public long? CountMasterId { get; set; }

        [JsonPropertyName("count_number")]
        public string? CountNumber { get; set; }

        [JsonPropertyName("data")]
        public object? Data { get; set; }
    }

    public class CountCycleResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }
        [JsonPropertyName("message")]
        public string? Message { get; set; }
        [JsonPropertyName("data")]
        public List<CountCycleDetailResponse>? Data { get; set; }
    }

    public class CountCycleDetailResponse
    {
        [JsonPropertyName("inventory_id_serial")]
        public string? InventoryIdSerial { get; set; }  

        [JsonPropertyName("inventory_id")]
        public long InventoryId { get; set; }

        [JsonPropertyName("warehouse_id")]
        public int WarehouseId { get; set; }

        [JsonPropertyName("warehouse")]
        public string Warehouse { get; set; } = string.Empty;

        [JsonPropertyName("owner_id")]
        public int OwnerId { get; set; }

        [JsonPropertyName("owner_code")]
        public string OwnerCode { get; set; } = string.Empty;

        [JsonPropertyName("zone_id")]
        public int? ZoneId { get; set; }

        [JsonPropertyName("zone")]
        public string? Zone { get; set; }

        [JsonPropertyName("location_id")]
        public int? LocationId { get; set; }

        [JsonPropertyName("location")]
        public string? Location { get; set; }

        [JsonPropertyName("loc_type")]
        public string? LocType { get; set; }
         
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

        [JsonPropertyName("item_uom_id")]
        public int? ItemUomId { get; set; }

        [JsonPropertyName("uom")]
        public string? Uom { get; set; }

        [JsonPropertyName("quantity")]
        public decimal? Quantity { get; set; }= 0;

        [JsonPropertyName("quantity_allocated")]
        public decimal? QuantityAllocated { get; set; }= 0;

        [JsonPropertyName("inv_status")]
        public string? InvStatus { get; set; }

        [JsonPropertyName("receive_date")]
        public DateTime? ReceiveDate { get; set; }

        [JsonPropertyName("lot_number")]
         public string? LotNumber { get; set; }

        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }

        [JsonPropertyName("serial_number")]
        public string? SerialNumber { get; set; }
    }

    public class DeleteCountResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
