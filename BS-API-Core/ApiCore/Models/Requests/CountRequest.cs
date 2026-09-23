using System.Text.Json.Serialization;

namespace ApiCore.Models.Requests
{
    public class CountMasterRequest
    {
        [JsonPropertyName("count_master_id")]
        public long CountMasterId { get; set; }

        [JsonPropertyName("warehouse_id")]
        public int WarehouseId { get; set; }

        [JsonPropertyName("warehouse")]
        public string Warehouse { get; set; } = string.Empty;

        [JsonPropertyName("owner_id")]
        public int OwnerId { get; set; }

        [JsonPropertyName("owner_code")]
        public string OwnerCode { get; set; } = string.Empty;

        [JsonPropertyName("count_number")]
        public string CountNumber { get; set; } = string.Empty;

        [JsonPropertyName("count_status")]
        public string CountStatus { get; set; } = string.Empty;

        [JsonPropertyName("count_type")]
        public string CountType { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("device")]
        public string? Device { get; set; } 

        [JsonPropertyName("language")]
        public string? Language { get; set; }

        [JsonPropertyName("details")]
        public List<CountDetailRequest> Details { get; set; } = new();

        [JsonPropertyName("count_plan_date")]
        public string? CountPlanDate { get; set; }

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }

    }

    public class CountDetailRequest
    {
        [JsonPropertyName("count_detail_id")]
        public long CountDetailId { get; set; }

        [JsonPropertyName("count_master_id")]
        public long CountMasterId { get; set; }

        [JsonPropertyName("location_id")]
        public int LocationId { get; set; }

        [JsonPropertyName("location")]
        public string Location { get; set; } = string.Empty;

        [JsonPropertyName("item_master_id")]
        public int ItemMasterId { get; set; }

        [JsonPropertyName("item_number")]
        public string ItemNumber { get; set; } = string.Empty;

        [JsonPropertyName("item_description")]
        public string? ItemDescription { get; set; }

        [JsonPropertyName("quantity_stock")]
        public decimal QuantityStock { get; set; }

        //[JsonPropertyName("quantity_count")]
        //public decimal QuantityCount { get; set; }

        [JsonPropertyName("item_uom_id")]
        public int ItemUomId { get; set; }

        [JsonPropertyName("uom")]
        public string Uom { get; set; } = string.Empty;

        [JsonPropertyName("inv_status")]
        public string InvStatus { get; set; } = string.Empty;

        [JsonPropertyName("lot_number")]
        public string? LotNumber { get; set; }

        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }

        [JsonPropertyName("serial_number")]
        public string? SerialNumber { get; set; }

        [JsonPropertyName("receive_date")]
        public DateTime ReceiveDate { get; set; }

        //[JsonPropertyName("count_by")]
        //public string? CountBy { get; set; }

        //[JsonPropertyName("count_date")]
        //public DateTime? CountDate { get; set; }

        //[JsonPropertyName("create_by")]
        //public string CreateBy { get; set; } = string.Empty;

        //[JsonPropertyName("create_date")]
        //public DateTime CreateDate { get; set; }

    }


    public class DeleteCountRequest
    {
        [JsonPropertyName("count_master_id")]
        public int CountMasterId { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [JsonPropertyName("device")]
        public string? Device { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }
    }

    public class CountCycleRequest
    {
        [JsonPropertyName("location_from")]
        public string? LocationFrom { get; set; }

        [JsonPropertyName("location_to")]
        public string? LocationTo { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("item_number")]
        public string? ItemNumber { get; set; }
    }
}