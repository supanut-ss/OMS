using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using OmsApi.Models.Common;
using OmsApi.Models.Webhooks;

namespace OmsApi.Services.Implementation;

public static class PlatformWebhookPayloadParser
{
    public static WebhookEventEnvelope Parse(PlatformType platform, byte[] rawBody)
    {
        using var document = JsonDocument.Parse(rawBody);
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object)
            throw new WebhookPayloadException("Webhook body must be a JSON object.");

        var redactedPayload = RedactPayload(root);
        return platform switch
        {
            PlatformType.Shopee => ParseShopee(root, redactedPayload, rawBody),
            PlatformType.Lazada => ParseLazada(root, redactedPayload, rawBody),
            PlatformType.TikTok => ParseTikTok(root, redactedPayload, rawBody),
            _ => throw new WebhookPayloadException($"Unsupported platform '{platform}'.")
        };
    }

    private static WebhookEventEnvelope ParseShopee(
        JsonElement root,
        string redactedPayload,
        byte[] rawBody)
    {
        var code = GetInt(root, "code");
        if (!code.HasValue)
            throw new WebhookPayloadException("Shopee webhook code is required.");

        var data = GetObject(root, "data");
        var shopId = GetString(root, "shop_id") ?? GetString(data, "shop_id");
        var orderId = FirstString(data, "ordersn", "order_sn", "trade_order_id");
        var status = FirstString(data, "status", "order_status");
        var trackingNumber = FirstString(data, "tracking_no", "tracking_number");
        var eventTime = UnixDate(FirstLong(data, "update_time") ?? GetLong(root, "timestamp"));
        var eventType = code.Value switch
        {
            1 => "SHOP_AUTHORIZATION",
            2 => "SHOP_DEAUTHORIZATION",
            3 => "ORDER_STATUS_UPDATE",
            4 => "TRACKING_NUMBER_UPDATE",
            5 => "SHOPEE_UPDATE",
            8 => "RESERVED_STOCK_CHANGE",
            12 => "OPEN_API_AUTHORIZATION_EXPIRY",
            15 => "SHIPPING_DOCUMENT_STATUS",
            _ => $"SHOPEE_PUSH_{code.Value}"
        };

        var requiresOrderId = code is 3 or 4 or 5 or 8 or 15;
        if (requiresOrderId && string.IsNullOrWhiteSpace(orderId))
            throw new WebhookPayloadException($"Shopee {eventType} webhook does not contain an order id.");

        return CreateEnvelope(
            PlatformType.Shopee,
            eventType,
            shopId,
            orderId,
            status,
            trackingNumber,
            eventTime,
            requiresOrderId,
            code == 2,
            redactedPayload,
            rawBody);
    }

    private static WebhookEventEnvelope ParseLazada(
        JsonElement root,
        string redactedPayload,
        byte[] rawBody)
    {
        var messageType = GetInt(root, "message_type");
        if (!messageType.HasValue)
            throw new WebhookPayloadException("Lazada message_type is required.");

        var data = GetObject(root, "data");
        var shopId = FirstString(root, "seller_id", "shop_id");
        var orderId = FirstString(
            data,
            "trade_order_id",
            "order_id",
            "reverse_order_id");
        var status = FirstString(data, "order_status", "status");
        var trackingNumber = FirstString(data, "tracking_number", "tracking_no");
        var eventTime = UnixDate(
            FirstLong(data, "status_update_time", "update_time") ?? GetLong(root, "timestamp"));
        var isReverse = !string.IsNullOrWhiteSpace(GetString(data, "reverse_order_id")) ||
                        string.Equals(status, "returned", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(status, "refunded", StringComparison.OrdinalIgnoreCase);
        var eventType = messageType.Value switch
        {
            0 when isReverse => "REVERSE_ORDER_NOTIFICATION",
            0 => "TRADE_ORDER_NOTIFICATION",
            14 => "FULFILLMENT_ORDER_UPDATE",
            _ => $"LAZADA_MESSAGE_{messageType.Value}"
        };

        if (messageType == 0 && string.IsNullOrWhiteSpace(orderId))
            throw new WebhookPayloadException($"Lazada {eventType} webhook does not contain an order id.");

        return CreateEnvelope(
            PlatformType.Lazada,
            eventType,
            shopId,
            orderId,
            status,
            trackingNumber,
            eventTime,
            messageType == 0 || messageType == 14,
            false,
            redactedPayload,
            rawBody);
    }

    private static WebhookEventEnvelope ParseTikTok(
        JsonElement root,
        string redactedPayload,
        byte[] rawBody)
    {
        var type = FirstString(root, "type", "event_type", "topic");
        if (string.IsNullOrWhiteSpace(type))
            throw new WebhookPayloadException("TikTok webhook type is required.");

        var data = GetObject(root, "data");
        var notificationId = GetString(root, "tts_notification_id");
        var shopId = FirstString(root, "shop_id", "seller_open_id", "creator_open_id");
        var orderId = FirstString(
            data,
            "order_id",
            "order_id_string",
            "orderId",
            "main_order_id",
            "package_order_id",
            "related_order_id");
        var status = FirstString(
            data,
            "order_status",
            "cancellation_status",
            "package_status",
            "shipping_status",
            "fulfillment_status",
            "delivery_status",
            "status");
        var trackingNumber = FirstString(data, "tracking_number", "tracking_no");
        var eventTime = UnixDate(
            FirstLong(data, "update_time", "status_update_time", "event_time") ??
            GetLong(root, "timestamp"));
        var eventType = type.StartsWith("TIKTOK_", StringComparison.OrdinalIgnoreCase)
            ? type.ToUpperInvariant()
            : $"TIKTOK_{type.ToUpperInvariant()}";

        // Numeric webhook topics are configured per app/scope in Partner
        // Center. Accept unknown topics for logging, but process an order only
        // when the payload actually contains an order identifier.
        return CreateEnvelope(
            PlatformType.TikTok,
            eventType,
            shopId,
            orderId,
            status,
            trackingNumber,
            eventTime,
            !string.IsNullOrWhiteSpace(orderId),
            false,
            redactedPayload,
            rawBody,
            notificationId);
    }

    private static WebhookEventEnvelope CreateEnvelope(
        PlatformType platform,
        string eventType,
        string? shopId,
        string? orderId,
        string? status,
        string? trackingNumber,
        DateTime? eventTime,
        bool isOrderEvent,
        bool isDeauthorizationEvent,
        string redactedPayload,
        byte[] rawBody,
        string? eventId = null)
    {
        var eventKey = !string.IsNullOrWhiteSpace(eventId)
            ? $"{platform}:ID:{eventId}"
            : !string.IsNullOrWhiteSpace(orderId) && eventTime.HasValue
                ? $"{platform}:ORDER:{shopId}:{orderId}:{eventType}:{eventTime.Value.Ticks}"
                : $"{platform}:BODY:{Convert.ToHexString(SHA256.HashData(rawBody))}";

        return new WebhookEventEnvelope
        {
            Platform = platform,
            EventKey = eventKey,
            EventType = eventType,
            ShopId = NullIfEmpty(shopId),
            OrderId = NullIfEmpty(orderId),
            PlatformStatus = NullIfEmpty(status),
            TrackingNumber = NullIfEmpty(trackingNumber),
            EventTime = eventTime,
            IsOrderEvent = isOrderEvent,
            IsAuthorizationEvent = eventType is "SHOP_AUTHORIZATION" or "SHOP_DEAUTHORIZATION",
            IsDeauthorizationEvent = isDeauthorizationEvent,
            RedactedPayload = redactedPayload
        };
    }

    private static string RedactPayload(JsonElement root)
    {
        var node = JsonNode.Parse(root.GetRawText());
        RedactNode(node);
        return node?.ToJsonString() ?? "{}";
    }

    private static void RedactNode(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            foreach (var property in obj.ToList())
            {
                if (IsSensitiveName(property.Key))
                    obj[property.Key] = "[REDACTED]";
                else
                    RedactNode(property.Value);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array)
                RedactNode(child);
        }
    }

    private static bool IsSensitiveName(string name) =>
        name.Contains("access_token", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("refresh_token", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("app_secret", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("partner_key", StringComparison.OrdinalIgnoreCase) ||
        name.Equals("secret", StringComparison.OrdinalIgnoreCase) ||
        name.Equals("password", StringComparison.OrdinalIgnoreCase) ||
        name.Equals("authorization", StringComparison.OrdinalIgnoreCase);

    private static JsonElement GetObject(JsonElement element, string name)
    {
        var value = GetProperty(element, name);
        return value.ValueKind == JsonValueKind.Object ? value : default;
    }

    private static string? FirstString(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            var value = GetString(element, name);
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }
        return null;
    }

    private static long? FirstLong(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            var value = GetLong(element, name);
            if (value.HasValue)
                return value;
        }
        return null;
    }

    private static string? GetString(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return null;
        var property = GetProperty(element, name);
        return property.ValueKind switch
        {
            JsonValueKind.String => property.GetString(),
            JsonValueKind.Number => property.GetRawText(),
            _ => null
        };
    }

    private static int? GetInt(JsonElement element, string name)
    {
        var value = GetLong(element, name);
        return value.HasValue && value.Value <= int.MaxValue && value.Value >= int.MinValue
            ? (int)value.Value
            : null;
    }

    private static long? GetLong(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return null;
        var property = GetProperty(element, name);
        if (property.ValueKind == JsonValueKind.Number && property.TryGetInt64(out var number))
            return number;
        if (property.ValueKind == JsonValueKind.String && long.TryParse(property.GetString(), out number))
            return number;
        return null;
    }

    private static JsonElement GetProperty(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return default;
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
                return property.Value;
        }
        return default;
    }

    private static DateTime? UnixDate(long? timestamp)
    {
        if (!timestamp.HasValue || timestamp.Value <= 0)
            return null;
        try
        {
            return timestamp.Value > 100_000_000_000
                ? DateTimeOffset.FromUnixTimeMilliseconds(timestamp.Value).UtcDateTime
                : DateTimeOffset.FromUnixTimeSeconds(timestamp.Value).UtcDateTime;
        }
        catch (ArgumentOutOfRangeException)
        {
            return null;
        }
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class WebhookPayloadException(string message) : InvalidOperationException(message);
