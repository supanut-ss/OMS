# BS-OMS-API — Process Flow Diagram

## Overview

BS-OMS-API เป็น **Stateless API Gateway** สำหรับรวมข้อมูล e-commerce จากหลายแพลตฟอร์ม  
รองรับ: **Shopee Open Platform API v2**, **Lazada Open Platform**, **TikTok Shop API v202309**

---

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph CLIENT["🖥️ Clients"]
        FE["Frontend / BS-Web"]
        EXT["External Apps"]
    end

    subgraph GATEWAY["🔒 API Gateway Layer"]
        CORS["CORS Policy\n(OmsApiCors)"]
        MW["ApiKeyMiddleware\nX-Api-Key Header"]
        SWAGGER["Swagger UI\n/swagger"]
    end

    subgraph CONTROLLERS["📡 Controllers"]
        AUTH["AuthController\n/api/auth"]
        ORDER["OrderController\n/api/order"]
        INVENTORY["InventoryController\n/api/inventory"]
        SHIPPING["ShippingController\n/api/shipping"]
        SHOP["ShopController\n/api/shop"]
        CHAT["ChatController\n/api/chat\n⚠️ 501 Placeholder"]
    end

    subgraph SERVICES["⚙️ Service Layer"]
        AUTH_SVC["PlatformAuthService"]
        ORDER_SVC["OrderService"]
        INV_SVC["InventoryService"]
        SHIP_SVC["ShippingService"]
        FACTORY["PlatformClientFactory"]
    end

    subgraph CLIENTS["🌐 Platform Clients"]
        SHOPEE_C["ShopeeClient\nHMAC-SHA256 v2"]
        LAZADA_C["LazadaClient\nHMAC-SHA256 sorted"]
        TIKTOK_C["TikTokClient\nHMAC-SHA256 wrapped"]
    end

    subgraph PLATFORMS["☁️ External Platforms"]
        SHOPEE["Shopee\npartner.shopeemobile.com"]
        LAZADA["Lazada\napi.lazada.co.th"]
        TIKTOK["TikTok Shop\nopen-api.tiktokglobalshop.com"]
    end

    subgraph HELPERS["🛠️ Helpers"]
        SIG["SignatureHelper\nHMAC-SHA256"]
        DT["DateTimeHelper\nUnix Timestamp"]
    end

    FE -->|"HTTP Request"| CORS
    EXT -->|"HTTP Request"| CORS
    SWAGGER -.->|"Skip Auth"| CORS
    CORS --> MW
    MW -->|"✅ Key Valid / Dev Mode"| CONTROLLERS
    MW -->|"❌ 401 Unauthorized"| CLIENT

    AUTH --> AUTH_SVC
    ORDER --> ORDER_SVC
    INVENTORY --> INV_SVC
    SHIPPING --> SHIP_SVC

    ORDER_SVC --> FACTORY
    INV_SVC --> FACTORY
    SHIP_SVC --> FACTORY
    AUTH_SVC --> FACTORY

    FACTORY --> SHOPEE_C
    FACTORY --> LAZADA_C
    FACTORY --> TIKTOK_C

    SHOPEE_C --> SIG
    LAZADA_C --> SIG
    TIKTOK_C --> SIG
    SHOPEE_C --> DT
    LAZADA_C --> DT
    TIKTOK_C --> DT

    SHOPEE_C -->|"HTTPS + HMAC"| SHOPEE
    LAZADA_C -->|"HTTPS + HMAC"| LAZADA
    TIKTOK_C -->|"HTTPS + HMAC"| TIKTOK

    style CLIENT fill:#e8f4fd,stroke:#2196F3
    style GATEWAY fill:#fff3e0,stroke:#FF9800
    style CONTROLLERS fill:#f3e5f5,stroke:#9C27B0
    style SERVICES fill:#e8f5e9,stroke:#4CAF50
    style CLIENTS fill:#fce4ec,stroke:#E91E63
    style PLATFORMS fill:#e0f2f1,stroke:#009688
    style HELPERS fill:#f9fbe7,stroke:#8BC34A
    style CHAT fill:#ffebee,stroke:#f44336
```

---

## 2. Request Lifecycle (Happy Path)

```mermaid
sequenceDiagram
    autonumber
    participant Client as 🖥️ Client
    participant CORS as 🌐 CORS Middleware
    participant MW as 🔒 ApiKeyMiddleware
    participant Ctrl as 📡 Controller
    participant Svc as ⚙️ Service
    participant Factory as 🏭 PlatformClientFactory
    participant PlatClient as 🔌 Platform Client
    participant ExtAPI as ☁️ Platform API

    Client->>CORS: HTTP POST /api/order/list
    Note over CORS: ตรวจสอบ Origin<br/>กับ CORS_ALLOWED_ORIGINS

    CORS->>MW: ✅ Origin allowed
    Note over MW: ตรวจสอบ X-Api-Key header<br/>กับ OMS_API_KEY env var

    alt OMS_API_KEY ไม่ได้ตั้งค่า (Dev Mode)
        MW->>Ctrl: ✅ Allow (dev mode)
    else Key ตรงกัน
        MW->>Ctrl: ✅ Allow
    else Key ไม่ตรง / ไม่มี header
        MW-->>Client: 401 {"success":false,"message":"Unauthorized"}
    end

    Ctrl->>Ctrl: Validate ModelState [Required][StringLength]
    Ctrl->>Svc: GetOrdersAsync(filter)
    Svc->>Factory: GetClient(PlatformType.Shopee)
    Factory->>PlatClient: return ShopeeClient
    PlatClient->>PlatClient: GenerateShopeeSignature(partnerId, path, timestamp, token, shopId)
    PlatClient->>ExtAPI: GET /api/v2/order/get_order_list?sign=...
    ExtAPI-->>PlatClient: JSON Response
    PlatClient->>PlatClient: Map → UnifiedOrder[]
    PlatClient-->>Svc: List<UnifiedOrder>
    Svc-->>Ctrl: PaginatedResult<UnifiedOrder>
    Ctrl-->>Client: 200 ApiResponse<PaginatedResult<UnifiedOrder>>
```

---

## 3. OAuth Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 User / Browser
    participant API as 🔌 BS-OMS-API
    participant AuthSvc as ⚙️ PlatformAuthService
    participant Platform as ☁️ Platform (Shopee/Lazada/TikTok)

    Note over User,Platform: Step 1 — Get Authorization URL
    User->>API: GET /api/auth/{platform}/auth-url
    API->>AuthSvc: GetAuthorizationUrl(platformType)
    AuthSvc->>AuthSvc: Build URL with partner_id + redirect_uri + timestamp + sign
    AuthSvc-->>API: OAuth URL
    API-->>User: 200 { url: "https://partner.shopee.com/..." }

    Note over User,Platform: Alternative — Direct Redirect
    User->>API: GET /api/auth/{platform}/authorize
    API->>AuthSvc: GetAuthorizationUrl(platformType)
    API-->>User: 302 Redirect → Platform OAuth Page

    Note over User,Platform: Step 2 — User Authorizes on Platform
    User->>Platform: User logs in & grants permission
    Platform-->>User: Redirect to callback_url?code=AUTH_CODE&shop_id=xxx

    Note over User,Platform: Step 3 — Handle Callback & Exchange Token
    User->>API: GET /api/auth/{platform}/callback?code=AUTH_CODE&shop_id=xxx
    API->>AuthSvc: HandleCallbackAsync(platform, code, shopId)
    AuthSvc->>Platform: POST Exchange code → access_token + refresh_token
    Platform-->>AuthSvc: TokenInfo { access_token, refresh_token, expire_in }
    AuthSvc-->>API: TokenInfo
    API-->>User: 200 ApiResponse<TokenInfo>

    Note over User,Platform: Step 4 — Refresh Token (when expired)
    User->>API: POST /api/auth/{platform}/refresh\n{ refresh_token, shop_id }
    API->>AuthSvc: RefreshTokenAsync(platform, refreshToken, shopId)
    AuthSvc->>Platform: POST /auth/access_token/get (with refresh_token)
    Platform-->>AuthSvc: New TokenInfo
    AuthSvc-->>API: TokenInfo
    API-->>User: 200 ApiResponse<TokenInfo>
```

---

## 4. Order Management Flow

```mermaid
flowchart TD
    START(["▶ Client Request"])

    START --> ROUTE{Route?}

    ROUTE -->|"POST /api/order/list"| SINGLE["Single Platform Query"]
    ROUTE -->|"POST /api/order/all"| ALL["Multi-Platform Query"]
    ROUTE -->|"GET /api/order/{platform}/{orderId}"| DETAIL["Order Detail"]

    SINGLE --> CHECK_PLAT{Platform\nระบุไว้?}
    CHECK_PLAT -->|No| ERR400A["400 Bad Request\nPlatform is required"]
    CHECK_PLAT -->|Yes| GET_CLIENT_S["PlatformClientFactory\n.GetClient(platform)"]

    ALL --> CHECK_CREDS{PlatformCredentials\nระบุไว้?}
    CHECK_CREDS -->|No| ERR400B["400 Bad Request\nCredentials required"]
    CHECK_CREDS -->|Yes| PARALLEL["รัน parallel สำหรับ\nแต่ละ platform credential"]

    PARALLEL --> PC1["GetOrdersAsync(Shopee credentials)"]
    PARALLEL --> PC2["GetOrdersAsync(Lazada credentials)"]
    PARALLEL --> PC3["GetOrdersAsync(TikTok credentials)"]
    PC1 & PC2 & PC3 --> MERGE["รวมผลลัพธ์ + เรียงตาม CreateTime DESC"]

    GET_CLIENT_S --> BUILD_PARAMS["สร้าง query params:\npage, page_size, time_from/to\norder_status, access_token"]
    BUILD_PARAMS --> SIGN["SignatureHelper.GenerateXxxSignature()"]
    SIGN --> CALL_API["HTTP GET/POST → Platform API"]
    CALL_API --> MAP["Map JSON → UnifiedOrder\nOrderStatusMapper.FromXxx()"]
    MAP --> PAGINATE["PaginatedResult<UnifiedOrder>\n{ Items, TotalCount, Page, PageSize, HasMore }"]

    DETAIL --> GET_CLIENT_D["PlatformClientFactory\n.GetClient(platform)"]
    GET_CLIENT_D --> CALL_DETAIL["GET /order/get_order_detail\n(Shopee v2 endpoint)"]
    CALL_DETAIL --> NULL_CHK{Order\nพบหรือไม่?}
    NULL_CHK -->|No| ERR404["404 Not Found"]
    NULL_CHK -->|Yes| ORDER_RESP["200 ApiResponse<UnifiedOrder>"]

    PAGINATE --> OK["200 ApiResponse<PaginatedResult<UnifiedOrder>>"]
    MERGE --> OK2["200 ApiResponse<List<UnifiedOrder>>"]

    style ERR400A fill:#ffcdd2,stroke:#f44336
    style ERR400B fill:#ffcdd2,stroke:#f44336
    style ERR404 fill:#ffcdd2,stroke:#f44336
    style OK fill:#c8e6c9,stroke:#4CAF50
    style OK2 fill:#c8e6c9,stroke:#4CAF50
```

---

## 5. Inventory Management Flow

```mermaid
flowchart TD
    START(["▶ /api/inventory"])

    START --> ROUTE{Endpoint?}

    ROUTE -->|"POST /products"| PROD_SINGLE["Single Platform\nGetProductsAsync(filter)"]
    ROUTE -->|"POST /products/all"| PROD_ALL["All Platforms\nGetProductsFromAllPlatformsAsync(filter)"]
    ROUTE -->|"GET /{platform}/{itemId}"| PROD_DETAIL["Product Detail\nGetProductDetailAsync()"]
    ROUTE -->|"POST /low-stock"| LOW_STOCK["Low Stock Alert\nGetLowStockProductsAsync(threshold=5)"]
    ROUTE -->|"POST /update-stock"| UPDATE["Update Stock\nUpdateStockAsync()"]

    PROD_SINGLE --> CHECK_P{Platform\nระบุไว้?}
    CHECK_P -->|No| ERR1["400 กรุณาระบุ platform"]
    CHECK_P -->|Yes| GET_PRODS["ดึงสินค้าจาก platform\n(product list + stock)"]

    PROD_ALL --> PARALLEL["Parallel: ดึงจากทุก platform\nพร้อมกัน"]
    PARALLEL --> MERGE_P["รวมรายการสินค้า"]

    LOW_STOCK --> FILTER_LOW["กรองเฉพาะ stock ≤ threshold\n(default: 5)"]

    UPDATE --> VALIDATE_STOCK["Validate:\n[Required] ItemId\n[Required] AccessToken\n[Range(0,Max)] NewStock"]
    VALIDATE_STOCK --> CALL_UPDATE["Platform Client: UpdateStockAsync()"]
    CALL_UPDATE --> RESULT{Success?}
    RESULT -->|Yes| OK_UPDATE["200 Stock updated"]
    RESULT -->|No| ERR_UPDATE["400 Failed to update stock"]

    GET_PRODS & MERGE_P & FILTER_LOW --> RESP_PRODUCTS["200 ApiResponse<PaginatedResult<ProductItem>>"]
    PROD_DETAIL --> NULL_CHK{Product\nพบหรือไม่?}
    NULL_CHK -->|No| ERR404["404 Product not found"]
    NULL_CHK -->|Yes| RESP_DETAIL["200 ApiResponse<ProductItem>"]

    style ERR1 fill:#ffcdd2,stroke:#f44336
    style ERR_UPDATE fill:#ffcdd2,stroke:#f44336
    style ERR404 fill:#ffcdd2,stroke:#f44336
    style OK_UPDATE fill:#c8e6c9,stroke:#4CAF50
    style RESP_PRODUCTS fill:#c8e6c9,stroke:#4CAF50
    style RESP_DETAIL fill:#c8e6c9,stroke:#4CAF50
```

---

## 6. Shipping Management Flow

```mermaid
flowchart TD
    START(["▶ /api/shipping"])
    START --> ROUTE{Endpoint?}

    ROUTE -->|"POST /print-label"| LABEL["พิมพ์ใบปะหน้า\nGetShippingLabelAsync()"]
    ROUTE -->|"POST /print-labels-batch"| BATCH["Batch พิมพ์\nGetBatchShippingLabelsAsync()"]
    ROUTE -->|"POST /arrange"| ARRANGE["จัดส่ง\nShipOrderAsync()"]
    ROUTE -->|"GET /tracking/{platform}/{orderId}"| TRACK["ติดตามพัสดุ\nGetTrackingInfoAsync()"]
    ROUTE -->|"GET /providers/{platform}"| PROVIDERS["ดูผู้ให้บริการขนส่ง\nGetShippingProvidersAsync()"]

    LABEL --> VALIDATE_L["Validate:\n[Required] AccessToken [≤512]\n[Required] OrderId [≤100]"]
    VALIDATE_L --> CALL_LABEL["Platform Client:\nShopee: /api/v2/logistics/get_shipping_document\nLazada: /order/shipping_document\nTikTok: /fulfillment/shipping_document"]
    CALL_LABEL --> NULL_LABEL{Label\nสร้างได้?}
    NULL_LABEL -->|No| ERR404_L["404 Unable to generate label\nCheck order status"]
    NULL_LABEL -->|Yes| OK_LABEL["200 ShippingLabelResult\n{ DocumentUrl, TrackingNumber, ... }"]

    BATCH --> PARALLEL_B["วนลูปแต่ละ request\nเรียก GetShippingLabelAsync() แบบ parallel"]
    PARALLEL_B --> AGG["รวมผล (null = failed)"]
    AGG --> OK_BATCH["200 List<ShippingLabelResult>\nGenerated X/Y labels"]

    ARRANGE --> VALIDATE_A["Validate:\n[Required] AccessToken\n[Required] OrderId"]
    VALIDATE_A --> CALL_ARRANGE["Platform Client:\nShopee: /api/v2/logistics/ship_order\nLazada: /order/ship\nTikTok: /fulfillment/ship_package"]
    CALL_ARRANGE --> SUCCESS_A{Success?}
    SUCCESS_A -->|No| ERR_A["400 Failed to arrange shipment"]
    SUCCESS_A -->|Yes| OK_A["200 Shipment arranged"]

    TRACK --> CALL_TRACK["Platform Client:\nShopee: /api/v2/logistics/get_tracking_info\nLazada: /logistics/tracking\nTikTok: order_detail (tracking_no)"]
    CALL_TRACK --> NULL_T{Tracking\nพบหรือไม่?}
    NULL_T -->|No| ERR404_T["404 Tracking info not available"]
    NULL_T -->|Yes| OK_T["200 TrackingInfo\n{ TrackingNo, Carrier, Events[] }"]

    PROVIDERS --> LAZADA_CHECK{Platform?}
    LAZADA_CHECK -->|"Lazada"| CALL_LAZADA_API["เรียก /logistics/buyer/providers\nLazada API (Real Call)"]
    CALL_LAZADA_API --> FALLBACK{Response\nว่างหรือ Error?}
    FALLBACK -->|Yes| HARDCODED["Fallback: LEX, Kerry,\nFlash, ThaiPost"]
    FALLBACK -->|No| MAPPED_P["Map provider_list JSON\n→ ShippingProvider[]"]
    LAZADA_CHECK -->|"Shopee/TikTok"| STATIC_P["Static provider list\nตามแต่ละ platform"]
    HARDCODED & MAPPED_P & STATIC_P --> OK_P["200 List<ShippingProvider>"]

    style ERR404_L fill:#ffcdd2,stroke:#f44336
    style ERR_A fill:#ffcdd2,stroke:#f44336
    style ERR404_T fill:#ffcdd2,stroke:#f44336
    style OK_LABEL fill:#c8e6c9,stroke:#4CAF50
    style OK_BATCH fill:#c8e6c9,stroke:#4CAF50
    style OK_A fill:#c8e6c9,stroke:#4CAF50
    style OK_T fill:#c8e6c9,stroke:#4CAF50
    style OK_P fill:#c8e6c9,stroke:#4CAF50
```

---

## 7. Signature Generation Per Platform

```mermaid
flowchart LR
    subgraph SHOPEE["🛍️ Shopee Signature"]
        S1["Base = partner_id + api_path + timestamp"]
        S2{"Has access_token?"}
        S3["Base += access_token"]
        S4{"Has shop_id?"}
        S5["Base += shop_id"]
        S6["HMAC-SHA256(partner_key, Base)"]
        S1 --> S2
        S2 -->|Yes| S3 --> S4
        S2 -->|No| S4
        S4 -->|Yes| S5 --> S6
        S4 -->|No| S6
    end

    subgraph LAZADA["🟠 Lazada Signature"]
        L1["Params → เรียง Key A→Z"]
        L2["Base = api_path + key1 + val1 + key2 + val2 + ..."]
        L3["HMAC-SHA256(app_secret, Base) → UPPERCASE"]
        L1 --> L2 --> L3
    end

    subgraph TIKTOK["🎵 TikTok Signature"]
        T1["Params → เรียง Key A→Z (ไม่รวม sign, access_token)"]
        T2["Base = app_secret + api_path + key1 + val1 + ... + body?"]
        T3["Base = app_secret + Base + app_secret"]
        T4["HMAC-SHA256(app_secret, Base_full)"]
        T1 --> T2 --> T3 --> T4
    end

    style SHOPEE fill:#fff3e0,stroke:#FF9800
    style LAZADA fill:#fce4ec,stroke:#E91E63
    style TIKTOK fill:#e8eaf6,stroke:#3F51B5
```

---

## 8. Error Handling Strategy

```mermaid
flowchart TD
    REQ["📨 Incoming Request"] --> MODEL{ModelState\nValid?}
    MODEL -->|No| V400["400 Bad Request\nValidation errors"]
    MODEL -->|Yes| LOGIC["Business Logic / Service Call"]

    LOGIC --> EX{Exception?}
    EX -->|"ArgumentException\n(invalid platform, bad param)"| C400["400 Bad Request\nApiResponse.Fail(ex.Message)"]
    EX -->|"No result / null\n(order not found)"| C404["404 Not Found\nApiResponse.Fail(message)"]
    EX -->|"Platform API failure\nUnexpected Exception"| C500["500 Internal Server Error\nApiResponse.Fail('Internal error: ' + ex.Message)\n+ ILogger.LogError()"]
    EX -->|None| C200["200 OK\nApiResponse<T>.Ok(data, message, totalCount?)"]

    subgraph RESPONSE["📦 ApiResponse<T> Wrapper"]
        R1["{ success: true/false,\n  message: string,\n  data: T?,\n  totalCount: int? }"]
    end

    C400 & C404 & C500 & C200 --> RESPONSE

    style V400 fill:#ffcdd2,stroke:#f44336
    style C400 fill:#ffcdd2,stroke:#f44336
    style C404 fill:#ffe0b2,stroke:#FF9800
    style C500 fill:#b71c1c,color:#fff,stroke:#b71c1c
    style C200 fill:#c8e6c9,stroke:#4CAF50
```

---

## 9. Configuration & Environment Variables

```mermaid
flowchart LR
    subgraph ENV[".env / Environment Variables"]
        E1["OMS_API_KEY\n→ ApiKeyMiddleware\n(blank = dev mode)"]
        E2["CORS_ALLOWED_ORIGINS\n→ comma-separated origins\n(blank = localhost defaults)"]
        E3["SHOPEE_PARTNER_ID\nSHOPEE_PARTNER_KEY\nSHOPEE_REDIRECT_URI\nSHOPEE_API_URL"]
        E4["LAZADA_APP_KEY\nLAZADA_APP_SECRET\nLAZADA_REDIRECT_URI\nLAZADA_API_URL"]
        E5["TIKTOK_APP_KEY\nTIKTOK_APP_SECRET\nTIKTOK_REDIRECT_URI\nTIKTOK_API_URL"]
    end

    subgraph USAGE["Usage in Code"]
        U1["ApiKeyMiddleware.cs"]
        U2["Program.cs (CORS)"]
        U3["ShopeeClient.cs\nPlatformAuthService.cs"]
        U4["LazadaClient.cs\nPlatformAuthService.cs"]
        U5["TikTokClient.cs\nPlatformAuthService.cs"]
    end

    E1 --> U1
    E2 --> U2
    E3 --> U3
    E4 --> U4
    E5 --> U5

    style ENV fill:#f9fbe7,stroke:#8BC34A
    style USAGE fill:#e8f4fd,stroke:#2196F3
```

---

## 10. API Endpoint Summary

| Method | Endpoint                                      | Description                    | Auth Required |
| ------ | --------------------------------------------- | ------------------------------ | :-----------: |
| `GET`  | `/api/auth/{platform}/authorize`              | Redirect to OAuth page         |      ❌       |
| `GET`  | `/api/auth/{platform}/auth-url`               | Get OAuth URL (no redirect)    |      ❌       |
| `GET`  | `/api/auth/{platform}/callback`               | OAuth callback handler         |      ❌       |
| `POST` | `/api/auth/{platform}/refresh`                | Refresh access token           |      ✅       |
| `POST` | `/api/order/list`                             | Get orders (single platform)   |      ✅       |
| `POST` | `/api/order/all`                              | Get orders (all platforms)     |      ✅       |
| `GET`  | `/api/order/{platform}/{orderId}`             | Get order detail               |      ✅       |
| `POST` | `/api/inventory/products`                     | Get products (single platform) |      ✅       |
| `POST` | `/api/inventory/products/all`                 | Get products (all platforms)   |      ✅       |
| `GET`  | `/api/inventory/{platform}/{itemId}`          | Get product detail             |      ✅       |
| `POST` | `/api/inventory/low-stock`                    | Get low stock alert            |      ✅       |
| `POST` | `/api/inventory/update-stock`                 | Update stock quantity          |      ✅       |
| `POST` | `/api/shipping/print-label`                   | Print shipping label           |      ✅       |
| `POST` | `/api/shipping/print-labels-batch`            | Batch print labels             |      ✅       |
| `POST` | `/api/shipping/arrange`                       | Arrange shipment               |      ✅       |
| `GET`  | `/api/shipping/tracking/{platform}/{orderId}` | Track parcel                   |      ✅       |
| `GET`  | `/api/shipping/providers/{platform}`          | Get shipping providers         |      ✅       |
| `GET`  | `/api/shop`                                   | Get connected shops            |      ✅       |
| `GET`  | `/api/chat/conversations`                     | ⚠️ 501 — Planned               |      ✅       |
| `GET`  | `/api/chat/conversations/{id}/messages`       | ⚠️ 501 — Planned               |      ✅       |
| `POST` | `/api/chat/conversations/{id}/send`           | ⚠️ 501 — Planned               |      ✅       |

---

## Change Log

### v1.1.0 — 2026-05-01

#### 🔒 Security

- **[CRITICAL] Added `ApiKeyMiddleware`** — ตรวจสอบ `X-Api-Key` header ทุก request
  - อ่าน key จาก `OMS_API_KEY` environment variable
  - หากไม่ตั้งค่า → Dev Mode (อนุญาตทุก request)
  - ข้าม `/swagger` และ `/openapi` paths โดยอัตโนมัติ
  - คืน HTTP 401 JSON เมื่อ key ไม่ถูกต้องหรือขาดหาย
  - ไฟล์: `Middleware/ApiKeyMiddleware.cs`

- **[CRITICAL] แก้ไข CORS Wildcard** — ลบ `"*"` origins
  - อ่าน origins จาก `CORS_ALLOWED_ORIGINS` env var (comma-separated)
  - ค่า default: `localhost:3000`, `localhost:5173`, `localhost:8080`
  - Policy name เปลี่ยนจาก env var เป็น const `"OmsApiCors"`
  - ไฟล์: `Program.cs`

- **[MODERATE] เพิ่ม Swagger Security Definition** — เพิ่ม `X-Api-Key` ใน Swagger UI
  - ผู้ใช้สามารถทดสอบ authenticated endpoints ได้จาก Swagger โดยตรง
  - ไฟล์: `Program.cs`

#### ✅ Validation

- **เพิ่ม Model Validation Attributes** บน 5 model files:
  - `Models/Orders/OrderFilter.cs` — `[StringLength(512)]` บน `AccessToken`; `[Required][StringLength(512)]` บน `PlatformCredentialInput.AccessToken`
  - `Models/Shipping/ShippingModels.cs` — `[Required][StringLength(512/100)]` บน `ShippingLabelRequest` และ `ShipOrderRequest`
  - `Models/Inventory/InventoryModels.cs` — `[StringLength(512)]` บน `ProductFilter.AccessToken`; `[Required]`, `[StringLength]`, `[Range(0, int.MaxValue)]` บน `UpdateStockRequest`
  - `Models/Auth/AuthModels.cs` — `[Required][StringLength(512)]` บน `RefreshTokenRequest.RefreshToken`

#### 🐛 Bug Fixes

- **แก้ไข HTTP Status Codes ใน `OrderController`** — `catch(Exception)` blocks ทั้งหมด  
  เปลี่ยนจาก `return BadRequest(...)` เป็น `return StatusCode(500, ...)` ให้ถูกต้องตาม HTTP semantics
  - `ArgumentException` ยังคืน 400 ตามเดิม (client error)
  - ไฟล์: `Controllers/OrderController.cs`

#### 🔧 Improvements

- **แก้ไข `LazadaClient.GetShippingProvidersAsync`** — เปลี่ยนจาก hardcoded list เป็น real API call
  - เรียก Lazada `/logistics/buyer/providers` endpoint จริง
  - Parse `data.provider_list[]` → map `provider_code`/`provider_name`/`is_active`
  - Fallback กลับ hardcoded list (LEX, Kerry, Flash, ThaiPost) เมื่อ API ไม่ตอบสนองหรือ response ว่าง
  - ไฟล์: `Services/Implementation/Platforms/LazadaClient.cs`

#### 🧪 Tests

- **สร้าง Unit Test Project** `OmsApi.Tests` — xUnit v2.9.2 + .NET 9.0
  - `OrderStatusMapperTests.cs` — 27 tests ครอบคลุม Shopee/Lazada/TikTok status mapping
  - `SignatureHelperTests.cs` — 14 tests ครอบคลุม HMAC-SHA256, signature generation ทุก platform
  - `DateTimeHelperTests.cs` — 9 tests ครอบคลุม Unix timestamp conversion + round-trip
  - `ApiResponseAndPaginationTests.cs` — 16 tests ครอบคลุม `ApiResponse<T>` และ `PaginatedResult<T>`
  - `ApiKeyMiddlewareTests.cs` — 11 tests ครอบคลุม dev mode, Swagger bypass, valid/invalid keys
  - **รวม 77 tests — ผ่านทั้งหมด ✅**

---

### v1.0.0 — Initial Release

- Stateless API Gateway รองรับ Shopee, Lazada, TikTok Shop
- Controller: Auth, Order, Inventory, Shipping, Shop, Chat (placeholder)
- HMAC-SHA256 signature per platform (SignatureHelper)
- Unix timestamp helper (DateTimeHelper)
- Unified order status mapping (OrderStatusMapper)
- Swagger UI at `/swagger`
- DotNetEnv `.env` file support
- Docker support (`Dockerfile`, `docker-compose.yml`)
