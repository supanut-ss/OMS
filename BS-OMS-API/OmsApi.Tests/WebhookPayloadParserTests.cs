using System.Text;
using OmsApi.Models.Common;
using OmsApi.Services.Implementation;

namespace OmsApi.Tests;

public class WebhookPayloadParserTests
{
    [Fact]
    public void Shopee_OrderStatusUpdate_MapsOrderAndStatus()
    {
        var body = Encoding.UTF8.GetBytes(
            "{\"code\":3,\"shop_id\":123,\"timestamp\":1660124246," +
            "\"data\":{\"ordersn\":\"ORD-1\",\"status\":\"READY_TO_SHIP\",\"update_time\":1660124246}}");

        var result = PlatformWebhookPayloadParser.Parse(PlatformType.Shopee, body);

        Assert.Equal("ORDER_STATUS_UPDATE", result.EventType);
        Assert.Equal("123", result.ShopId);
        Assert.Equal("ORD-1", result.OrderId);
        Assert.Equal("READY_TO_SHIP", result.PlatformStatus);
        Assert.True(result.IsOrderEvent);
    }

    [Fact]
    public void Lazada_ReverseOrder_MapsRelatedTradeOrder()
    {
        var body = Encoding.UTF8.GetBytes(
            "{\"seller_id\":\"SELLER-1\",\"message_type\":0," +
            "\"data\":{\"order_status\":\"returned\",\"reverse_order_id\":\"REV-1\",\"trade_order_id\":\"ORD-2\",\"status_update_time\":1603703663}}");

        var result = PlatformWebhookPayloadParser.Parse(PlatformType.Lazada, body);

        Assert.Equal("REVERSE_ORDER_NOTIFICATION", result.EventType);
        Assert.Equal("SELLER-1", result.ShopId);
        Assert.Equal("ORD-2", result.OrderId);
        Assert.Equal("returned", result.PlatformStatus);
    }

    [Fact]
    public void TikTok_UsesNotificationIdAndRedactsSensitiveBodyFields()
    {
        var body = Encoding.UTF8.GetBytes(
            "{\"type\":101,\"shop_id\":\"SHOP-1\",\"tts_notification_id\":\"N-1\"," +
            "\"data\":{\"order_id\":\"ORD-3\",\"order_status\":\"ON_HOLD\",\"access_token\":\"do-not-log\"}}");

        var result = PlatformWebhookPayloadParser.Parse(PlatformType.TikTok, body);

        Assert.Equal("TIKTOK_101", result.EventType);
        Assert.Equal("N-1", result.EventKey.Split(':').Last());
        Assert.Equal("ON_HOLD", result.PlatformStatus);
        Assert.DoesNotContain("do-not-log", result.RedactedPayload);
    }

    [Fact]
    public void IncompleteShopeeOrderPayload_IsRejected()
    {
        var body = Encoding.UTF8.GetBytes("{\"code\":3,\"shop_id\":123,\"timestamp\":1,\"data\":{}}");

        Assert.Throws<WebhookPayloadException>(() =>
            PlatformWebhookPayloadParser.Parse(PlatformType.Shopee, body));
    }
}
