using OmsApi.Models.Orders;

namespace OmsApi.Tests;

public class OrderStatusMapperTests
{
    // ─── FromShopee ──────────────────────────────────────

    [Theory]
    [InlineData("UNPAID", OrderStatus.Unpaid)]
    [InlineData("INVOICE_PENDING", OrderStatus.Pending)]
    [InlineData("READY_TO_SHIP", OrderStatus.ReadyToShip)]
    [InlineData("PROCESSED", OrderStatus.ReadyToShip)]
    [InlineData("SHIPPED", OrderStatus.Shipped)]
    [InlineData("COMPLETED", OrderStatus.Completed)]
    [InlineData("CANCELLED", OrderStatus.Cancelled)]
    [InlineData("IN_CANCEL", OrderStatus.ReturnRefund)]
    [InlineData("UNKNOWN_STATUS", OrderStatus.Unknown)]
    [InlineData("", OrderStatus.Unknown)]
    public void FromShopee_ReturnsExpectedStatus(string rawStatus, OrderStatus expected)
    {
        var result = OrderStatusMapper.FromShopee(rawStatus);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void FromShopee_IsCaseInsensitive()
    {
        Assert.Equal(OrderStatus.Shipped, OrderStatusMapper.FromShopee("shipped"));
        Assert.Equal(OrderStatus.Completed, OrderStatusMapper.FromShopee("completed"));
    }

    [Fact]
    public void FromShopee_Null_ReturnsUnknown()
    {
        Assert.Equal(OrderStatus.Unknown, OrderStatusMapper.FromShopee(null!));
    }

    // ─── FromLazada ──────────────────────────────────────

    [Theory]
    [InlineData("unpaid", OrderStatus.Unpaid)]
    [InlineData("pending", OrderStatus.Pending)]
    [InlineData("ready_to_ship", OrderStatus.ReadyToShip)]
    [InlineData("packed", OrderStatus.ReadyToShip)]
    [InlineData("shipped", OrderStatus.Shipped)]
    [InlineData("delivered", OrderStatus.Delivered)]
    [InlineData("canceled", OrderStatus.Cancelled)]
    [InlineData("failed", OrderStatus.Cancelled)]
    [InlineData("returned", OrderStatus.ReturnRefund)]
    [InlineData("mystery_status", OrderStatus.Unknown)]
    [InlineData("", OrderStatus.Unknown)]
    public void FromLazada_ReturnsExpectedStatus(string rawStatus, OrderStatus expected)
    {
        var result = OrderStatusMapper.FromLazada(rawStatus);
        Assert.Equal(expected, result);
    }

    // ─── FromTikTok ──────────────────────────────────────

    [Theory]
    [InlineData("UNPAID", OrderStatus.Unpaid)]
    [InlineData("ON_HOLD", OrderStatus.Pending)]
    [InlineData("AWAITING_SHIPMENT", OrderStatus.ReadyToShip)]
    [InlineData("AWAITING_COLLECTION", OrderStatus.ReadyToShip)]
    [InlineData("PARTIALLY_SHIPPING", OrderStatus.Shipped)]
    [InlineData("IN_TRANSIT", OrderStatus.Shipped)]
    [InlineData("DELIVERED", OrderStatus.Delivered)]
    [InlineData("COMPLETED", OrderStatus.Completed)]
    [InlineData("CANCELLED", OrderStatus.Cancelled)]
    [InlineData("REVERSE", OrderStatus.ReturnRefund)]
    [InlineData("UNKNOWN_CODE", OrderStatus.Unknown)]
    [InlineData("", OrderStatus.Unknown)]
    public void FromTikTok_ReturnsExpectedStatus(string rawStatus, OrderStatus expected)
    {
        var result = OrderStatusMapper.FromTikTok(rawStatus);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void FromTikTok_Null_ReturnsUnknown()
    {
        Assert.Equal(OrderStatus.Unknown, OrderStatusMapper.FromTikTok(null!));
    }
}

