# Web OMS — User Handoff
# Web OMS — เอกสารส่งมอบสำหรับผู้ใช้งาน

> **Language / ภาษา:** [English](#english) · [ภาษาไทย](#ภาษาไทย)
>
> A short starter sheet for everyday users. Full details: [OMS_WEB_GUIDE.md](OMS_WEB_GUIDE.md). /
> เอกสารสั้นสำหรับเริ่มใช้งาน รายละเอียดทั้งหมดดูที่ [OMS_WEB_GUIDE.md](OMS_WEB_GUIDE.md)

---

# English

## What you receive

| Item | Value |
| --- | --- |
| System address | `https://<domain>/oms` *(fill in before handing over)* |
| User name | *(given separately by the administrator)* |
| Language | Thai / English — button at the top of the screen |
| Support contact | *(name / phone / email — fill in)* |

> Passwords are never written in this document. Change your password after first sign-in if the system asks you to.

## What the system does

It collects orders from Shopee, Lazada and TikTok Shop, passes them to the warehouse system, and shows you whether each order succeeded or failed.

## Your daily routine (5 minutes)

1. **Sign in** at the system address.
2. Open **Dashboard**. Look at the **Sync errors** tile.
   - **0** → nothing to do.
   - **More than 0** → go to step 3.
3. Open **Log → Sync**. Find rows with **Status = ERROR** and read *Error Details*.
4. If the cause is fixed, click **Resync** on that row. Green message = done.
5. If it fails again, or you do not understand the message, send the **order number** and the **error text** to support.

## Weekly check

- Open **Master → Connector**. Every shop should be green **Connected**.
- A red shop **Needs re-authorisation**: click **Reconnect**, log in on the marketplace page and approve. If nothing opens, allow pop-ups for the site.

## Five things you will do most

| I want to… | Go to | Do this |
| --- | --- | --- |
| Find an order | Order List | Type part of the order number → Search → click it |
| See why an order failed | Order Detail → *Sync History* tab | Read the highlighted step |
| Retry a failed order | Log → Sync | Click **Resync** on the ERROR row |
| Reconnect a shop | Master → Connector | Click **Reconnect** → approve on marketplace |
| Pause a shop | Master → Connector | Switch it off (does not delete) |

## Please do not

- Do **not** delete a shop (bin icon) to "fix" a problem — switch it off or reconnect instead. Deleting loses its setup.
- Do **not** share your password or the marketplace login.
- Do **not** change App Master / App Key / Secret / Redirect URL unless the administrator tells you to.

## When to call support

- A shop stays red after reconnecting.
- Resync fails more than once for the same order.
- A screen is empty or says it cannot load after you signed in again.
- You cannot see a screen you need (access is missing).

Include: screen name, order number, time, and a screenshot of the message.

## Quick glossary

| Word | Meaning |
| --- | --- |
| Sync | Copying orders from the marketplace into the system |
| Synced / Success | Done correctly |
| Pending | Waiting to be processed |
| Error | Failed — needs attention |
| Connector | One online shop linked to the system |
| Reconnect / OAuth | Re-approving access on the marketplace's own page |
| Resync | Fetch one failed order again |

## Handover checklist *(for the person handing over)*

- [ ] System address and user account given to the user
- [ ] User can sign in and sees Dashboard, Order List, Sync Log, Connector
- [ ] All shops show **Connected** on the Connector screen
- [ ] User practised: find an order, open its detail, **Resync** an error row
- [ ] Support contact filled in above
- [ ] User knows the "Please do not" list

---

# ภาษาไทย

## สิ่งที่คุณได้รับ

| รายการ | ข้อมูล |
| --- | --- |
| ที่อยู่ระบบ | `https://<domain>/oms` *(กรอกก่อนส่งมอบ)* |
| ชื่อผู้ใช้ | *(ผู้ดูแลระบบแจ้งแยกต่างหาก)* |
| ภาษา | ไทย / อังกฤษ — ปุ่มอยู่ด้านบนของหน้าจอ |
| ช่องทางติดต่อซัพพอร์ต | *(ชื่อ / เบอร์โทร / อีเมล — กรอก)* |

> เอกสารนี้ไม่ระบุรหัสผ่าน หากระบบให้เปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก ให้เปลี่ยนทันที

## ระบบนี้ทำอะไร

รวบรวมออเดอร์จาก Shopee, Lazada และ TikTok Shop ส่งต่อไปยังระบบคลังสินค้า และแสดงให้เห็นว่าแต่ละออเดอร์สำเร็จหรือผิดพลาด

## งานประจำวัน (ประมาณ 5 นาที)

1. **เข้าสู่ระบบ** ที่ที่อยู่ระบบ
2. เปิด **Dashboard** ดูการ์ด **Sync ผิดพลาด**
   - **0** → ไม่ต้องทำอะไร
   - **มากกว่า 0** → ไปข้อ 3
3. เปิด **Log → Sync** หาแถวที่ **สถานะ = ERROR** แล้วอ่าน *รายละเอียด Error*
4. หากแก้สาเหตุแล้ว กด **Resync** ที่แถวนั้น ข้อความสีเขียว = สำเร็จ
5. หากยังผิดพลาดซ้ำ หรืออ่านข้อความแล้วไม่เข้าใจ ส่ง **เลข Order** และ **ข้อความ Error** ให้ซัพพอร์ต

## ตรวจประจำสัปดาห์

- เปิด **Master → Connector** ทุกร้านควรเป็นสีเขียว **เชื่อมต่อแล้ว**
- ร้านสีแดง **ต้องยืนยันตัวตนใหม่**: กด **เชื่อมต่อใหม่** ล็อกอินในหน้าของ Marketplace แล้วกดอนุญาต หากไม่มีอะไรเปิดขึ้น ให้อนุญาต Pop-up ของเว็บนี้

## 5 งานที่ทำบ่อยที่สุด

| ฉันอยากจะ… | ไปที่ | ทำอย่างนี้ |
| --- | --- | --- |
| ค้นหาออเดอร์ | Order List | พิมพ์บางส่วนของเลข Order → ค้นหา → คลิกรายการ |
| ดูว่าทำไมออเดอร์ผิดพลาด | Order Detail → แท็บ *ประวัติการ Sync* | อ่านขั้นที่ถูกเน้นสี |
| ทำออเดอร์ที่ผิดพลาดใหม่ | Log → Sync | กด **Resync** ที่แถว ERROR |
| เชื่อมต่อร้านใหม่อีกครั้ง | Master → Connector | กด **เชื่อมต่อใหม่** → อนุญาตที่ Marketplace |
| พักการใช้งานร้าน | Master → Connector | ปิดสวิตช์ (ไม่ลบข้อมูล) |

## ข้อควรระวัง

- **อย่า** ลบร้าน (ไอคอนถังขยะ) เพื่อแก้ปัญหา ให้ปิดสวิตช์หรือเชื่อมต่อใหม่แทน การลบจะทำให้การตั้งค่าหาย
- **อย่า** แชร์รหัสผ่านของระบบหรือบัญชี Marketplace
- **อย่า** แก้ App Master / App Key / Secret / Redirect URL เว้นแต่ผู้ดูแลระบบสั่ง

## เมื่อไรควรติดต่อซัพพอร์ต

- ร้านยังเป็นสีแดงหลังเชื่อมต่อใหม่
- ออเดอร์เดียวกัน Resync ไม่สำเร็จมากกว่า 1 ครั้ง
- หน้าจอว่างหรือโหลดไม่ได้ แม้ล็อกอินใหม่แล้ว
- มองไม่เห็นหน้าจอที่ต้องใช้ (ยังไม่มีสิทธิ์)

แจ้งข้อมูลต่อไปนี้: ชื่อหน้าจอ, เลข Order, เวลา และภาพหน้าจอข้อความที่เจอ

## คำศัพท์สั้นๆ

| คำ | ความหมาย |
| --- | --- |
| Sync | การคัดลอกออเดอร์จาก Marketplace เข้าระบบ |
| Synced / Success | สำเร็จเรียบร้อย |
| Pending | รอดำเนินการ |
| Error | ผิดพลาด ต้องตรวจสอบ |
| Connector | ร้านค้าออนไลน์หนึ่งร้านที่เชื่อมกับระบบ |
| เชื่อมต่อใหม่ / OAuth | การอนุญาตเข้าถึงอีกครั้งในหน้าของ Marketplace เอง |
| Resync | ดึงออเดอร์ที่ผิดพลาดรายการนั้นมาใหม่ |

## เช็กลิสต์ส่งมอบ *(สำหรับผู้ส่งมอบ)*

- [ ] ให้ที่อยู่ระบบและบัญชีผู้ใช้แก่ผู้ใช้แล้ว
- [ ] ผู้ใช้ล็อกอินได้ และเห็นเมนู Dashboard, Order List, Sync Log, Connector
- [ ] ทุกร้านในหน้า Connector แสดง **เชื่อมต่อแล้ว**
- [ ] ผู้ใช้ลองทำเองแล้ว: ค้นหาออเดอร์ เปิดรายละเอียด และ **Resync** แถว Error
- [ ] กรอกช่องทางติดต่อซัพพอร์ตด้านบนแล้ว
- [ ] ผู้ใช้รับทราบหัวข้อ "ข้อควรระวัง"
