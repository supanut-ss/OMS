using System.Text.Json.Serialization;

namespace ApiCore.Models.Responses
{
    public class OutboundResponse
    {
        [JsonPropertyName("message_status")]
        public string MessageStatus { get; set; }
        [JsonPropertyName("message_code")]
        public int MessageCode { get; set; }
        [JsonPropertyName("data")]
        public object Data { get; set; }
    }
    public class OutboundMaster
    {
        [JsonPropertyName("outbound_master_id")]
        public int OutboundMasterId { get; set; }
        [JsonPropertyName("outbound_order_number")]
        public string OutboundOrderNumber { get; set; }
        [JsonPropertyName("warehouse_id")]
        public int WarehouseId { get; set; }
        [JsonPropertyName("warehouse")]
        public string Warehouse { get; set; }
        [JsonPropertyName("owner_id")]
        public int OwnerId { get; set; }
        [JsonPropertyName("owner_code")]
        public string OwnerCode { get; set; }
        [JsonPropertyName("order_type")]
        public string OrderType { get; set; }
        [JsonPropertyName("order_status")]
        public string OrderStatus { get; set; }
        [JsonPropertyName("description")]
        public string Description { get; set; }
        [JsonPropertyName("order_date")]
        public DateTime OrderDate { get; set; }
        [JsonPropertyName("delivery_date_plan")]
        public DateTime? DeliveryDatePlan { get; set; }
        [JsonPropertyName("ship_date_plan")]
        public DateTime? ShipDatePlan { get; set; }
        [JsonPropertyName("delivery_date_actual")]
        public DateTime? DeliveryDateActual { get; set; }
        [JsonPropertyName("ship_date_actual")]
        public DateTime? ShipDateActual { get; set; }
        [JsonPropertyName("release_by")]
        public string ReleaseBy { get; set; }
        [JsonPropertyName("release_date")]
        public DateTime? ReleaseDate { get; set; }
        [JsonPropertyName("close_by")]
        public string CloseBy { get; set; }
        [JsonPropertyName("close_date")]
        public DateTime? CloseDate { get; set; }
        [JsonPropertyName("close_remark")]
        public string CloseRemark { get; set; }
        [JsonPropertyName("cancel_by")]
        public string CancelBy { get; set; }
        [JsonPropertyName("cancel_date")]
        public DateTime? CancelDate { get; set; }
        [JsonPropertyName("cancel_remark")]
        public string CancelRemark { get; set; }
        [JsonPropertyName("customer_order_number")]
        public string CustomerOrderNumber { get; set; }
        [JsonPropertyName("customer_purchase_order")]
        public string CustomerPurchaseOrder { get; set; }
        [JsonPropertyName("customer_id")]
        public int CustomerId { get; set; }
        [JsonPropertyName("customer_code")]
        public string CustomerCode { get; set; }
        [JsonPropertyName("customer_name")]
        public string CustomerName { get; set; }
        [JsonPropertyName("customer_address_line1")]
        public string CustomerAddressLine1 { get; set; }
        [JsonPropertyName("customer_address_line2")]
        public string CustomerAddressLine2 { get; set; }
        [JsonPropertyName("customer_address_line3")]
        public string CustomerAddressLine3 { get; set; }
        [JsonPropertyName("ship_to_code")]
        public string ShipToCode { get; set; }
        [JsonPropertyName("ship_to_name")]
        public string ShipToName { get; set; }
        [JsonPropertyName("ship_to_address_line1")]
        public string ShipToAddressLine1 { get; set; }
        [JsonPropertyName("ship_to_address_line2")]
        public string ShipToAddressLine2 { get; set; }
        [JsonPropertyName("ship_to_address_line3")]
        public string ShipToAddressLine3 { get; set; }
        [JsonPropertyName("pick_type")]
        public string PickType { get; set; }
        [JsonPropertyName("remark")]
        public string Remark { get; set; }
        [JsonPropertyName("user_def1")]
        public string UserDef1 { get; set; }
        [JsonPropertyName("user_def2")]
        public string UserDef2 { get; set; }
        [JsonPropertyName("user_def3")]
        public string UserDef3 { get; set; }
        [JsonPropertyName("user_def4")]
        public string UserDef4 { get; set; }
        [JsonPropertyName("user_def5")]
        public string UserDef5 { get; set; }
        [JsonPropertyName("user_def6")]
        public string UserDef6 { get; set; }
        [JsonPropertyName("user_def7")]
        public string UserDef7 { get; set; }
        [JsonPropertyName("user_def8")]
        public string UserDef8 { get; set; }
        [JsonPropertyName("user_def9")]
        public string UserDef9 { get; set; }
        [JsonPropertyName("user_def10")]
        public string UserDef10 { get; set; }
        [JsonPropertyName("create_by")]
        public string CreateBy { get; set; }
        [JsonPropertyName("create_date")]
        public DateTime CreateDate { get; set; }
        [JsonPropertyName("update_by")]
        public string? UpdateBy { get; set; }
        [JsonPropertyName("update_date")]
        public DateTime? UpdateDate { get; set; }

    }
    public class OutboundDetails
    {
        [JsonPropertyName("outbound_detail_id")]
        public long OutboundDetailId { get; set; }
        [JsonPropertyName("outbound_master_id")]
        public int OutboundMasterId { get; set; }
        [JsonPropertyName("outbound_order_number")]
        public string OutboundOrderNumber { get; set; }
        [JsonPropertyName("line_number")]
        public int LineNumber { get; set; }
        [JsonPropertyName("item_master_id")]
        public int ItemMasterId { get; set; }
        [JsonPropertyName("item_number")]
        public string ItemNumber { get; set; }
        [JsonPropertyName("item_description")]
        public string ItemDescription { get; set; }
        [JsonPropertyName("price")]
        public decimal Price { get; set; }
        [JsonPropertyName("item_uom_id")]
        public int ItemUomId { get; set; }
        [JsonPropertyName("uom")]
        public string Uom { get; set; }
        [JsonPropertyName("quantity_order")]
        public decimal QuantityOrder { get; set; }
        [JsonPropertyName("quantity_pick")]
        public decimal QuantityPick { get; set; }
        [JsonPropertyName("quantity_stage")]
        public decimal QuantityStage { get; set; }
        [JsonPropertyName("quantity_ship")]
        public decimal QuantityShip { get; set; }
        [JsonPropertyName("inv_status")]
        public string InvStatus { get; set; }
        [JsonPropertyName("lot_number")]
        public string LotNumber { get; set; }
        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }
        [JsonPropertyName("serial_number")]
        public string SerialNumber { get; set; }
        [JsonPropertyName("user_def1")]
        public string UserDef1 { get; set; }
        [JsonPropertyName("user_def2")]
        public string UserDef2 { get; set; }
        [JsonPropertyName("user_def3")]
        public string UserDef3 { get; set; }
        [JsonPropertyName("user_def4")]
        public string UserDef4 { get; set; }
        [JsonPropertyName("user_def5")]
        public string UserDef5 { get; set; }
        [JsonPropertyName("user_def6")]
        public string UserDef6 { get; set; }
        [JsonPropertyName("user_def7")]
        public string UserDef7 { get; set; }
        [JsonPropertyName("user_def8")]
        public string UserDef8 { get; set; }
        [JsonPropertyName("user_def9")]
        public string UserDef9 { get; set; }
        [JsonPropertyName("user_def10")]
        public string UserDef10 { get; set; }
        [JsonPropertyName("create_by")]
        public string CreateBy { get; set; }
        [JsonPropertyName("create_date")]
        public DateTime CreateDate { get; set; }
        [JsonPropertyName("update_by")]
        public string? UpdateBy { get; set; }
        [JsonPropertyName("update_date")]
        public DateTime? UpdateDate { get; set; }
        [JsonPropertyName("lot_control")]
        public string LotControl { get; set; }
        [JsonPropertyName("expiry_date_control")]
        public string ExpiryDateControl { get; set; }
        [JsonPropertyName("sn_control")]
        public string SnControl { get; set; }
    }
    public class OutboundItemPickList
    {
        [JsonPropertyName("item_master_id")]
        public long ItemMasterId { get; set; }
        [JsonPropertyName("item_number")]
        public string ItemNumber { get; set; } = string.Empty;
        [JsonPropertyName("item_description")]
        public string ItemDescription { get; set; } = string.Empty;
        [JsonPropertyName("lot_number")]
        public string LotNumber { get; set; } = string.Empty;
        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }
        [JsonPropertyName("inv_status")]
        public string InvStatus { get; set; } = string.Empty;
        [JsonPropertyName("balance_qty")]
        public decimal BalanceQty { get; set; }
        [JsonPropertyName("inv_balance_qty")]
        public decimal InvBalanceQty { get; set; }
    }

    public class OutboundPickHeader
    {
        [JsonPropertyName("outbound_pick_header_id")]
        public long OutboundPickHeaderId { get; set; }
        [JsonPropertyName("pick_list_number")]
        public string PickListNumber { get; set; }
        [JsonPropertyName("outbound_master_id")]
        public int OutboundMasterId { get; set; }
        [JsonPropertyName("outbound_order_number")]
        public string OutboundOrderNumber { get; set; }
        [JsonPropertyName("pick_list_status")]
        public string PickListStatus { get; set; }
        [JsonPropertyName("pick_progress")]
        public string PickProgress { get; set; }
        [JsonPropertyName("total_pick_lines")]
        public int TotalPickLines { get; set; }
        [JsonPropertyName("total_quantity_plan")]
        public decimal TotalQuantityPlan { get; set; }
        [JsonPropertyName("total_quantity_pick")]
        public decimal TotalQuantityPick { get; set; }
        [JsonPropertyName("total_quantity_stage")]
        public decimal TotalQuantityStage { get; set; }
        [JsonPropertyName("total_quantity_ship")]
        public decimal TotalQuantityShip { get; set; }
        [JsonPropertyName("ship_by")]
        public string ShipBy { get; set; }
        [JsonPropertyName("ship_date")]
        public DateTime? ShipDate { get; set; }
        [JsonPropertyName("description")]
        public string Description { get; set; }
        [JsonPropertyName("create_by")]
        public string CreateBy { get; set; }
        [JsonPropertyName("create_date")]
        public DateTime CreateDate { get; set; }
        [JsonPropertyName("update_by")]
        public string? UpdateBy { get; set; }
        [JsonPropertyName("update_date")]
        public DateTime? UpdateDate { get; set; }
    }
    public class OutboundPickDetails
    {
        [JsonPropertyName("outbound_pick_detail_id")]
        public long OutboundPickDetailId { get; set; }
        [JsonPropertyName("outbound_pick_header_id")]
        public long OutboundPickHeaderId { get; set; }
        [JsonPropertyName("pick_list_number")]
        public string PickListNumber { get; set; }
        [JsonPropertyName("outbound_master_id")]
        public int OutboundMasterId { get; set; }
        [JsonPropertyName("outbound_order_number")]
        public string OutboundOrderNumber { get; set; }
        [JsonPropertyName("outbound_detail_id")]
        public long OutboundDetailId { get; set; }
        [JsonPropertyName("location_id")]
        public int LocationId { get; set; }
        [JsonPropertyName("location")]
        public string Location { get; set; }
        [JsonPropertyName("stg_location_id")]
        public int StgLocationId { get; set; }
        [JsonPropertyName("stg_location")]
        public string StgLocation { get; set; }
        [JsonPropertyName("line_number")]
        public int LineNumber { get; set; }
        [JsonPropertyName("item_master_id")]
        public int ItemMasterId { get; set; }
        [JsonPropertyName("item_number")]
        public string ItemNumber { get; set; }
        [JsonPropertyName("item_description")]
        public string ItemDescription { get; set; }
        [JsonPropertyName("quantity_plan")]
        public decimal QuantityPlan { get; set; }
        [JsonPropertyName("quantity_pick")]
        public decimal QuantityPick { get; set; }
        [JsonPropertyName("quantity_stage")]
        public decimal QuantityStage { get; set; }
        [JsonPropertyName("quantity_ship")]
        public decimal QuantityShip { get; set; }
        [JsonPropertyName("item_uom_id")]
        public int ItemUomId { get; set; }
        [JsonPropertyName("uom")]
        public string Uom { get; set; }
        [JsonPropertyName("pick_inv_status")]
        public string PickInvStatus { get; set; }
        [JsonPropertyName("lot_number")]
        public string LotNumber { get; set; }
        [JsonPropertyName("expiry_date")]
        public DateTime? ExpiryDate { get; set; }
        [JsonPropertyName("serial_number")]
        public string SerialNumber { get; set; }
        [JsonPropertyName("receive_date")]
        public DateTime? ReceiveDate { get; set; }
        [JsonPropertyName("create_by")]
        public string CreateBy { get; set; }
        [JsonPropertyName("create_date")]
        public DateTime CreateDate { get; set; }
        [JsonPropertyName("update_by")]
        public string? UpdateBy { get; set; }
        [JsonPropertyName("update_date")]
        public DateTime? UpdateDate { get; set; }
        [JsonPropertyName("lot_control")]
        public string LotControl { get; set; }
        [JsonPropertyName("expiry_date_control")]
        public string ExpiryDateControl { get; set; }
        [JsonPropertyName("sn_control")]
        public string SnControl { get; set; }
        [JsonPropertyName("category_id")]
        public int CategoryId { get; set; }
        [JsonPropertyName("item_category")]
        public string ItemCategory { get; set; }
        [JsonPropertyName("inventory_type")]
        public string InventoryType { get; set; }
    }
}
