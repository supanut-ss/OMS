namespace OmsApi.Models.Orders
{
    /// <summary>
    /// Unified order status across all platforms
    /// </summary>
    public enum OrderStatus
    {
        /// <summary>ยังไม่ได้ชำระเงิน</summary>
        Unpaid,
        /// <summary>รอดำเนินการ</summary>
        Pending,
        /// <summary>พร้อมจัดส่ง</summary>
        ReadyToShip,
        /// <summary>กำลังจัดส่ง</summary>
        Shipped,
        /// <summary>จัดส่งสำเร็จ</summary>
        Delivered,
        /// <summary>เสร็จสิ้น</summary>
        Completed,
        /// <summary>ยกเลิก</summary>
        Cancelled,
        /// <summary>คืนสินค้า/คืนเงิน</summary>
        ReturnRefund,
        /// <summary>ไม่ทราบสถานะ</summary>
        Unknown
    }

    /// <summary>
    /// Maps platform-specific statuses to unified OrderStatus
    /// </summary>
    public static class OrderStatusMapper
    {
        public static OrderStatus FromShopee(string status) => status?.ToUpperInvariant() switch
        {
            "UNPAID" => OrderStatus.Unpaid,
            "READY_TO_SHIP" => OrderStatus.ReadyToShip,
            "PROCESSED" => OrderStatus.ReadyToShip,
            "SHIPPED" => OrderStatus.Shipped,
            "COMPLETED" => OrderStatus.Completed,
            "IN_CANCEL" => OrderStatus.ReturnRefund,
            "CANCELLED" => OrderStatus.Cancelled,
            "INVOICE_PENDING" => OrderStatus.Pending,
            _ => OrderStatus.Unknown
        };

        public static OrderStatus FromLazada(string status) => status?.ToLowerInvariant() switch
        {
            "unpaid" => OrderStatus.Unpaid,
            "pending" => OrderStatus.Pending,
            "ready_to_ship" => OrderStatus.ReadyToShip,
            "packed" => OrderStatus.ReadyToShip,
            "shipped" => OrderStatus.Shipped,
            "delivered" => OrderStatus.Delivered,
            "canceled" => OrderStatus.Cancelled,
            "failed" => OrderStatus.Cancelled,
            "returned" => OrderStatus.ReturnRefund,
            _ => OrderStatus.Unknown
        };

        public static OrderStatus FromTikTok(string status) => status?.ToUpperInvariant() switch
        {
            "UNPAID" => OrderStatus.Unpaid,
            "ON_HOLD" => OrderStatus.Pending,
            "AWAITING_SHIPMENT" => OrderStatus.ReadyToShip,
            "AWAITING_COLLECTION" => OrderStatus.ReadyToShip,
            "PARTIALLY_SHIPPING" => OrderStatus.Shipped,
            "IN_TRANSIT" => OrderStatus.Shipped,
            "DELIVERED" => OrderStatus.Delivered,
            "COMPLETED" => OrderStatus.Completed,
            "CANCELLED" => OrderStatus.Cancelled,
            "REVERSE" => OrderStatus.ReturnRefund,
            _ => OrderStatus.Unknown
        };
    }
}
