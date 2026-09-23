using System.Text.Json.Serialization;

namespace ApiCore.Models.Requests
{
    public class OutboundRequest
    {
        [JsonPropertyName("outbound_master")]
        public OutboundMasterRequest OutboundMaster { get; set; } = new();

        [JsonPropertyName("outbound_details")]
        public List<OutboundDetailRequest> OutboundDetails { get; set; } = new();
    }

    public class OutboundMasterRequest
    {
        [JsonPropertyName("outbound_master_id")]
        public int? outbound_master_id { get; set; }

        [JsonPropertyName("outbound_order_number")]
        public string? outbound_order_number { get; set; }

        [JsonPropertyName("warehouse_id")]
        public int? warehouse_id { get; set; }

        [JsonPropertyName("warehouse")]
        public string? warehouse { get; set; }

        [JsonPropertyName("owner_id")]
        public int? owner_id { get; set; }

        [JsonPropertyName("owner_code")]
        public string? owner_code { get; set; }

        [JsonPropertyName("order_type")]
        public string? order_type { get; set; }

        [JsonPropertyName("order_status")]
        public string? order_status { get; set; }

        [JsonPropertyName("description")]
        public string? description { get; set; }

        [JsonPropertyName("order_date")]
        public DateTime? order_date { get; set; }

        [JsonPropertyName("delivery_date_plan")]
        public DateTime? delivery_date_plan { get; set; }

        [JsonPropertyName("ship_date_plan")]
        public DateTime? ship_date_plan { get; set; }

        [JsonPropertyName("delivery_date_actual")]
        public DateTime? delivery_date_actual { get; set; }

        [JsonPropertyName("ship_date_actual")]
        public DateTime? ship_date_actual { get; set; }

        [JsonPropertyName("release_by")]
        public string? release_by { get; set; }

        [JsonPropertyName("release_date")]
        public DateTime? release_date { get; set; }

        [JsonPropertyName("close_by")]
        public string? close_by { get; set; }

        [JsonPropertyName("close_date")]
        public DateTime? close_date { get; set; }

        [JsonPropertyName("close_remark")]
        public string? close_remark { get; set; }

        [JsonPropertyName("cancel_by")]
        public string? cancel_by { get; set; }

        [JsonPropertyName("cancel_date")]
        public DateTime? cancel_date { get; set; }

        [JsonPropertyName("cancel_remark")]
        public string? cancel_remark { get; set; }

        [JsonPropertyName("customer_order_number")]
        public string? customer_order_number { get; set; }

        [JsonPropertyName("customer_purchase_order")]
        public string? customer_purchase_order { get; set; }

        [JsonPropertyName("customer_id")]
        public int? customer_id { get; set; }

        [JsonPropertyName("customer_code")]
        public string? customer_code { get; set; }

        [JsonPropertyName("customer_name")]
        public string? customer_name { get; set; }

        [JsonPropertyName("customer_address_line1")]
        public string? customer_address_line1 { get; set; }

        [JsonPropertyName("customer_address_line2")]
        public string? customer_address_line2 { get; set; }

        [JsonPropertyName("customer_address_line3")]
        public string? customer_address_line3 { get; set; }

        [JsonPropertyName("ship_to_code")]
        public string? ship_to_code { get; set; }

        [JsonPropertyName("ship_to_name")]
        public string? ship_to_name { get; set; }

        [JsonPropertyName("ship_to_address_line1")]
        public string? ship_to_address_line1 { get; set; }

        [JsonPropertyName("ship_to_address_line2")]
        public string? ship_to_address_line2 { get; set; }

        [JsonPropertyName("ship_to_address_line3")]
        public string? ship_to_address_line3 { get; set; }

        [JsonPropertyName("pick_type")]
        public string? pick_type { get; set; }

        [JsonPropertyName("remark")]
        public string? remark { get; set; }

        [JsonPropertyName("user_def1")]
        public string? user_def1 { get; set; }

        [JsonPropertyName("user_def2")]
        public string? user_def2 { get; set; }

        [JsonPropertyName("user_def3")]
        public string? user_def3 { get; set; }

        [JsonPropertyName("user_def4")]
        public string? user_def4 { get; set; }

        [JsonPropertyName("user_def5")]
        public string? user_def5 { get; set; }

        [JsonPropertyName("user_def6")]
        public string? user_def6 { get; set; }

        [JsonPropertyName("user_def7")]
        public decimal? user_def7 { get; set; }

        [JsonPropertyName("user_def8")]
        public decimal? user_def8 { get; set; }

        [JsonPropertyName("user_def9")]
        public DateTime? user_def9 { get; set; }

        [JsonPropertyName("user_def10")]
        public DateTime? user_def10 { get; set; }

        [JsonPropertyName("create_by")]
        public string? create_by { get; set; }

        [JsonPropertyName("create_date")]
        public DateTime? create_date { get; set; }

        [JsonPropertyName("update_by")]
        public string? update_by { get; set; }

        [JsonPropertyName("update_date")]
        public DateTime? update_date { get; set; }
    }

    public class OutboundDetailRequest
    {
        [JsonPropertyName("outbound_detail_id")]
        public long? outbound_detail_id { get; set; }

        [JsonPropertyName("outbound_master_id")]
        public int? outbound_master_id { get; set; }

        [JsonPropertyName("outbound_order_number")]
        public string? outbound_order_number { get; set; }

        [JsonPropertyName("line_number")]
        public string? line_number { get; set; }

        [JsonPropertyName("item_master_id")]
        public int? item_master_id { get; set; }

        [JsonPropertyName("item_number")]
        public string? item_number { get; set; }

        [JsonPropertyName("item_description")]
        public string? item_description { get; set; }

        [JsonPropertyName("price")]
        public decimal? price { get; set; }

        [JsonPropertyName("item_uom_id")]
        public int? item_uom_id { get; set; }

        [JsonPropertyName("uom")]
        public string? uom { get; set; }

        [JsonPropertyName("quantity_order")]
        public decimal? quantity_order { get; set; }

        [JsonPropertyName("quantity_pick")]
        public decimal? quantity_pick { get; set; }

        [JsonPropertyName("quantity_stage")]
        public decimal? quantity_stage { get; set; }

        [JsonPropertyName("quantity_ship")]
        public decimal? quantity_ship { get; set; }

        [JsonPropertyName("inv_status")]
        public string? inv_status { get; set; }

        [JsonPropertyName("lot_number")]
        public string? lot_number { get; set; }

        [JsonPropertyName("expiry_date")]
        public DateTime? expiry_date { get; set; }

        [JsonPropertyName("serial_number")]
        public string? serial_number { get; set; }

        [JsonPropertyName("user_def1")]
        public string? user_def1 { get; set; }

        [JsonPropertyName("user_def2")]
        public string? user_def2 { get; set; }

        [JsonPropertyName("user_def3")]
        public string? user_def3 { get; set; }

        [JsonPropertyName("user_def4")]
        public string? user_def4 { get; set; }

        [JsonPropertyName("user_def5")]
        public string? user_def5 { get; set; }

        [JsonPropertyName("user_def6")]
        public string? user_def6 { get; set; }

        [JsonPropertyName("user_def7")]
        public decimal? user_def7 { get; set; }

        [JsonPropertyName("user_def8")]
        public decimal? user_def8 { get; set; }

        [JsonPropertyName("user_def9")]
        public DateTime? user_def9 { get; set; }

        [JsonPropertyName("user_def10")]
        public DateTime? user_def10 { get; set; }

        [JsonPropertyName("create_by")]
        public string? create_by { get; set; }

        [JsonPropertyName("create_date")]
        public DateTime? create_date { get; set; }

        [JsonPropertyName("update_by")]
        public string? update_by { get; set; }

        [JsonPropertyName("update_date")]
        public DateTime? update_date { get; set; }
    }
}
