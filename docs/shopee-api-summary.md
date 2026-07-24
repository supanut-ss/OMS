# สรุปข้อมูลที่ดึงจาก Shopee API (OMS Integration)

เอกสารนี้สรุปฟิลด์ข้อมูลสำคัญ 5 รายการที่ดึงจาก Shopee Open Platform API V2 เพื่อนำมาใช้งานในระบบ OMS

## รายการข้อมูลและการ Map สู่ระบบ OMS

| #   | ข้อมูลที่ต้องการ             | ฟิลด์ใน Shopee API                                        | ฟิลด์ที่เก็บในระบบ OMS (`UnifiedOrder`)          | รายละเอียดเพิ่มเติม                                                                                                                           |
| --- | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Status การขนส่งของ order** | `order_status`                                            | `Status` / `OriginalStatus`                      | แปลงผ่าน `OrderStatusMapper.FromShopee()` เป็น Enum `OrderStatus` เช่น `ReadyToShip`, `Shipped`, `Completed`                                  |
| 2   | **Flag ภาษี**                | `invoice_data`                                            | `TaxInvoiceRequested` / `TaxInvoice`             | หากลูกค้าขอใบกำกับภาษีมา ค่า `TaxInvoiceRequested` จะเป็น `true` และเก็บรายละเอียดไว้ใน `TaxInvoice` (เช่น เลขผู้เสียภาษี ชื่อบริษัท ที่อยู่) |
| 3   | **Ship_by_date**             | `ship_by_date`                                            | `CancellationDeadline` / `DaysUntilCancellation` | `ship_by_date` (Unix Timestamp) แปลงเป็นเวลา UTC ใน `CancellationDeadline` และคำนวณวันนับถอยหลังก่อนถูกยกเลิกใน `DaysUntilCancellation`       |
| 4   | **Ship to**                  | `recipient_address`                                       | `Shipping.RecipientAddress`                      | ที่อยู่จัดส่งของผู้รับ (ชื่อ, เบอร์โทรศัพท์, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์, ประเทศ, ที่อยู่แบบเต็มบรรทัดเดียว)                           |
| 5   | **Tracking No**              | `tracking_no` (ใน `shipping_carrier` หรือ `package_list`) | `Shipping.TrackingNumber`                        | เลข Tracking Number สำหรับการจัดส่งออเดอร์                                                                                                    |

---

## เส้นทาง API (Endpoints) ที่เรียกใช้

ใน [ShopeeClient.cs](file:///d:/Git/OMS/BS-OMS-API/OmsApi/Services/Implementation/Platforms/ShopeeClient.cs) มีการเรียกใช้ Shopee API Endpoints ทั้งหมด 3 เส้นสำหรับดึงข้อมูลออเดอร์ดังนี้:

### 1. `/api/v2/order/get_order_list` (HTTP GET)

- **วัตถุประสงค์:** ดึงรายการเลขที่ออเดอร์ (`order_sn`) ทั้งหมดตามตัวกรอง (เช่น ช่วงเวลาหรือสถานะ)
- **ข้อมูลที่ได้:** `order_sn`, `order_status`, `create_time`

### 2. `/api/v2/order/get_order_detail` (HTTP GET)

- **วัตถุประสงค์:** ดึงรายละเอียดออเดอร์เชิงลึกเป็นรายรายการ (โดยส่ง `order_sn_list`)
- **ข้อมูลที่ได้ (ส่งผ่าน `response_optional_fields`):**
  - `order_status` (สถานะออเดอร์)
  - `invoice_data` (ข้อมูลใบกำกับภาษี)
  - `ship_by_date` (วันหมดเขตจัดส่ง)
  - `recipient_address` (ที่อยู่จัดส่ง)
  - `shipping_carrier` / `package_list` (ข้อมูลผู้ให้บริการจัดส่งและเลขพัสดุ)
  - `item_list` (รายการสินค้าในออเดอร์)

### 3. `/api/v2/logistics/get_tracking_number` (HTTP GET)

- **วัตถุประสงค์:** ใช้สำหรับดึงเลข Tracking Number ของออเดอร์เฉพาะเจาะจง (ส่งเลข `order_sn`) เพื่อความถูกต้องและแม่นยำสูงสูด

---

## ไฟล์โค้ดที่เกี่ยวข้อง

- **API Client:** [ShopeeClient.cs](file:///d:/Git/OMS/BS-OMS-API/OmsApi/Services/Implementation/Platforms/ShopeeClient.cs)
- **Unified Model:** [UnifiedOrder.cs](file:///d:/Git/OMS/BS-OMS-API/OmsApi/Models/Orders/UnifiedOrder.cs)
- **Status Mapper:** [OrderStatus.cs](file:///d:/Git/OMS/BS-OMS-API/OmsApi/Models/Orders/OrderStatus.cs) (คลาส `OrderStatusMapper`)

1. เส้นทางดึงรายการออเดอร์ (Get Order List)
   Endpoint: /api/v2/order/get_order_list (HTTP GET)
   หน้าที่: ดึงรายการเลขที่ออเดอร์ (order_sn) ทั้งหมดตามตัวกรอง เช่น ช่วงเวลา หรือสถานะออเดอร์
   ข้อมูลที่ได้: สถานะเบื้องต้น (order_status) และเวลาสร้างออเดอร์ (create_time) เพื่อนำไปดึงรายละเอียดต่อ
2. เส้นทางดึงรายละเอียดออเดอร์ (Get Order Detail)
   Endpoint: /api/v2/order/get_order_detail (HTTP GET)
   หน้าที่: ดึงข้อมูลรายละเอียดเชิงลึกของออเดอร์แบบรายตัว (ยิงโดยส่ง order_sn_list)
   ข้อมูลที่ได้สำหรับ 5 รายการ:
   Status: ดึงฟิลด์ order_status
   Flag ภาษี: ดึงฟิลด์ invoice_data (จะถูกเซ็ตเป็น TaxInvoiceRequested = true หากมีข้อมูลในฟิลด์นี้ส่งมา)
   Ship_by_date: ดึงฟิลด์ ship_by_date เพื่อนำมานับถอยหลังวันโดนยกเลิก
   Ship to: ดึงฟิลด์ recipient_address (เก็บที่อยู่ผู้รับทั้งหมด เช่น ชื่อ, เบอร์โทร, ตำบล, อำเภอ, จังหวัด)
   Tracking No: ดึงฟิลด์ tracking_no ภายใต้กิ่ง shipping_carrier หรือ package_list
3. เส้นทางดึงเลข Tracking โดยตรง (Get Tracking Number)
   Endpoint: /api/v2/logistics/get_tracking_number (HTTP GET)
   หน้าที่: ใช้สำหรับดึงเลข Tracking Number ของออเดอร์นั้นโดยเฉพาะ (ส่งค่า order_sn) เพื่อความแม่นยำในกรณีที่ออเดอร์ถูกจัดเตรียมพร้อมส่งแล้วและต้องการเลขแทร็กแยกต่างหาก
