# Web OMS — User Manual & Program Description
# Web OMS — คู่มือการใช้งานและรายละเอียดโปรแกรม

> **Language / ภาษา:** [English](#part-1--english) · [ภาษาไทย](#ส่วนที่-2--ภาษาไทย)
>
> Sections 1–4 are for everyday users. Section 5 is for administrators and developers. /
> หัวข้อ 1–4 สำหรับผู้ใช้งานทั่วไป หัวข้อ 5 สำหรับผู้ดูแลระบบและนักพัฒนา

---

# Part 1 — English

## 1. What is Web OMS?

Web OMS is a website that gathers the orders from your online shops (Shopee, Lazada, TikTok Shop) in one place. With it you can:

- connect your online shops to the system,
- see how many orders came in and whether each one was passed on to the warehouse system correctly,
- find a specific order and see its details,
- retry an order that failed to transfer.

| Screen | What you use it for |
| --- | --- |
| **Dashboard** | A summary: how many orders, how many succeeded, how many failed |
| **Order List** | Search and browse all orders |
| **Order Detail** | See everything about one order |
| **Sync Log** | See the history of transfers and retry failed ones |
| **Connector** | Connect, disconnect or switch off an online shop |

If you cannot see a screen in the left-hand menu, you have not been given access. Ask your administrator.

## 2. Common words (Glossary)

| Word | Plain meaning |
| --- | --- |
| **Marketplace / Platform** | The online selling site: Shopee, Lazada or TikTok Shop |
| **Connector** | One online shop that is linked to the system |
| **Shop ID / Seller ID** | The number that identifies your shop on the marketplace |
| **Sync** | Copying orders from the marketplace into the system (and on to the warehouse) |
| **Sync Status** | Whether the copy worked: *Synced/Success* = done, *Pending* = waiting, *Error* = failed |
| **WM3 Status** | The order's status inside the warehouse system (for example Open, Closed, Cancelled) |
| **Authorise / OAuth / Connect OAuth** | Giving the system permission to read your shop's orders. You do this by logging in on the marketplace's own page — the system never sees your password |
| **Token** | The permission pass the marketplace gives the system. It expires after a while, so you must reconnect from time to time |
| **App Master** | The application registration (key and secret) issued by the marketplace. Several shops can share one App Master. Normally an administrator provides it |
| **Redirect URL** | The address the marketplace sends you back to after you approve. It must match what is registered on the marketplace |
| **Resync** | Ask the system to fetch one failed order again |
| **Payload** | The raw data that was sent to the warehouse system for an order. Mainly for technical staff checking a problem |

## 3. How to use each screen

### 3.1 Sign in

1. Open the system address given by your administrator (it ends with `/oms`).
2. Enter your user name and password.
3. Use the language button at the top to switch between Thai and English.

### 3.2 Connector — link an online shop

Open **Master → Connector**. Each card is one shop and shows its marketplace, shop ID, connection status and when its token expires.

| Status | What it means | What to do |
| --- | --- | --- |
| **Connected** (green) | Working normally | Nothing |
| **Needs re-authorisation** (red) | Permission expired or was withdrawn | Click **Reconnect** |
| **Temporarily disabled** (grey tag) | Shop switched off — its orders are not collected | Switch it back on when needed |

**To add a new shop**

1. Click **Add Connector**.
2. Choose the marketplace.
3. Fill in the form:
   - **Shop name** — optional, any name you like.
   - **Shop ID / Seller ID** — required. It cannot be changed later.
   - **App Master** — choose from the list. If the list is empty, tick *Create new app* and enter the app name, App Key / Partner ID, App Secret / Partner Key and Redirect URL provided by your administrator (TikTok also has an optional Service ID).
4. Click **Save**. The shop appears with the red status — this is normal at this point.
5. Click **Connect OAuth**. A new browser tab opens the marketplace's page. Log in as the shop owner and approve. *If nothing opens, allow pop-ups for this site and click again.*
6. You are brought back to the Connector screen. The status should now be green **Connected**.

**Other buttons on a shop card**

- **Reconnect** — do the approval again when the status is red.
- **Switch** — turn the shop on or off without deleting it.
- **Pencil** — change the shop name or the App Master (shop ID cannot change).
- **Bin** — delete the shop after confirming. If the system says it cannot be deleted, switch it off instead.

### 3.3 Dashboard — see the big picture

Open **Dashboard**. The numbers are live.

- **Period buttons:** Today / 7 days / 30 days / All. **Platform buttons:** all shops or one marketplace.
- **Four number tiles:** Orders, Synced (done), Pending (waiting), Sync errors (failed).
- **Charts:** orders per day, and the share of Synced / Pending / Error.
- **Marketplace summary:** the same numbers for each marketplace, plus the result of its latest transfer.
- **Latest sync runs:** recent transfers. For a failed one, click **Open affected order**.
- **Recent orders:** the latest 10 orders. Click one to see its details.
- Click the **refresh** icon at the top right to reload. Choosing "All" can take a while on large data; a progress message is shown.

### 3.4 Order List — find orders

Open **Order List**.

1. Pick any filters: **Platform**, **Order Status (WM3)**, **Sync Status**, or type part of the **Order Number**.
2. Click **Search**. Click **Clear filters** to start over.
3. The newest orders are at the top. The table toolbar lets you choose columns, sort, filter, export and change how many rows show per page.
4. Click an order number (or its row) to open the details.

Colour hints — *Sync Status:* green = done, yellow = waiting, red = failed.

### 3.5 Order Detail — look at one order

The top shows the marketplace, order number and statuses. Below are the order information (customer ship-to details, carrier, tracking number, total) and three tabs:

- **Sync Request Payload** — the data sent to the warehouse system (for technical checks).
- **Order Items** — SKU, product name, quantity, unit price.
- **Sync History** — what happened to this order step by step, with the latest 100 events. Failed steps are counted and highlighted, with the reason.

Click **Back to Order List** to return.

### 3.6 Sync Log — retry a failed order

Open **Log → Sync**. It lists every transfer event, newest first.

1. Find a row whose **Status** is **ERROR**. Read the *Error Details* column to see why.
2. If the cause is fixed (for example you reconnected the shop), click **Resync** on that row. The button works only on ERROR rows.
3. A green message means the order was fetched again; a red message gives the reason.

### 3.7 Quick guide — "I want to…"

| I want to… | Do this |
| --- | --- |
| Add a new shop | Connector → Add Connector → Save → Connect OAuth |
| Know why orders stopped coming | Connector → look for a red status → Reconnect |
| Find an order | Order List → type the order number → Search |
| Fix an order that did not reach the warehouse | Sync Log → find ERROR → fix the cause → Resync |
| Pause a shop | Connector → switch it off |

## 4. Troubleshooting

| Problem | What to do |
| --- | --- |
| Nothing opens when I click Connect OAuth | Allow pop-ups for this site, then click again |
| Connect OAuth button is greyed out | The chosen App Master is incomplete. Click the pencil and pick or create a complete one, or ask your administrator |
| Back on Connector but still red | The wrong shop may have been approved, or the Redirect URL differs from the marketplace setting. Ask your administrator |
| A table is empty or says it failed to load | Sign in again; if it continues, you may lack access or the server is unavailable — contact your administrator |
| Dashboard shows "—" | Data is still loading or failed. Click refresh / Retry |
| Resync failed | Read the red message. Common causes: shop needs reconnecting, or the order no longer exists on the marketplace |
| Suddenly asked to sign in again | Your session expired. Sign in again |

---

## 5. For administrators and developers

### 5.1 Architecture

- React 19, React Router 7, Material UI 7 + MUI X Data Grid, Chart.js, Axios, SweetAlert2. Served under `/oms` (`REACT_APP_BASE_URL`).
- Access per screen is controlled by menu permission (`PermissionRoute`); assign menus in Authentication → Assign Menu.
- Routes: `/dashboard/dashboard`, `/orderlist/orderlist`, `/orderlist/orderlist/:orderRecordId`, `/log/sync`, `/master/connector`.
- Data access:
  - Grids and Dashboard use the platform gateway (`AxiosMaster`, `BSDataGrid`, `POST /dynamic/datagrid`) reading schema `oms`: `t_oms_order`, `t_oms_sync_log`, `vw_oms_order_sync_history`; combobox values come from `sec.t_com_combobox_item` (groups `platform_shop`, `order_status`, `sync_status`).
  - Connector uses the gateway: `GET /Connector`, `GET /Connector/apps`, `POST /Connector/save`, `POST /Connector/set-active`, `POST /Connector/{id}` (delete; HTTP 409 when still referenced).
  - OAuth start calls the OMS API directly: `GET {OMS_API_URL}/auth/{platform}/auth-url?platformAppShopId={id}`; the URL must be `https://`.
  - Resync: `GET /oms-orders/{platform}/{orderId}/resync[?shopId=]`.
- Marketplace secrets are sent only once when creating an App Master and are never returned to the browser (only flags such as `hasAppKey`, `hasAppSecret`). Tokens stay in the OMS API.

### 5.2 Install and run

```bash
cd BS-Web/Frontend-Core
npm install
npm start          # development, uses .env.development
npm run build      # production build (craco)
```

### 5.3 Environment variables (build time, public values only)

| Variable | Example | Purpose |
| --- | --- | --- |
| `REACT_APP_BASE_URL` | `/oms` | Path the SPA is served from |
| `REACT_APP_API_URL` | `https://<domain>/oms_gateway/v1/api` | Gateway for grids and Connector |
| `REACT_APP_OMS_API_URL` | `/api` | OMS API base used to start OAuth |
| `REACT_APP_FRONTEND_BASE_URL` | `https://<domain>/oms` | Public SPA URL |
| `REACT_APP_OAUTH_CALLBACK_BASE_URL` | `https://<domain>/api/auth` | Operator reference |
| `REACT_APP_WEBHOOK_BASE_URL` | `https://<domain>/api/webhooks` | Operator reference |

Never put marketplace app keys, secrets or tokens in `REACT_APP_*` values.

### 5.4 Proxy, OAuth callback and webhook

See [OMS_MARKETPLACE_OAUTH_WEBHOOKS.md](OMS_MARKETPLACE_OAUTH_WEBHOOKS.md). In short: route `/api/auth/*` and `/api/webhooks/*` to the OMS API **before** the SPA fallback, and register the exact callback URL (the same as the connector's Redirect URL) in each marketplace console.

### 5.5 Related documents

- [OMS_MARKETPLACE_OAUTH_WEBHOOKS.md](OMS_MARKETPLACE_OAUTH_WEBHOOKS.md) — public routes, proxy, OAuth and webhook setup
- [BSDataGrid.md](BSDataGrid.md) — the grid component used by Order List and Sync Log
- `BS-OMS-API/README.md` — back-end API reference

---

# ส่วนที่ 2 — ภาษาไทย

## 1. Web OMS คืออะไร

Web OMS คือเว็บไซต์ที่รวมออเดอร์จากร้านค้าออนไลน์ของคุณ (Shopee, Lazada, TikTok Shop) ไว้ในที่เดียว ใช้สำหรับ:

- เชื่อมต่อร้านค้าออนไลน์เข้ากับระบบ
- ดูว่ามีออเดอร์เข้ากี่รายการ และแต่ละรายการส่งต่อไปยังระบบคลังสินค้าสำเร็จหรือไม่
- ค้นหาออเดอร์ที่ต้องการและดูรายละเอียด
- สั่งดึงออเดอร์ที่ส่งต่อไม่สำเร็จมาทำใหม่

| หน้าจอ | ใช้ทำอะไร |
| --- | --- |
| **Dashboard** | สรุปภาพรวม มีออเดอร์เท่าไร สำเร็จเท่าไร ผิดพลาดเท่าไร |
| **Order List** | ค้นหาและดูรายการออเดอร์ทั้งหมด |
| **Order Detail** | ดูข้อมูลทั้งหมดของออเดอร์หนึ่งรายการ |
| **Sync Log** | ดูประวัติการส่งต่อ และสั่งทำใหม่เมื่อผิดพลาด |
| **Connector** | เชื่อมต่อ ยกเลิก หรือปิดร้านค้าออนไลน์ |

หากไม่เห็นหน้าจอใดในเมนูซ้ายมือ แสดงว่ายังไม่ได้รับสิทธิ์ ให้แจ้งผู้ดูแลระบบ

## 2. คำศัพท์ที่พบบ่อย

| คำ | ความหมายแบบเข้าใจง่าย |
| --- | --- |
| **Marketplace / Platform** | เว็บขายของออนไลน์ เช่น Shopee, Lazada, TikTok Shop |
| **Connector** | ร้านค้าออนไลน์หนึ่งร้านที่เชื่อมกับระบบ |
| **Shop ID / Seller ID** | รหัสประจำร้านของคุณบน Marketplace |
| **Sync** | การคัดลอกออเดอร์จาก Marketplace เข้าระบบ (และส่งต่อไปคลังสินค้า) |
| **Sync Status** | ผลของการคัดลอก: *Synced/Success* = สำเร็จ, *Pending* = รอดำเนินการ, *Error* = ผิดพลาด |
| **WM3 Status** | สถานะของออเดอร์ในระบบคลังสินค้า เช่น Open, Closed, Cancelled |
| **ยืนยันตัวตน / OAuth / เชื่อมต่อ OAuth** | การอนุญาตให้ระบบอ่านออเดอร์ของร้านคุณ ทำโดยล็อกอินในหน้าของ Marketplace เอง ระบบไม่เห็นรหัสผ่านของคุณ |
| **Token** | บัตรอนุญาตที่ Marketplace ให้ระบบ มีวันหมดอายุ จึงต้องเชื่อมต่อใหม่เป็นระยะ |
| **App Master** | ข้อมูลการลงทะเบียนแอป (Key และ Secret) ที่ Marketplace ออกให้ หลายร้านใช้ App Master เดียวกันได้ โดยปกติผู้ดูแลระบบเป็นผู้ให้ข้อมูล |
| **Redirect URL** | ที่อยู่ที่ Marketplace พาคุณกลับมาหลังกดอนุญาต ต้องตรงกับที่ลงทะเบียนไว้ใน Marketplace |
| **Resync** | สั่งให้ระบบดึงออเดอร์ที่ผิดพลาดรายการนั้นมาใหม่ |
| **Payload** | ข้อมูลดิบที่ส่งไปยังระบบคลังสินค้าของออเดอร์นั้น ใช้สำหรับทีมเทคนิคตรวจสอบปัญหา |

## 3. วิธีใช้งานแต่ละหน้าจอ

### 3.1 เข้าสู่ระบบ

1. เปิดที่อยู่เว็บที่ผู้ดูแลระบบแจ้ง (ลงท้ายด้วย `/oms`)
2. กรอกชื่อผู้ใช้และรหัสผ่าน
3. กดปุ่มภาษาด้านบนเพื่อสลับไทย/อังกฤษ

### 3.2 Connector — เชื่อมต่อร้านค้าออนไลน์

เปิด **Master → Connector** แต่ละการ์ดคือหนึ่งร้าน แสดง Marketplace, Shop ID, สถานะการเชื่อมต่อ และวันหมดอายุของ Token

| สถานะ | ความหมาย | ต้องทำอะไร |
| --- | --- | --- |
| **เชื่อมต่อแล้ว** (เขียว) | ใช้งานได้ปกติ | ไม่ต้องทำอะไร |
| **ต้องยืนยันตัวตนใหม่** (แดง) | สิทธิ์หมดอายุหรือถูกถอน | กด **เชื่อมต่อใหม่** |
| **ปิดใช้งานชั่วคราว** (ป้ายเทา) | ปิดร้านไว้ ระบบไม่ดึงออเดอร์ของร้านนี้ | เปิดสวิตช์เมื่อต้องการใช้งาน |

**เพิ่มร้านใหม่**

1. กด **เพิ่ม Connector**
2. เลือก Marketplace
3. กรอกแบบฟอร์ม:
   - **Shop name** — ไม่บังคับ ตั้งชื่ออะไรก็ได้
   - **Shop ID / Seller ID** — จำเป็น และแก้ไขภายหลังไม่ได้
   - **App Master** — เลือกจากรายการ หากรายการว่าง ให้เลือก *สร้าง App ใหม่* แล้วกรอกชื่อ App, App Key / Partner ID, App Secret / Partner Key และ Redirect URL ตามที่ผู้ดูแลระบบให้ (TikTok มี Service ID ซึ่งไม่บังคับ)
4. กด **บันทึก** ร้านจะแสดงสถานะสีแดง ซึ่งเป็นเรื่องปกติในขั้นตอนนี้
5. กด **เชื่อมต่อ OAuth** จะเปิดแท็บใหม่ไปหน้าของ Marketplace ให้ล็อกอินด้วยบัญชีเจ้าของร้านแล้วกดอนุญาต *หากไม่มีอะไรเปิดขึ้น ให้อนุญาต Pop-up ของเว็บนี้แล้วกดใหม่*
6. ระบบพากลับมาหน้า Connector สถานะควรเป็นสีเขียว **เชื่อมต่อแล้ว**

**ปุ่มอื่นบนการ์ดร้านค้า**

- **เชื่อมต่อใหม่** — ทำการอนุญาตซ้ำเมื่อสถานะเป็นสีแดง
- **สวิตช์** — เปิด/ปิดร้านโดยไม่ลบ
- **ดินสอ** — แก้ชื่อร้านหรือ App Master (Shop ID เปลี่ยนไม่ได้)
- **ถังขยะ** — ลบร้านหลังกดยืนยัน หากระบบแจ้งว่าลบไม่ได้ ให้ปิดสวิตช์แทน

### 3.3 Dashboard — ดูภาพรวม

เปิด **Dashboard** ตัวเลขเป็นข้อมูลล่าสุด

- **ปุ่มช่วงเวลา:** วันนี้ / 7 วัน / 30 วัน / ทั้งหมด **ปุ่มแพลตฟอร์ม:** ทุกร้าน หรือเลือกรายแพลตฟอร์ม
- **การ์ดตัวเลข 4 ใบ:** ออเดอร์, Sync สำเร็จ, รอดำเนินการ, Sync ผิดพลาด
- **กราฟ:** จำนวนออเดอร์รายวัน และสัดส่วน สำเร็จ / รอ / ผิดพลาด
- **สรุปตามแพลตฟอร์ม:** ตัวเลขเดียวกันแยกตาม Marketplace พร้อมผลการส่งต่อรอบล่าสุด
- **รอบ Sync ล่าสุด:** การส่งต่อล่าสุด หากรายการใดผิดพลาด กด **เปิดออเดอร์ที่ผิดพลาด**
- **ออเดอร์ล่าสุด:** 10 ออเดอร์ล่าสุด คลิกเพื่อดูรายละเอียด
- กดไอคอน **โหลดข้อมูลใหม่** มุมขวาบนเพื่อรีเฟรช การเลือก "ทั้งหมด" อาจใช้เวลานานเมื่อข้อมูลเยอะ ระบบจะแสดงความคืบหน้า

### 3.4 Order List — ค้นหาออเดอร์

เปิด **Order List**

1. เลือกตัวกรองที่ต้องการ: **Platform**, **สถานะออเดอร์ (WM3)**, **Sync Status** หรือพิมพ์บางส่วนของ **เลข Order**
2. กด **ค้นหา** หากต้องการเริ่มใหม่กด **ล้างตัวกรอง**
3. ออเดอร์ใหม่สุดอยู่ด้านบน แถบเครื่องมือของตารางใช้เลือกคอลัมน์ เรียงลำดับ กรอง ส่งออก และเปลี่ยนจำนวนแถวต่อหน้า
4. คลิกเลขที่คำสั่งซื้อ (หรือคลิกที่แถว) เพื่อเปิดรายละเอียด

คำใบ้เรื่องสี — *Sync Status:* เขียว = สำเร็จ, เหลือง = รอดำเนินการ, แดง = ผิดพลาด

### 3.5 Order Detail — ดูออเดอร์รายการเดียว

ด้านบนแสดง Marketplace เลขที่คำสั่งซื้อ และสถานะ ถัดลงมาเป็นข้อมูลออเดอร์ (ที่อยู่จัดส่งของลูกค้า ขนส่ง เลข Tracking ยอดรวม) และมี 3 แท็บ:

- **Request Payload (Sync)** — ข้อมูลที่ส่งไประบบคลังสินค้า (สำหรับตรวจสอบทางเทคนิค)
- **รายการสินค้า** — SKU, ชื่อสินค้า, จำนวน, ราคาต่อหน่วย
- **ประวัติการ Sync** — สิ่งที่เกิดกับออเดอร์นี้ทีละขั้น แสดง 100 เหตุการณ์ล่าสุด ขั้นที่ผิดพลาดจะถูกนับและเน้นสีพร้อมสาเหตุ

กด **กลับไปหน้า Order List** เพื่อย้อนกลับ

### 3.6 Sync Log — สั่งทำใหม่เมื่อผิดพลาด

เปิด **Log → Sync** แสดงทุกเหตุการณ์การส่งต่อ ใหม่สุดก่อน

1. หาแถวที่ **สถานะ** เป็น **ERROR** อ่านคอลัมน์ *รายละเอียด Error* เพื่อดูสาเหตุ
2. เมื่อแก้สาเหตุแล้ว (เช่น เชื่อมต่อร้านใหม่) กด **Resync** ที่แถวนั้น ปุ่มนี้ใช้ได้เฉพาะแถว ERROR
3. ข้อความสีเขียว = ดึงออเดอร์ใหม่สำเร็จ ข้อความสีแดง = แจ้งสาเหตุที่ล้มเหลว

### 3.7 คู่มือด่วน — "ฉันอยากจะ…"

| ฉันอยากจะ… | ทำอย่างนี้ |
| --- | --- |
| เพิ่มร้านใหม่ | Connector → เพิ่ม Connector → บันทึก → เชื่อมต่อ OAuth |
| รู้ว่าทำไมออเดอร์ไม่เข้า | Connector → ดูว่ามีสถานะสีแดงไหม → เชื่อมต่อใหม่ |
| ค้นหาออเดอร์ | Order List → พิมพ์เลข Order → ค้นหา |
| แก้ออเดอร์ที่ไปไม่ถึงคลังสินค้า | Sync Log → หา ERROR → แก้สาเหตุ → Resync |
| พักการดึงออเดอร์ของร้านหนึ่ง | Connector → ปิดสวิตช์ |

## 4. การแก้ปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
| --- | --- |
| กดเชื่อมต่อ OAuth แล้วไม่มีอะไรเปิด | อนุญาต Pop-up ของเว็บนี้ แล้วกดใหม่ |
| ปุ่มเชื่อมต่อ OAuth เป็นสีเทากดไม่ได้ | App Master ที่เลือกไม่ครบ กดดินสอเพื่อเลือกหรือสร้างใหม่ให้ครบ หรือแจ้งผู้ดูแลระบบ |
| กลับมาหน้า Connector แต่ยังเป็นสีแดง | อาจอนุญาตผิดร้าน หรือ Redirect URL ไม่ตรงกับที่ตั้งไว้ใน Marketplace แจ้งผู้ดูแลระบบ |
| ตารางว่างหรือขึ้นว่าโหลดไม่สำเร็จ | ลองล็อกอินใหม่ หากยังเป็นอยู่ อาจไม่มีสิทธิ์หรือเซิร์ฟเวอร์ใช้งานไม่ได้ ติดต่อผู้ดูแลระบบ |
| Dashboard แสดง "—" | ข้อมูลยังโหลดไม่เสร็จหรือโหลดไม่สำเร็จ กดโหลดข้อมูลใหม่ / ลองอีกครั้ง |
| Resync ไม่สำเร็จ | อ่านข้อความสีแดง สาเหตุที่พบบ่อย: ร้านต้องเชื่อมต่อใหม่ หรือออเดอร์ไม่มีอยู่ที่ Marketplace แล้ว |
| ถูกให้ล็อกอินใหม่กะทันหัน | Session หมดอายุ ล็อกอินใหม่อีกครั้ง |

---

## 5. สำหรับผู้ดูแลระบบและนักพัฒนา

### 5.1 สถาปัตยกรรม

- React 19, React Router 7, Material UI 7 + MUI X Data Grid, Chart.js, Axios, SweetAlert2 ให้บริการใต้พาธ `/oms` (`REACT_APP_BASE_URL`)
- สิทธิ์แต่ละหน้าควบคุมด้วยสิทธิ์เมนู (`PermissionRoute`) กำหนดเมนูที่ Authentication → Assign Menu
- Route: `/dashboard/dashboard`, `/orderlist/orderlist`, `/orderlist/orderlist/:orderRecordId`, `/log/sync`, `/master/connector`
- การเข้าถึงข้อมูล:
  - Grid และ Dashboard ใช้ Gateway กลาง (`AxiosMaster`, `BSDataGrid`, `POST /dynamic/datagrid`) อ่าน schema `oms`: `t_oms_order`, `t_oms_sync_log`, `vw_oms_order_sync_history` ส่วนค่า combobox มาจาก `sec.t_com_combobox_item` (กลุ่ม `platform_shop`, `order_status`, `sync_status`)
  - Connector ใช้ Gateway: `GET /Connector`, `GET /Connector/apps`, `POST /Connector/save`, `POST /Connector/set-active`, `POST /Connector/{id}` (ลบ; ได้ HTTP 409 เมื่อยังถูกอ้างอิง)
  - เริ่ม OAuth เรียก OMS API ตรง: `GET {OMS_API_URL}/auth/{platform}/auth-url?platformAppShopId={id}` และ URL ที่ได้ต้องเป็น `https://`
  - Resync: `GET /oms-orders/{platform}/{orderId}/resync[?shopId=]`
- Secret ของ Marketplace ถูกส่งเพียงครั้งเดียวตอนสร้าง App Master และไม่ถูกส่งกลับมาที่เบราว์เซอร์ (มีเฉพาะแฟลก เช่น `hasAppKey`, `hasAppSecret`) Token เก็บอยู่ที่ OMS API

### 5.2 ติดตั้งและรัน

```bash
cd BS-Web/Frontend-Core
npm install
npm start          # โหมดพัฒนา ใช้ .env.development
npm run build      # build สำหรับ production (craco)
```

### 5.3 ตัวแปร Environment (ตอน build ใส่เฉพาะค่าสาธารณะ)

| ตัวแปร | ตัวอย่าง | ใช้ทำอะไร |
| --- | --- | --- |
| `REACT_APP_BASE_URL` | `/oms` | พาธที่ให้บริการ SPA |
| `REACT_APP_API_URL` | `https://<domain>/oms_gateway/v1/api` | Gateway สำหรับ Grid และ Connector |
| `REACT_APP_OMS_API_URL` | `/api` | Base ของ OMS API สำหรับเริ่ม OAuth |
| `REACT_APP_FRONTEND_BASE_URL` | `https://<domain>/oms` | URL สาธารณะของ SPA |
| `REACT_APP_OAUTH_CALLBACK_BASE_URL` | `https://<domain>/api/auth` | อ้างอิงสำหรับผู้ดูแล |
| `REACT_APP_WEBHOOK_BASE_URL` | `https://<domain>/api/webhooks` | อ้างอิงสำหรับผู้ดูแล |

ห้ามใส่ App Key, Secret หรือ Token ของ Marketplace ในตัวแปร `REACT_APP_*`

### 5.4 Proxy, OAuth Callback และ Webhook

ดู [OMS_MARKETPLACE_OAUTH_WEBHOOKS.md](OMS_MARKETPLACE_OAUTH_WEBHOOKS.md) โดยสรุป: ต้อง route `/api/auth/*` และ `/api/webhooks/*` ไปที่ OMS API **ก่อน** กฎ fallback ของ SPA และลงทะเบียน Callback URL ให้ตรงกัน (เหมือน Redirect URL ของ Connector) ในคอนโซลของแต่ละ Marketplace

### 5.5 เอกสารที่เกี่ยวข้อง

- [OMS_MARKETPLACE_OAUTH_WEBHOOKS.md](OMS_MARKETPLACE_OAUTH_WEBHOOKS.md) — Public route, proxy, ตั้งค่า OAuth และ Webhook
- [BSDataGrid.md](BSDataGrid.md) — คอมโพเนนต์ตารางที่ใช้ใน Order List และ Sync Log
- `BS-OMS-API/README.md` — เอกสารอ้างอิง API ฝั่ง Back-end
