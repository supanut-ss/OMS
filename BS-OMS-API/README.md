# BS-OMS-API — Order Management System API

> ระบบ API สำหรับเชื่อมต่อข้อมูลระบบ Shopping Online  
> รองรับ **Shopee**, **Lazada**, **TikTok Shop**

---

## 📋 สารบัญ

- [ภาพรวม](#ภาพรวม)
- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้งและเริ่มต้นใช้งาน](#การติดตั้งและเริ่มต้นใช้งาน)
- [การตั้งค่า Platform Credentials](#การตั้งค่า-platform-credentials)
- [API Endpoints](#api-endpoints)
  - [Authentication (OAuth)](#1-authentication-oauth)
  - [Order Management](#2-order-management)
  - [Chat (Placeholder)](#3-chat-placeholder)
  - [Inventory (สต๊อก)](#4-inventory-สต๊อก)
  - [Shipping (จัดส่ง/ปริ๊นใบปะหน้า)](#5-shipping-จัดส่งปริ๊นใบปะหน้า)
  - [Shop](#6-shop)
- [Unified Order Model](#unified-order-model)
- [Order Status Mapping](#order-status-mapping)
- [ตัวอย่างการใช้งาน](#ตัวอย่างการใช้งาน)
- [Docker Deployment](#docker-deployment)

---

## ภาพรวม

BS-OMS-API เป็น RESTful API ที่ทำหน้าที่เป็น **middleware** ระหว่างระบบของคุณกับ e-commerce platforms ต่างๆ  
ดึงข้อมูล Order จากทุกแพลตฟอร์มมารวมไว้ในรูปแบบเดียวกัน (Unified Order Model) เพื่อให้จัดการได้ง่าย

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Shopee  │────▶│              │     │          │
├──────────┤     │  BS-OMS-API  │────▶│  Client  │
│  Lazada  │────▶│  (Unified)   │     │  (Web/   │
├──────────┤     │              │     │  Mobile) │
│  TikTok  │────▶│              │     │          │
└──────────┘     └──────────────┘     └──────────┘
```

---

## ฟีเจอร์หลัก

| # | ฟีเจอร์ | สถานะ | คำอธิบาย |
|---|---------|--------|----------|
| 1 | **ดึง Order จากทุกช่องทาง** | ✅ พร้อมใช้ | รวม Order จาก Shopee, Lazada, TikTok ไว้ในที่เดียว |
| 2 | **รวมแชทจากทุกช่องทาง** | 🔜 รอพัฒนา | Placeholder endpoints พร้อมสำหรับพัฒนาต่อ |
| 3 | **เช็คสถานะสินค้า Real-time** | ✅ พร้อมใช้ | ดึง Order Status จาก platform โดยตรง |
| 4 | **เช็คสต๊อก จัดการคลัง** | ✅ พร้อมใช้ | ดึงสินค้า อัปเดตสต๊อก Low Stock Alert |
| 5 | **ปริ๊นใบปะหน้า** | ✅ พร้อมใช้ | ปริ๊นใบปะหน้า จัดส่ง ติดตามพัสดุ |

### Focus Features (พร้อมใช้งาน)

| Feature | คำอธิบาย |
|---------|----------|
| ดึงข้อมูล Order | ดึงได้ทั้งรายแพลตฟอร์มและรวมทุกแพลตฟอร์ม |
| Order Status | เช็คสถานะแบบ real-time พร้อม unified status mapping |
| Flag ใบกำกับภาษี | ตรวจสอบว่าลูกค้าต้องการใบกำกับภาษีหรือไม่ |
| Buyer Remarks | ดูหมายเหตุ/ข้อความจากลูกค้า |
| Cancellation Deadline | ดูวันหมดเขตจัดส่ง + แจ้งเตือน Order ที่ใกล้หมดเขต |

---

## โครงสร้างโปรเจกต์

```
BS-OMS-API/OmsApi/
├── Controllers/          # API Endpoints
│   ├── AuthController.cs         # OAuth (authorize, callback, refresh)
│   ├── OrderController.cs        # Order management ⭐
│   ├── InventoryController.cs    # Stock management ⭐
│   ├── ShippingController.cs     # Shipping & labels ⭐
│   ├── ShopController.cs         # Shop connections
│   └── ChatController.cs         # Chat (placeholder)
├── Services/
│   ├── Interfaces/               # Service contracts
│   └── Implementation/
│       ├── Platforms/
│       │   ├── ShopeeClient.cs   # Shopee API v2
│       │   ├── LazadaClient.cs   # Lazada Open Platform
│       │   └── TikTokClient.cs   # TikTok Shop API
│       ├── OrderService.cs       # Unified order aggregation
│       ├── InventoryService.cs   # Multi-platform inventory
│       ├── ShippingService.cs    # Shipping & label generation
│       └── PlatformAuthService.cs
├── Models/
│   ├── Common/      # ApiResponse, PlatformType, PaginatedResult
│   ├── Orders/      # UnifiedOrder, OrderItem, OrderStatus, OrderFilter
│   ├── Inventory/   # ProductItem, StockInfo, ProductFilter, UpdateStockRequest
│   ├── Shipping/    # ShippingLabelRequest/Result, ShipOrderRequest, TrackingInfo
│   └── Auth/        # PlatformCredentials, TokenInfo
├── Helpers/         # SignatureHelper, DateTimeHelper
├── Program.cs       # App configuration
├── .env             # Platform credentials
└── Dockerfile
```

---

## การติดตั้งและเริ่มต้นใช้งาน

### Prerequisites

- .NET 9.0 SDK
- Platform Developer Credentials (Shopee / Lazada / TikTok)

### วิธี Run

```bash
# 1. ไปที่โฟลเดอร์โปรเจกต์
cd BS-OMS-API/OmsApi

# 2. ตั้งค่า credentials ใน .env
# (แก้ไขค่าต่างๆ ให้ตรงกับ app ที่ลงทะเบียนไว้)

# 3. Restore dependencies
dotnet restore

# 4. Run
dotnet run

# 5. เปิด Swagger UI
# http://localhost:5000/swagger
# หน้าแรกของ OMS จะ redirect ไปยัง Swagger โดยอัตโนมัติ
```

---

## การตั้งค่า Platform Credentials

แก้ไขไฟล์ `.env` ในโฟลเดอร์ `OmsApi/`:

```env
# ─── OMS / Database ─────────────────────────────────────
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=http://+:5170
OMS_API_KEY=<API key ที่ WMS ใช้เรียก OMS>
OMS_DB_CONNECTION_STRING=<SQL Server connection string>
# On Server use an absolute persistent folder and grant Modify to the OMS process.
OMS_DATA_PROTECTION_KEYS_PATH=D:\ProgramData\BS-OMS\keys
OMS_DATA_PROTECTION_APP_NAME=OmsApi
# ST only; remove or leave unset in Production
# OMS_ENABLE_SANDBOX_TOKEN_IMPORT=YES
# CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-wms-host
# WAYBILL_STORAGE_ROOT=./storage/waybills

# ─── Shopee Open Platform ───────────────────────────────
SHOPEE_PARTNER_ID=<Partner ID จาก Shopee Developer Console>
SHOPEE_PARTNER_KEY=<Partner Key>
SHOPEE_DEFAULT_SHOP_ID=<Shopee shop_id>
SHOPEE_API_URL=https://partner.shopeemobile.com
SHOPEE_REDIRECT_URL=http://localhost:5170/api/auth/shopee/callback

# ─── Lazada Open Platform ───────────────────────────────
LAZADA_DEFAULT_SHOP_ID=<Lazada seller_id หรือ shop cipher>
LAZADA_APP_KEY=<App Key จาก Lazada Developer Console>
LAZADA_APP_SECRET=<App Secret>
LAZADA_API_URL=https://api.lazada.co.th/rest
LAZADA_AUTH_API_URL=https://auth.lazada.com/rest
LAZADA_AUTH_URL=https://auth.lazada.com/oauth/authorize
LAZADA_REDIRECT_URL=http://localhost:5170/api/auth/lazada/callback

# ─── TikTok Shop ────────────────────────────────────────
TIKTOK_APP_KEY=<App Key จาก TikTok Partner Center>
TIKTOK_APP_SECRET=<App Secret>
# TIKTOK_SERVICE_ID=<ถ้ามี Service ID ให้ระบุ; ถ้าไม่มี ระบบใช้ TIKTOK_APP_KEY แบบเดิม>
TIKTOK_DEFAULT_SHOP_ID=<TikTok shop cipher>
TIKTOK_API_URL=https://open-api.tiktokglobalshop.com
TIKTOK_AUTH_URL=https://services.tiktokshop.com/open/authorize
TIKTOK_AUTH_API_URL=https://auth.tiktok-shops.com
TIKTOK_REDIRECT_URL=http://localhost:5170/api/auth/tiktok/callback
```

`*_DEFAULT_SHOP_ID` เป็นตัวเลือกเริ่มต้นของ OMS เมื่อคำขอจาก WMS ไม่ระบุ `shopId` โดย OMS จะใช้ค่านี้ค้น credential ที่ active ในตาราง `dbo.t_interface_platform_credentials` และ refresh token เมื่อจำเป็น

### วิธีลงทะเบียน App Developer

| Platform | URL | เอกสาร |
|----------|-----|--------|
| Shopee | [open.shopee.com](https://open.shopee.com) | [Developer Guide](https://open.shopee.com/developer-guide/4) |
| Lazada | [open.lazada.com](https://open.lazada.com) | [Getting Started](https://open.lazada.com/apps/doc/getting_started) |
| TikTok | [developers.tiktok.com](https://developers.tiktok.com) | [Overview](https://developers.tiktok.com/doc/overview) |

---

## API Endpoints

### 📌 สรุป Endpoint ทั้งหมด (Quick Reference)

| Group | Method | Endpoint | Description |
|-------|--------|----------|-------------|
| **Auth** | `GET` | `/api/auth/{platform}/authorize` | Redirect ไปหน้า OAuth login ของ platform |
| **Auth** | `GET` | `/api/auth/{platform}/auth-url` | ดึง OAuth URL (ไม่ redirect) |
| **Auth** | `GET` | `/api/auth/{platform}/callback` | รับ callback หลัง authorize สำเร็จ |
| **Auth** | `POST` | `/api/auth/{platform}/refresh` | Refresh token ที่หมดอายุ |
| **Order** | `POST` | `/api/orders/list` | ดึง Order จากแพลตฟอร์มที่ระบุ |
| **Order** | `POST` | `/api/orders/all` | ดึง Order จากทุกแพลตฟอร์มรวมกัน |
| **Order** | `GET` | `/api/orders/{platform}/{orderId}` | ดูรายละเอียด Order |
| **Order** | `GET` | `/api/orders/{platform}/{orderId}/status` | เช็คสถานะ Order |
| **Order** | `POST` | `/api/orders/cancellation-deadlines` | ดู Order ที่ใกล้หมดเขตจัดส่ง |
| **Inventory** | `POST` | `/api/inventory/products` | ดึงสินค้าจาก 1 platform (พร้อมสต๊อก) |
| **Inventory** | `POST` | `/api/inventory/products/all` | ดึงสินค้าจากทุก platform รวมกัน |
| **Inventory** | `GET` | `/api/inventory/{platform}/{itemId}` | ดูรายละเอียดสินค้า + สต๊อก |
| **Inventory** | `POST` | `/api/inventory/low-stock` | ดึงสินค้าที่สต๊อกต่ำ (Low Stock Alert) |
| **Inventory** | `POST` | `/api/inventory/update-stock` | อัปเดตจำนวนสต๊อก |
| **Shipping** | `POST` | `/api/shipping/print-label` | ปริ๊นใบปะหน้าพัสดุ |
| **Shipping** | `POST` | `/api/shipping/print-labels-batch` | ปริ๊นใบปะหน้าแบบ Batch (หลายออเดอร์) |
| **Shipping** | `POST` | `/api/shipping/arrange` | จัดส่งสินค้า (Ship Order) |
| **Shipping** | `GET` | `/api/shipping/tracking/{platform}/{orderId}` | ติดตามสถานะพัสดุ |
| **Shipping** | `GET` | `/api/shipping/providers/{platform}` | ดูผู้ให้บริการขนส่งที่รองรับ |
| **Shipping** | `GET` | `/api/shipping/test-connection/{platform}` | ทดสอบ credential และการเชื่อมต่อ Platform |
| **Chat** | `GET` | `/api/chat/conversations` | 🔜 ดูรายการแชทจากทุกแพลตฟอร์ม |
| **Chat** | `GET` | `/api/chat/conversations/{id}/messages` | 🔜 ดูข้อความในแชท |
| **Chat** | `POST` | `/api/chat/conversations/{id}/send` | 🔜 ส่งข้อความ |
| **Shop** | `GET` | `/api/shop` | ดูรายการร้านค้าที่เชื่อมต่อ |

> `{platform}` = `shopee`, `lazada`, `tiktok` · 🔜 = Placeholder (ยังไม่พร้อมใช้งาน)

---

### 1. Authentication (OAuth)

ใช้สำหรับ authorize ร้านค้าให้ OMS เข้าถึงข้อมูลได้

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| `GET` | `/api/auth/{platform}/authorize` | Redirect ไปหน้า login ของ platform |
| `GET` | `/api/auth/{platform}/auth-url` | ดึง OAuth URL (ไม่ redirect) |
| `GET` | `/api/auth/{platform}/callback` | รับ callback หลัง authorize สำเร็จ |
| `POST` | `/api/auth/{platform}/refresh` | Refresh token ที่หมดอายุ |

> `{platform}` = `shopee`, `lazada`, หรือ `tiktok`

**ขั้นตอนการ Authorize:**

```
1. เรียก GET /api/auth/shopee/authorize
2. ระบบ redirect ไปหน้า login ของ Shopee
3. ผู้ขาย login และอนุญาตให้เข้าถึง
4. Shopee redirect กลับมาที่ /api/auth/shopee/callback พร้อม code
5. ระบบแลก code เป็น access_token
6. ใช้ access_token เรียก API อื่นๆ ต่อ
```

**Refresh Token:**

```json
POST /api/auth/shopee/refresh
{
  "refreshToken": "shopee_refresh_xxx",
  "shopId": "12345"
}
```

---

### 2. Order Management

⭐ **ฟีเจอร์หลัก** — ดึง Order จากทุกแพลตฟอร์ม

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| `POST` | `/api/orders/list` | ดึง Order จากแพลตฟอร์มที่ระบุ |
| `POST` | `/api/orders/all` | ดึง Order จาก **ทุก** แพลตฟอร์มรวมกัน |
| `GET` | `/api/orders/{platform}/{orderId}` | ดูรายละเอียด Order |
| `GET` | `/api/orders/{platform}/{orderId}/status` | เช็คสถานะ Order |
| `POST` | `/api/orders/cancellation-deadlines` | ดู Order ที่ใกล้หมดเขตจัดส่ง |

#### 2.1 ดึง Order จาก 1 แพลตฟอร์ม

```json
POST /api/orders/list
{
  "platform": 0,          // 0=Shopee, 1=Lazada, 2=TikTok
  "accessToken": "your_access_token",
  "shopId": "12345",      // จำเป็นสำหรับ Shopee
  "status": null,         // null=ทุกสถานะ, 0=Unpaid, 2=ReadyToShip, etc.
  "dateFrom": "2025-01-01",
  "dateTo": "2025-01-31",
  "page": 1,
  "pageSize": 50
}
```

#### 2.2 ดึง Order จากทุกแพลตฟอร์มรวมกัน

```json
POST /api/orders/all
{
  "dateFrom": "2025-01-01",
  "dateTo": "2025-01-31",
  "page": 1,
  "pageSize": 50,
  "platformCredentials": [
    {
      "platform": 0,
      "accessToken": "shopee_token_xxx",
      "shopId": "12345"
    },
    {
      "platform": 1,
      "accessToken": "lazada_token_xxx"
    },
    {
      "platform": 2,
      "accessToken": "tiktok_token_xxx",
      "shopId": "shop_cipher_xxx"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Retrieved 15 orders from 3 platforms",
  "data": [
    {
      "orderId": "240101ABC123",
      "platform": "Shopee",
      "status": "ReadyToShip",
      "originalStatus": "READY_TO_SHIP",
      "buyerName": "สมชาย ใจดี",
      "buyerRemarks": "ส่งด่วนด้วยครับ",
      "taxInvoiceRequested": true,
      "taxInvoice": {
        "taxId": "1234567890123",
        "companyName": "บริษัท ตัวอย่าง จำกัด",
        "address": "123 ถ.ตัวอย่าง กรุงเทพ",
        "branchCode": "00000"
      },
      "cancellationDeadline": "2025-01-05T23:59:59Z",
      "daysUntilCancellation": 3,
      "totalAmount": 1500.00,
      "currency": "THB",
      "items": [
        {
          "itemId": "1001",
          "name": "เสื้อยืดสีดำ",
          "sku": "TSHIRT-BLK-L",
          "quantity": 2,
          "unitPrice": 350.00,
          "variation": "สีดำ / Size L",
          "imageUrl": "https://..."
        }
      ],
      "shipping": {
        "carrier": "Kerry Express",
        "trackingNumber": "TH123456789",
        "shippingFee": 50.00
      },
      "createdAt": "2025-01-01T10:30:00Z"
    }
  ],
  "totalCount": 15
}
```

#### 2.3 ดูรายละเอียด Order

```
GET /api/orders/shopee/240101ABC123?accessToken=xxx&shopId=12345
```

#### 2.4 เช็คสถานะ Order

```
GET /api/orders/shopee/240101ABC123/status?accessToken=xxx&shopId=12345
```

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "240101ABC123",
    "platform": "Shopee",
    "status": "ReadyToShip",
    "statusName": "ReadyToShip",
    "originalStatus": "READY_TO_SHIP",
    "cancellationDeadline": "2025-01-05T23:59:59Z",
    "daysUntilCancellation": 3,
    "isUrgent": false
  }
}
```

#### 2.5 ดู Order ที่ใกล้หมดเขตจัดส่ง

```json
POST /api/orders/cancellation-deadlines?daysThreshold=2
{
  "platformCredentials": [
    { "platform": 0, "accessToken": "xxx", "shopId": "12345" },
    { "platform": 1, "accessToken": "xxx" },
    { "platform": 2, "accessToken": "xxx", "shopId": "cipher_xxx" }
  ]
}
```

> จะ return เฉพาะ Order ที่เหลือเวลาจัดส่งไม่เกิน `daysThreshold` วัน เรียงตามวันที่ใกล้หมดเขตที่สุดก่อน

---

### 3. Chat (Placeholder)

> 🔜 **ยังไม่พร้อมใช้งาน** — endpoints ทั้งหมด return `501 Not Implemented`

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| `GET` | `/api/chat/conversations` | ดูรายการแชทจากทุกแพลตฟอร์ม |
| `GET` | `/api/chat/conversations/{id}/messages` | ดูข้อความในแชท |
| `POST` | `/api/chat/conversations/{id}/send` | ส่งข้อความ |

---

### 4. Inventory (สต๊อก)

✅ **พร้อมใช้งาน** — จัดการสินค้า เช็คสต๊อก อัปเดตสต๊อกจากทุก platform

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| `POST` | `/api/inventory/products` | ดึงสินค้าจาก 1 platform (พร้อมสต๊อก) |
| `POST` | `/api/inventory/products/all` | ดึงสินค้าจากทุก platform รวมกัน |
| `GET` | `/api/inventory/{platform}/{itemId}` | ดูรายละเอียดสินค้า + สต๊อก |
| `POST` | `/api/inventory/low-stock` | ⚠️ Low Stock Alert |
| `POST` | `/api/inventory/update-stock` | อัปเดตจำนวนสต๊อก |

#### 4.1 ดึงสินค้าจาก 1 แพลตฟอร์ม

```json
POST /api/inventory/products
{
  "platform": 0,
  "accessToken": "your_access_token",
  "shopId": "12345",
  "keyword": "เสื้อ",
  "itemStatus": "NORMAL",
  "page": 1,
  "pageSize": 20
}
```

#### 4.2 ดึงสินค้าจากทุก platform

```json
POST /api/inventory/products/all
{
  "platformCredentials": [
    { "platform": 0, "accessToken": "shopee_token", "shopId": "123" },
    { "platform": 1, "accessToken": "lazada_token" },
    { "platform": 2, "accessToken": "tiktok_token", "shopId": "cipher" }
  ]
}
```

#### 4.3 Low Stock Alert

```json
POST /api/inventory/low-stock?threshold=5
{
  "platformCredentials": [
    { "platform": 0, "accessToken": "shopee_token", "shopId": "123" }
  ]
}
```

> return เฉพาะสินค้าที่มีสต๊อกรวม ≤ threshold

#### 4.4 อัปเดตสต๊อก

```json
POST /api/inventory/update-stock
{
  "platform": 0,
  "accessToken": "shopee_token",
  "shopId": "12345",
  "itemId": "1001",
  "variationId": "5001",
  "newStock": 100
}
```

---

### 5. Shipping (จัดส่ง/ปริ๊นใบปะหน้า)

✅ **พร้อมใช้งาน** — ปริ๊นใบปะหน้าพัสดุ จัดส่ง ติดตามพัสดุ

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| `POST` | `/api/shipping/print-label` | ปริ๊นใบปะหน้าพัสดุ |
| `POST` | `/api/shipping/print-labels-batch` | ปริ๊นใบปะหน้าแบบ Batch |
| `POST` | `/api/shipping/arrange` | จัดส่ง (Ship Order) |
| `GET` | `/api/shipping/tracking/{platform}/{orderId}` | ติดตามพัสดุ |
| `GET` | `/api/shipping/providers/{platform}` | ดูผู้ให้บริการขนส่ง |

#### 5.1 ปริ๊นใบปะหน้าพัสดุ (Shipping Label / AWB)

> ⚠️ **API จะไม่ปริ๊นโดยตรง** — API จะดึงใบปะหน้าจาก Platform แล้ว **return เอกสาร (PDF)** กลับมาให้ฝั่ง Frontend นำไปปริ๊น

**Flow การทำงาน:**

```
Frontend                         BS-OMS-API                      Platform API
   │                                │                                │
   │── POST /print-label ──────────▶│                                │
   │                                │── ขอสร้าง shipping document ──▶│
   │                                │◀── สร้างสำเร็จ ────────────────│
   │                                │── ดาวน์โหลด document ────────▶│
   │                                │◀── return PDF/URL ─────────────│
   │◀── return ข้อมูลใบปะหน้า ──────│                                │
   │                                │                                │
   │  เอา PDF ไปปริ๊น (Ctrl+P)      │                                │
```

**Request:**

```json
POST /api/shipping/print-label
{
  "platform": 0,
  "accessToken": "shopee_token",
  "shopId": "12345",
  "orderId": "240101ABC123",
  "documentType": "NORMAL_AIR_WAYBILL"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Shipping label generated successfully",
  "data": {
    "platform": "Shopee",
    "orderId": "240101ABC123",
    "documentBase64": "JVBERi0xLjQg...",
    "documentUrl": "",
    "contentType": "application/pdf",
    "trackingNumber": "TH123456789",
    "carrier": "Kerry Express",
    "status": "READY"
  }
}
```

**ประเภท Document Type:**

| Platform | documentType ที่รองรับ | คำอธิบาย |
|----------|----------------------|----------|
| Shopee | `NORMAL_AIR_WAYBILL` | ใบปะหน้ามาตรฐาน |
| Shopee | `THERMAL_AIR_WAYBILL` | ใบปะหน้าสำหรับเครื่องปริ๊นความร้อน |
| Lazada | `shippingLabel` | ใบปะหน้ามาตรฐาน |
| TikTok | `SHIPPING_LABEL` | ใบปะหน้ามาตรฐาน |

**ความแตกต่างแต่ละ Platform:**

| Platform | ข้อมูลที่ return | วิธีเปิดใบปะหน้า |
|----------|----------------|-----------------|
| **Shopee** | `documentBase64` (PDF เข้ารหัส Base64) | แปลง Base64 → Blob → เปิดปริ๊น |
| **Lazada** | `documentUrl` (URL ดาวน์โหลด) | เปิด URL ตรงๆ |
| **TikTok** | `documentUrl` (URL ดาวน์โหลด) | เปิด URL ตรงๆ |

**ตัวอย่าง Frontend เอาไปปริ๊น (JavaScript):**

```javascript
// กรณี Shopee — ได้ Base64 กลับมา
if (response.data.documentBase64) {
  const byteChars = atob(response.data.documentBase64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url);  // เปิด PDF แล้วกด Ctrl+P ปริ๊น
}

// กรณี Lazada / TikTok — ได้ URL กลับมา
if (response.data.documentUrl) {
  window.open(response.data.documentUrl);  // เปิด PDF จาก URL
}
```

---

#### 5.2 ปริ๊นใบปะหน้า Batch (หลายออเดอร์พร้อมกัน)

> ส่ง array ของ request — ระบบจะดึงใบปะหน้าจากทุก order **พร้อมกัน** (parallel)

```json
POST /api/shipping/print-labels-batch
[
  { "platform": 0, "accessToken": "token", "shopId": "123", "orderId": "ORDER001" },
  { "platform": 0, "accessToken": "token", "shopId": "123", "orderId": "ORDER002" },
  { "platform": 1, "accessToken": "token", "orderId": "ORDER003" }
]
```

**Response:**

```json
{
  "success": true,
  "message": "Generated 3/3 shipping labels",
  "data": [
    { "platform": "Shopee", "orderId": "ORDER001", "documentBase64": "...", "status": "READY" },
    { "platform": "Shopee", "orderId": "ORDER002", "documentBase64": "...", "status": "READY" },
    { "platform": "Lazada", "orderId": "ORDER003", "documentUrl": "https://...", "status": "READY" }
  ]
}
```

---

#### 5.3 จัดส่งสินค้า (Ship Order / Arrange Shipment)

> เรียกใช้หลังจากพร้อมจัดส่ง — แจ้ง platform ว่าเตรียมส่งพัสดุแล้ว

```json
POST /api/shipping/arrange
{
  "platform": 0,
  "accessToken": "shopee_token",
  "shopId": "12345",
  "orderId": "240101ABC123",
  "shippingProviderId": "10001"
}
```

---

#### 5.4 ติดตามพัสดุ

```
GET /api/shipping/tracking/shopee/240101ABC123?accessToken=xxx&shopId=12345
```

**Response:**

```json
{
  "success": true,
  "data": {
    "platform": "Shopee",
    "orderId": "240101ABC123",
    "trackingNumber": "TH123456789",
    "carrier": "Kerry Express",
    "status": "Tracked",
    "events": [
      { "description": "พัสดุถึงศูนย์คัดแยก กรุงเทพฯ", "timestamp": "2025-03-04T14:30:00Z" },
      { "description": "รับพัสดุจากผู้ส่ง", "timestamp": "2025-03-04T10:00:00Z" }
    ]
  }
}
```

---

#### 5.5 ดูผู้ให้บริการขนส่ง

```
GET /api/shipping/providers/shopee?accessToken=xxx&shopId=12345
```

---


### 6. Shop

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| `GET` | `/api/shop` | ดูรายการร้านค้าที่เชื่อมต่อ |

---

## Unified Order Model

ทุก Order จากทุกแพลตฟอร์มจะถูกแปลงเป็นรูปแบบเดียวกัน:

| Field | Type | คำอธิบาย |
|-------|------|----------|
| `orderId` | string | รหัส Order (จาก platform) |
| `platform` | enum | `Shopee` / `Lazada` / `TikTok` |
| `status` | enum | สถานะที่ normalize แล้ว |
| `originalStatus` | string | สถานะดั้งเดิมจาก platform |
| `buyerName` | string | ชื่อผู้ซื้อ |
| `buyerRemarks` | string | ⭐ หมายเหตุจากลูกค้า |
| `taxInvoiceRequested` | bool | ⭐ ต้องการใบกำกับภาษี? |
| `taxInvoice` | object | ข้อมูลใบกำกับภาษี (taxId, companyName, address) |
| `cancellationDeadline` | datetime | ⭐ วันหมดเขตจัดส่ง |
| `daysUntilCancellation` | int | ⭐ จำนวนวันเหลือก่อนถูกยกเลิก |
| `totalAmount` | decimal | ยอดรวม |
| `currency` | string | สกุลเงิน (THB) |
| `items` | array | รายการสินค้า |
| `shipping` | object | ข้อมูลการจัดส่ง |
| `createdAt` | datetime | วันสร้าง Order |

---

## Order Status Mapping

ระบบจะ normalize สถานะจากทุกแพลตฟอร์มให้เป็นรูปแบบเดียวกัน:

| Unified Status | Shopee | Lazada | TikTok | ความหมาย |
|---------------|--------|--------|--------|----------|
| `Unpaid` | UNPAID | unpaid | UNPAID | ยังไม่ชำระเงิน |
| `Pending` | INVOICE_PENDING | pending | ON_HOLD | รอดำเนินการ |
| `ReadyToShip` | READY_TO_SHIP | ready_to_ship | AWAITING_SHIPMENT | พร้อมจัดส่ง |
| `Shipped` | SHIPPED | shipped | IN_TRANSIT | กำลังจัดส่ง |
| `Delivered` | — | delivered | DELIVERED | จัดส่งสำเร็จ |
| `Completed` | COMPLETED | — | COMPLETED | เสร็จสิ้น |
| `Cancelled` | CANCELLED | canceled | CANCELLED | ยกเลิก |
| `ReturnRefund` | IN_CANCEL | returned | REVERSE | คืนสินค้า/คืนเงิน |

**ค่า enum สำหรับ filter:**

```
0 = Unpaid
1 = Pending
2 = ReadyToShip
3 = Shipped
4 = Delivered
5 = Completed
6 = Cancelled
7 = ReturnRefund
```

---

## ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: ดึง Order ทั้งหมดจากทุกแพลตฟอร์ม (ย้อนหลัง 7 วัน)

```bash
curl -X POST http://localhost:5000/api/orders/all \
  -H "Content-Type: application/json" \
  -d '{
    "dateFrom": "2025-02-26",
    "dateTo": "2025-03-05",
    "platformCredentials": [
      { "platform": 0, "accessToken": "shopee_token", "shopId": "123" },
      { "platform": 1, "accessToken": "lazada_token" },
      { "platform": 2, "accessToken": "tiktok_token", "shopId": "cipher" }
    ]
  }'
```

### ตัวอย่างที่ 2: เช็ค Order ที่ใกล้หมดเขตจัดส่ง (ภายใน 1 วัน)

```bash
curl -X POST "http://localhost:5000/api/orders/cancellation-deadlines?daysThreshold=1" \
  -H "Content-Type: application/json" \
  -d '{
    "platformCredentials": [
      { "platform": 0, "accessToken": "shopee_token", "shopId": "123" },
      { "platform": 1, "accessToken": "lazada_token" }
    ]
  }'
```

### ตัวอย่างที่ 3: ดูรายละเอียด Order พร้อมใบกำกับภาษี

```bash
curl "http://localhost:5000/api/orders/shopee/240101ABC123?accessToken=xxx&shopId=12345"
```

### ตัวอย่างที่ 4: เช็คสถานะ Order

```bash
curl "http://localhost:5000/api/orders/lazada/5001234567?accessToken=xxx"
```

---

## Docker Deployment

### Build แบบ standalone

```bash
cd BS-OMS-API
docker build -t bs-oms-api -f Dockerfile ..
docker run -p 8082:8080 --env-file OmsApi/.env bs-oms-api
```

### Run ร่วมกับ BS-Platform (docker-compose)

```bash
cd BS-Platform
docker-compose up -d bs_oms_api
```

- API จะ run ที่ **port 8082**
- Swagger UI: `http://localhost:8082/swagger`

---

## API Response Format

ทุก endpoint return ในรูปแบบเดียวกัน:

```json
{
  "success": true,           // สำเร็จหรือไม่
  "message": "Success",      // ข้อความ
  "data": { ... },           // ข้อมูล (แตกต่างตาม endpoint)
  "totalCount": 10           // จำนวนทั้งหมด (ถ้ามี)
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error: Invalid platform 'abc'. Supported: shopee, lazada, tiktok",
  "data": null,
  "totalCount": null
}
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | .NET 9.0 Web API |
| API Docs | Swagger UI + OpenAPI 3.0 |
| HTTP Client | `IHttpClientFactory` (Named Clients) |
| Auth | HMAC-SHA256 Signature (per platform) |
| Config | DotNetEnv (.env files) |
| Container | Docker (multi-stage build) |

---

## อ้างอิง

- [Shopee Open Platform](https://open.shopee.com/developer-guide/4)
- [Lazada Open Platform](https://open.lazada.com/apps/doc/getting_started)
- [TikTok Shop Developer](https://developers.tiktok.com/doc/overview)
