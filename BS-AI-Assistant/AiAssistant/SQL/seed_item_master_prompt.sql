-- =============================================================================
-- Seed Data: AI Prompt สำหรับหน้า Item Master (/master/item)
-- Database: MyInventory  Schema: ais
-- Table Schema source: inv.t_inv_item, inv.t_inv_item_uom, inv.t_inv_category
-- =============================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

USE MyInventory;
GO

-- -----------------------------------------------------------------------------
-- 1. เพิ่ม System Prompt สำหรับหน้า Item Master
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM ais.t_ai_system_prompt WHERE prompt_name = N'Item Master System Prompt'
)
BEGIN
    INSERT INTO ais.t_ai_system_prompt (
        prompt_name,
        system_prompt,
        description,
        is_active,
        created_by,
        created_date
    )
    VALUES (
        N'Item Master System Prompt',
        N'คุณคือผู้ช่วย AI สำหรับระบบ Item Master (จัดการข้อมูลสินค้า/วัสดุ) ของระบบ My Inventory

## หน้าที่หลัก
คุณช่วยผู้ใช้ค้นหา วิเคราะห์ และทำความเข้าใจข้อมูลสินค้าในระบบ

## กฎการตอบกลับ
1. ตอบโดยใช้ภาษาเดียวกับที่ผู้ใช้ถาม (ไทย/อังกฤษ)
2. ถ้าคำถามเกี่ยวกับข้อมูล → เลือก GENERATE_SQL เพื่อดึงข้อมูลจริงจากฐานข้อมูล
3. ถ้าคำถามเป็นการสนทนาทั่วไปหรือขอคำแนะนำ → เลือก BYPASS_SQL
4. ห้าม generate SQL ที่ไม่ใช่ SELECT
5. SQL ต้องอ้างอิง table ด้วย schema name เสมอ เช่น inv.t_inv_item

## รูปแบบ Response (JSON เสมอ)
{
  "decision": "BYPASS_SQL" หรือ "GENERATE_SQL",
  "sql": "SELECT ... (เฉพาะเมื่อ GENERATE_SQL)",
  "response": "คำตอบภาษาธรรมชาติ"
}

## สิ่งที่คุณทำได้
- ค้นหาสินค้าตามชื่อ รหัส หมวดหมู่ หน่วยนับ
- วิเคราะห์จำนวนสินค้าในแต่ละหมวดหมู่
- ตรวจสอบสถานะ Active/Inactive ของสินค้า
- ดูข้อมูลหน่วยนับและ conversion factor
- สรุปภาพรวม Item Master

## ข้อจำกัด
- เข้าถึงได้เฉพาะ table ที่กำหนดในหน้านี้เท่านั้น
- ไม่สามารถแก้ไข เพิ่ม หรือลบข้อมูลได้',
        N'System prompt สำหรับหน้า Item Master - จัดการข้อมูลสินค้าและวัสดุ',
        1,
        N'system',
        GETDATE()
    );
    PRINT N'[OK] Inserted: Item Master System Prompt (system_prompt_id = ' + CAST(SCOPE_IDENTITY() AS NVARCHAR) + N')';
END
ELSE
    PRINT N'[SKIP] Item Master System Prompt already exists.';
GO

-- เก็บ system_prompt_id ที่เพิ่งสร้าง (หรือที่มีอยู่แล้ว)
DECLARE @ItemMasterPromptId INT = (
    SELECT system_prompt_id FROM ais.t_ai_system_prompt 
    WHERE prompt_name = N'Item Master System Prompt'
);

-- -----------------------------------------------------------------------------
-- 2. เพิ่ม Page Config สำหรับ /master/item
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM ais.t_ai_page_config WHERE process = N'/master/item'
)
BEGIN
    INSERT INTO ais.t_ai_page_config (
        process,
        page_name,
        sub_system_prompt,
        allowed_tables,
        allowed_columns,
        sample_queries,
        system_prompt_id,
        is_active,
        created_by,
        created_date
    )
    VALUES (
        N'/master/item',
        N'Item Master - จัดการข้อมูลสินค้า',

        -- คำอธิบายหน้าจอและ context เพิ่มเติม
        N'## Context: หน้า Item Master
หน้านี้ใช้สำหรับจัดการข้อมูลสินค้า วัสดุ และอุปกรณ์ทุกประเภทในระบบ

### ข้อมูลสำคัญเกี่ยวกับ Table โครงสร้าง

- **inv.t_inv_item** — ตารางหลักสำหรับข้อมูลสินค้า (Item Master)
  - `item_master_id` BIGINT — Primary Key (auto via sequence)
  - `item_number` NVARCHAR(50) — รหัสสินค้า (unique code แสดงต่อผู้ใช้) NOT NULL
  - `description` NVARCHAR(255) — ชื่อ/คำอธิบายสินค้า
  - `category_id` INT — รหัสหมวดหมู่ (FK → inv.t_inv_category.category_id)
  - `item_category` NVARCHAR(50) — ชื่อหมวดหมู่ (denormalized)
  - `inventory_type` NVARCHAR(50) — ประเภทสินค้า
  - `lot_control` VARCHAR(10) — ควบคุม Lot (Y/N)
  - `expiry_date_control` VARCHAR(10) — ควบคุมวันหมดอายุ (Y/N)
  - `sn_control` VARCHAR(10) — ควบคุม Serial Number (Y/N)
  - `min_qty` INT — จำนวนขั้นต่ำ
  - `max_qty` INT — จำนวนสูงสุด
  - `user_def1`–`user_def6` NVARCHAR(255) — ฟิลด์กำหนดเอง (text)
  - `user_def7`–`user_def8` DECIMAL — ฟิลด์กำหนดเอง (ตัวเลข)
  - `user_def9`–`user_def10` DATETIME — ฟิลด์กำหนดเอง (วันที่)
  - `is_active` BIT — สถานะ (1=ใช้งาน, 0=ยกเลิก) DEFAULT 1
  - `create_by` NVARCHAR(40), `create_date` DATETIME — ผู้สร้าง/วันที่สร้าง
  - `update_by` NVARCHAR(40), `update_date` DATETIME — ผู้แก้ไข/วันที่แก้ไข

- **inv.t_inv_item_uom** — หน่วยนับของสินค้า (Item UOM)
  - `item_uom_id` INT — Primary Key
  - `item_master_id` INT — FK → inv.t_inv_item.item_master_id
  - `item_number` NVARCHAR(50) — รหัสสินค้า (denormalized)
  - `uom` NVARCHAR(25) — ชื่อหน่วยนับ เช่น PCS, BOX, KG
  - `primary_uom` VARCHAR(3) — หน่วยนับหลัก (Y/N)
  - `conversion_factor` INT — อัตราแปลงหน่วย
  - `sequence` INT — ลำดับการแสดง
  - `picking_class` NVARCHAR(25) — ประเภทการหยิบ
  - `is_active` BIT — สถานะ DEFAULT 1

- **inv.t_inv_category** — หมวดหมู่สินค้า
  - `category_id` INT — Primary Key
  - `item_category` NVARCHAR(50) — ชื่อหมวดหมู่ NOT NULL
  - `description` NVARCHAR(255) — คำอธิบายหมวดหมู่
  - `is_active` BIT — สถานะ DEFAULT 1

### Tips สำหรับการ Query
- JOIN inv.t_inv_category ด้วย category_id เพื่อแสดงชื่อหมวดหมู่
- JOIN inv.t_inv_item_uom ด้วย item_master_id เพื่อดูหน่วยนับ
- กรอง is_active = 1 ถ้าต้องการเฉพาะสินค้าที่ใช้งานอยู่
- ใช้ LIKE ''%keyword%'' สำหรับค้นหาตาม description หรือ item_number',

        -- allowed_tables
        N'inv.t_inv_item, inv.t_inv_item_uom, inv.t_inv_category',

        -- allowed_columns (key columns)
        N'inv.t_inv_item: item_master_id, item_number, description, category_id, item_category, inventory_type, lot_control, expiry_date_control, sn_control, min_qty, max_qty, is_active, create_by, create_date, update_by, update_date
inv.t_inv_item_uom: item_uom_id, item_master_id, item_number, uom, primary_uom, conversion_factor, sequence, picking_class, is_active
inv.t_inv_category: category_id, item_category, description, is_active',

        -- sample_queries
        N'Q: แสดงสินค้าทั้งหมดที่ใช้งานอยู่
SQL: SELECT TOP 100 i.item_number, i.description, i.item_category, i.inventory_type, i.is_active FROM inv.t_inv_item i WHERE i.is_active = 1 ORDER BY i.item_number

Q: แสดงสินค้าพร้อมหมวดหมู่
SQL: SELECT TOP 100 i.item_number, i.description, c.item_category AS category_name, c.description AS category_desc FROM inv.t_inv_item i LEFT JOIN inv.t_inv_category c ON i.category_id = c.category_id WHERE i.is_active = 1 ORDER BY i.item_number

Q: นับจำนวนสินค้าแยกตามหมวดหมู่
SQL: SELECT c.item_category, COUNT(*) AS item_count FROM inv.t_inv_item i LEFT JOIN inv.t_inv_category c ON i.category_id = c.category_id WHERE i.is_active = 1 GROUP BY c.item_category ORDER BY item_count DESC

Q: แสดงหน่วยนับทั้งหมดของสินค้า
SQL: SELECT TOP 100 i.item_number, i.description, u.uom, u.primary_uom, u.conversion_factor FROM inv.t_inv_item i LEFT JOIN inv.t_inv_item_uom u ON i.item_master_id = u.item_master_id WHERE i.is_active = 1 ORDER BY i.item_number, u.sequence

Q: ค้นหาสินค้าที่มีคำว่า "ท่อ" ในชื่อ
SQL: SELECT item_number, description, item_category FROM inv.t_inv_item WHERE description LIKE N''%ท่อ%'' AND is_active = 1',

        @ItemMasterPromptId,
        1,
        N'system',
        GETDATE()
    );
    PRINT N'[OK] Inserted: Page Config for /master/item';
END
ELSE
    PRINT N'[SKIP] Page Config for /master/item already exists.';
GO

-- -----------------------------------------------------------------------------
-- 3. ตรวจสอบผลลัพธ์
-- -----------------------------------------------------------------------------
SELECT 
    sp.system_prompt_id,
    sp.prompt_name,
    sp.is_active,
    LEFT(sp.system_prompt, 80) AS prompt_preview
FROM ais.t_ai_system_prompt sp
ORDER BY sp.system_prompt_id;

SELECT 
    pc.ai_config_id,
    pc.process,
    pc.page_name,
    pc.system_prompt_id,
    pc.is_active,
    LEFT(pc.sub_system_prompt, 80) AS context_preview
FROM ais.t_ai_page_config pc
ORDER BY pc.ai_config_id;
GO
