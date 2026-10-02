# Marketplace order webhooks

The OMS exposes marketplace webhooks separately from the existing OAuth routes.
The OAuth routes in `AuthController` remain unchanged:

| Platform | POST webhook URL | Existing OAuth callback |
| --- | --- | --- |
| Shopee | `https://<domain>/api/webhooks/shopee` | `GET /api/auth/shopee/callback` |
| Lazada | `https://<domain>/api/webhooks/lazada` | `GET /api/auth/lazada/callback` |
| TikTok Shop | `https://<domain>/api/webhooks/tiktok` | `GET /api/auth/tiktok/callback` |

All three routes read the request body as raw bytes, verify `Authorization`, persist a redacted receipt, enqueue the event, and return HTTP 200 without waiting for Order Detail or WMS synchronization. The durable event row (`oms.t_oms_webhook_event`) is the idempotency boundary. The current implementation uses an in-process queue; unprocessed rows are recovered when the service starts, so an external queue can be introduced later without changing the public routes.

## Signature verification

Use the exact raw request body received on the wire. Do not parse and serialize JSON before calculating the HMAC. The implementation compares the lowercase hexadecimal HMAC value in the `Authorization` header using a timing-safe comparison and never logs the header.

| Platform | Signed message | HMAC key | Configuration |
| --- | --- | --- | --- |
| Shopee | `registered_callback_url + raw_body` | `SHOPEE_PARTNER_KEY` (or `SHOPEE_WEBHOOK_SECRET`) | `SHOPEE_WEBHOOK_URL` must exactly match the registered Push Mechanism URL |
| Lazada | `LAZADA_APP_KEY + raw_body` | `LAZADA_APP_SECRET` (or `LAZADA_WEBHOOK_SECRET`) | `LAZADA_WEBHOOK_URL` |
| TikTok Shop | `TIKTOK_APP_KEY + raw_body` | `TIKTOK_APP_SECRET` (or `TIKTOK_WEBHOOK_SECRET`) | `TIKTOK_WEBHOOK_URL` |

The Lazada Push Mechanism documentation specifies HMAC-SHA256 over App Key plus message body and puts the hex result in `Authorization`. TikTok Shop webhook verification is different from the TikTok Shop API `sign` query parameter: the webhook uses App Key plus the raw body and the App Secret. Do not reuse `SignatureHelper.GenerateTikTokSignature` for inbound webhooks.

Official references:

- [Shopee Open Platform Push Mechanism](https://open.shopee.com/push-mechanism/)
- [Lazada Push Mechanism](https://open.lazada.com/apps/doc/doc?docId=120168&nodeId=29526)
- [Lazada Trade Order Notifications](https://open.lazada.com/apps/doc/doc?docId=120196&nodeId=29538)
- [Lazada Fulfillment Order Update Notification](https://open.lazada.com/apps/doc/doc?docId=120211&nodeId=29546)
- [TikTok Shop API SDK overview and webhook configuration](https://partner.tiktokshop.com/docv2/page/tts-api-sdk-overview)
- [TikTok Shop OMS requirements, Order Status and On Hold](https://partner.tiktokshop.com/docv2/page/order-management-system-oms)

## Supported events

### Shopee Push Mechanism

The parser supports the current order-related push codes and records unknown codes instead of dropping them:

| Code | Event | Behavior |
| --- | --- | --- |
| `1` | Shop authorization | Audit only; OAuth callback remains authoritative |
| `2` | Shop deauthorization | Marks the stored shop credential inactive and requiring reauthorization |
| `3` | Order status update | Fetches Order Detail and upserts the order |
| `4` | Tracking number update | Fetches Order Detail and upserts the latest tracking data |
| `5` | Shopee update | Processes when an order identifier is present |
| `8` | Reserved stock change | Processes when an order identifier is present |
| `12` | Open API authorization expiry | Recorded for monitoring |
| `15` | Shipping document status | Processes when an order identifier is present |

The push body commonly contains `code`, `shop_id`, `timestamp`, and `data.ordersn` / `data.status` / `data.tracking_no`.

### Lazada Message Service

- `message_type = 0`: Trade Order Notification. Trade order status changes include order creation/payment/shipping; reverse order payloads with `reverse_order_id` or return/refund statuses are recorded as `REVERSE_ORDER_NOTIFICATION`.
- `message_type = 14`: Fulfillment Order Update Notification.

The body commonly contains `seller_id`, `message_type`, `timestamp`, `site`, and `data.trade_order_id`, `data.order_status`, `data.status_update_time`, or `data.status`.

Lazada documents delivery as at-least-once and explicitly requires idempotent consumption. The unique event key uses the platform, shop, order, event type, and event time when no provider event ID exists.

### TikTok Shop

TikTok webhook topics are enabled per app and scope in Partner Center and may change as the API evolves. The endpoint therefore accepts the configured topic value (`type`, `event_type`, or `topic`) and stores it as `TIKTOK_<type>` rather than guessing a global numeric mapping. An event is sent to Order Detail when it contains an order identifier.

This covers configured topics for:

- order status changes;
- cancellation status changes;
- package, fulfillment, shipping, and delivery status changes;
- any future subscribed topic that includes an order identifier.

If a package topic contains only a package identifier and no order identifier, the request is safely logged as `IGNORED` because the current client has no documented package-to-order lookup path for that payload. Enable the applicable Order Information/Fulfillment scopes and confirm the exact topic schema in Partner Center before relying on that event.

## Status and fulfillment rules

The latest platform response is the source of order data. The event's status is retained as `PlatformStatus`/`OriginalStatus`; WMS uses the normalized `OrderStatus` separately. Existing mappings cover unpaid, pending, ready to ship, shipped, delivered/completed, cancelled, returned/refunded, and unknown statuses.

TikTok `ON_HOLD` remains `OriginalStatus = ON_HOLD` and maps to the internal pending state. The shipping service rejects fulfillment for a stored TikTok order while that original status is `ON_HOLD`. The order must first transition to a fulfillable status (for example, Awaiting Shipment/Pending Shipment) and be synchronized again.

## Console setup

1. Copy `OmsApi/.env.example` to the deployment secret store and set real values. Never commit `.env` or secrets.
2. Run the EF migration `AddPlatformWebhookEvents` before enabling delivery.
3. Register the exact HTTPS URLs above.
4. In Shopee Open Platform, configure the Push Mechanism callback URL and enable the relevant push codes.
5. In Lazada Open Platform, open Message Service, verify the callback URL, then subscribe to Trade Order Notification and Fulfillment Order Update. Include reverse order/return/refund handling under the order notification subscription where available for the site.
6. In TikTok Shop Partner Center, configure the webhook URL and enable the Order Information/Fulfillment scopes and event topics needed by the app. The exact event list is app/scope/market dependent; use the Events configuration page as the source of truth.

## Example payloads

These examples are intentionally sanitized. The signature is an HTTP header, not part of the JSON body.

```json
{
  "code": 3,
  "shop_id": 1274495,
  "timestamp": 1660124246,
  "data": {
    "ordersn": "220810QXVJM3EX",
    "status": "READY_TO_SHIP",
    "update_time": 1660124246
  }
}
```

```json
{
  "seller_id": "1234567",
  "message_type": 0,
  "timestamp": 1603766859530,
  "site": "lazada_th",
  "data": {
    "order_status": "unpaid",
    "trade_order_id": "260422900198363",
    "status_update_time": 1603698638
  }
}
```

```json
{
  "type": 1,
  "shop_id": "7494049642642441621",
  "tts_notification_id": "7327112393057371910",
  "timestamp": 1644412885,
  "data": {
    "order_id": "576461413038785752",
    "order_status": "ON_HOLD",
    "update_time": 1644412845
  }
}
```

## Automatic order list refresh

After every processed callback (new order, update, or any other event except shop deauthorization), the worker also calls the platform's order list for that shop and upserts the result into `t_oms_order`. This covers orders whose push carried no usable order id.

- Window: the last `WEBHOOK_ORDER_LIST_LOOKBACK_HOURS` hours (default 24), up to 5 pages of 50.
- Callbacks for the same platform and shop within 30 seconds share one list call.
- Best-effort: a list failure is logged and never changes the webhook event's own status.

## Testing

The automated tests cover:

- valid Shopee/Lazada/TikTok raw-body signatures;
- invalid signatures and incomplete payloads;
- duplicate provider delivery and unique event keys;
- new-order and status-change processing through Order Detail;
- Order Detail failure logging without acknowledging failure synchronously;
- HTTP 200 acknowledgement from the controller;
- no duplicate `t_oms_order` row through the existing platform/shop/order unique key;
- TikTok `ON_HOLD` fulfillment rejection.

For a manual smoke test, send a real signed sample from the platform console or generate the `Authorization` header using the formulas above. Do not paste real credentials into shell history or log files.

## Logs and retry investigation

```sql
SELECT TOP (100)
       webhook_event_record_id, platform, event_type, shop_id,
       platform_order_id, platform_status, internal_status,
       processing_status, attempt_count, error_message,
       received_date, processed_date
FROM oms.t_oms_webhook_event
ORDER BY received_date DESC;
```

`RequestPayload` is redacted before persistence. Access tokens, refresh tokens, app secrets, partner keys, authorization headers, and passwords are not written to the event log. A failed event can be re-delivered by the marketplace and will be requeued by its existing event key; pending/failed rows are also recovered on application startup while attempts remain below the configured limit.
