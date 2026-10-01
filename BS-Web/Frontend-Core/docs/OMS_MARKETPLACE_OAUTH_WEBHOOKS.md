# OMS marketplace OAuth and webhooks

## Public routes

Publish the OMS API under the same HTTPS host as the React app, or set
`REACT_APP_OMS_API_URL` to the HTTPS API origin plus `/api`. The React application
is mounted at `/oms`; its UI route is `/oms/connector`.

| Purpose | Public URL |
| --- | --- |
| Shopee OAuth callback | `https://<domain>/api/auth/shopee/callback` |
| Lazada OAuth callback | `https://<domain>/api/auth/lazada/callback` |
| TikTok Shop OAuth callback | `https://<domain>/api/auth/tiktok/callback` |
| Shopee webhook | `https://<domain>/api/webhooks/shopee` |
| Lazada webhook | `https://<domain>/api/webhooks/lazada` |
| TikTok Shop webhook | `https://<domain>/api/webhooks/tiktok` |

Set each platform's existing backend `*_REDIRECT_URL` to its exact callback URL.
Set backend `OMS_FRONTEND_CONNECTOR_URL` to `https://<domain>/oms/connector`.
After OMS processes a callback, it redirects to the connector with only an OAuth
success/error marker and platform name. The authorization code is consumed by OMS
and removed from the browser URL by the backend redirect. Tokens are never
returned to the browser. Refreshing the connector cannot repeat the callback.

## Reverse proxy and SPA routing

Route API requests before the React SPA fallback. For Nginx, merge the following
locations into the TLS virtual host and adjust the upstream name/port:

```nginx
location ^~ /api/auth/ {
    proxy_pass http://oms-api:8080/api/auth/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location ^~ /api/webhooks/ {
    proxy_pass http://oms-api:8080/api/webhooks/;
    proxy_http_version 1.1;
    proxy_request_buffering off;
    proxy_cache off;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Content-Type $content_type;
    proxy_set_header Content-Length $content_length;
}

location / {
    try_files $uri $uri/ /oms/index.html;
}
```

Do not rewrite, redirect, authenticate, cache, or parse webhook requests. Proxy
must preserve POST, the original raw body, Content-Type, Content-Length,
Authorization, and query string. Do not send `/api/*` to `index.html`. Configure
the proxy's `/api/auth/*` and `/api/webhooks/*` rules before any catch-all SPA
rewrite. The API verifies webhook signatures; React never receives webhook
requests and must not calculate signatures.

## Environment variables

Frontend build-time values (public configuration only):

| Variable | Example | Purpose |
| --- | --- | --- |
| `REACT_APP_OMS_API_URL` | `/api` | Public OMS API base used for `auth-url` requests; route to OMS API |
| `REACT_APP_FRONTEND_BASE_URL` | `https://<domain>/oms` | Public React app base |
| `REACT_APP_OAUTH_CALLBACK_BASE_URL` | `https://<domain>/api/auth` | Callback URL prefix for operator reference |
| `REACT_APP_WEBHOOK_BASE_URL` | `https://<domain>/api/webhooks` | Webhook URL prefix for operator reference |

Set `OMS_FRONTEND_CONNECTOR_URL` and the platform redirect URLs in the OMS
backend environment. Marketplace app keys, partner keys, app secrets, and tokens
belong only in the backend secret store. Never add them to `REACT_APP_*` values.
See `BS-OMS-API/OmsApi/docs/MARKETPLACE_WEBHOOKS.md` for backend webhook secret
configuration and event setup.

## OAuth flow

1. From Connector, choose Connect or Reauthorize. The frontend requests
   `GET /api/auth/{platform}/auth-url` and redirects to the returned HTTPS URL.
2. Register the matching public callback URL above in the marketplace console.
   The marketplace sends `code`, `shop_id`, and/or its error query directly to
   OMS through the reverse proxy. Do not route the callback to a React page.
3. OMS exchanges the code and saves the credential, then redirects to
   `/oms/connector`. The connector reports success/failure and refreshes shop
   status after success.

For a basic route check, open `/api/auth/shopee/auth-url` on the public host (or
the configured API base plus `/auth/shopee/auth-url`) and confirm the API returns
an authorization URL. Complete the marketplace authorization and confirm the
browser returns to Connector with updated shop status. Check browser storage and
console: no OAuth code or platform token should appear there.

## Webhook verification

Configure each marketplace with the exact HTTPS webhook URL in the public routes
table. Send a POST to the public URL using a sanitized valid fixture and the
platform's valid signature; OMS should return HTTP 200. An invalid signature
should receive the backend's rejection response. Verify proxy access logs show
the request reached OMS; do not log authorization/signature values or raw
production payloads. Confirm webhook POST works without frontend login/JWT and
that an unknown API route never returns the React HTML shell.

Webhook processing and signature validation happen in OMS backend, never in
React. Browser requests to webhook paths are not part of the supported flow.
