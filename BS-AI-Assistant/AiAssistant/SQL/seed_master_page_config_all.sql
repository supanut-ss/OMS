SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

DECLARE @SystemPromptName NVARCHAR(100) = N'Master Data Main Page System Prompt';
DECLARE @Now DATETIME = GETDATE();

DECLARE @SystemPromptId INT = (
    SELECT TOP (1) system_prompt_id
    FROM ais.t_ai_system_prompt
    WHERE prompt_name = @SystemPromptName
      AND is_active = 1
    ORDER BY system_prompt_id
);

IF @SystemPromptId IS NULL
BEGIN
    THROW 51000, 'Master Data Main Page System Prompt was not found in ais.t_ai_system_prompt.', 1;
END

DECLARE @Configs TABLE (
    process NVARCHAR(200) NOT NULL,
    page_name NVARCHAR(200) NOT NULL,
    sub_system_prompt NVARCHAR(MAX) NULL,
    allowed_tables NVARCHAR(MAX) NOT NULL,
    allowed_columns NVARCHAR(MAX) NULL,
    sample_queries NVARCHAR(MAX) NULL
);

INSERT INTO @Configs (process, page_name, sub_system_prompt, allowed_tables, allowed_columns, sample_queries)
VALUES
(
    N'/master/warehouse',
    N'Warehouse - คลังสินค้า',
    N'ใช้สำหรับช่วยค้นหา ตรวจสอบ และอธิบายข้อมูลคลังสินค้า รวมถึงชื่อคลัง รายละเอียด ที่อยู่ user defined fields และสถานะการใช้งาน',
    N'inv.t_inv_warehouse',
    N'inv.t_inv_warehouse: warehouse_id, warehouse, warehouse_name, description, address_line1, address_line2, address_line3, user_def1, user_def2, user_def3, user_def4, user_def5, user_def6, user_def7, user_def8, user_def9, user_def10, is_active, create_by, create_date, update_by, update_date',
    N'SELECT warehouse, warehouse_name, description, address_line1, address_line2, address_line3, is_active FROM inv.t_inv_warehouse WHERE is_active = 1 ORDER BY warehouse;
SELECT warehouse, warehouse_name, create_date, update_date FROM inv.t_inv_warehouse ORDER BY update_date DESC;'
),
(
    N'/master/owner',
    N'Owner - เจ้าของ',
    N'ใช้สำหรับช่วยค้นหา ตรวจสอบ และอธิบายข้อมูลเจ้าของสินค้า เช่น owner code, owner name, ที่อยู่ และสถานะการใช้งาน',
    N'inv.t_inv_owner',
    N'inv.t_inv_owner: owner_id, owner_code, owner_name, description, address_line1, address_line2, address_line3, is_active, create_by, create_date, update_by, update_date',
    N'SELECT owner_code, owner_name, description, address_line1, address_line2, address_line3, is_active FROM inv.t_inv_owner WHERE is_active = 1 ORDER BY owner_code;
SELECT owner_code, owner_name, create_date, update_date FROM inv.t_inv_owner ORDER BY update_date DESC;'
),
(
    N'/master/zone',
    N'Zone - โซน',
    N'ใช้สำหรับช่วยค้นหา ตรวจสอบ และอธิบายข้อมูลโซน เช่น รหัสโซน ประเภทโซน และสถานะการใช้งาน',
    N'inv.t_inv_zone',
    N'inv.t_inv_zone: zone_id, zone, zone_type, is_active, create_by, create_date, update_by, update_date',
    N'SELECT zone, zone_type, is_active FROM inv.t_inv_zone WHERE is_active = 1 ORDER BY zone;
SELECT zone_type, COUNT(*) AS zone_count FROM inv.t_inv_zone WHERE is_active = 1 GROUP BY zone_type ORDER BY zone_type;'
),
(
    N'/master/location',
    N'Location - ตำแหน่งที่ตั้ง',
    N'ใช้สำหรับช่วยค้นหา ตรวจสอบ และอธิบายข้อมูลตำแหน่งที่ตั้ง เช่น location, ประเภทตำแหน่ง, ลำดับ putaway, ลำดับ pick และสถานะการใช้งาน',
    N'inv.t_inv_location',
    N'inv.t_inv_location: location_id, location, description, loc_type, putaway_sequence, pick_sequence, is_active, create_by, create_date, update_by, update_date',
    N'SELECT location, description, loc_type, putaway_sequence, pick_sequence, is_active FROM inv.t_inv_location WHERE is_active = 1 ORDER BY location;
SELECT loc_type, COUNT(*) AS location_count FROM inv.t_inv_location WHERE is_active = 1 GROUP BY loc_type ORDER BY loc_type;'
),
(
    N'/master/zoneLocation',
    N'Zone Location - ผูกโซนกับตำแหน่งที่ตั้ง',
    N'ใช้สำหรับช่วยตรวจสอบความสัมพันธ์ระหว่างโซนกับตำแหน่งที่ตั้ง และช่วยตอบว่าตำแหน่งใดอยู่ในโซนใด',
    N'inv.t_inv_zone_location, inv.t_inv_zone, inv.t_inv_location',
    N'inv.t_inv_zone_location: zone_location_id, zone_id, location_id, create_by, create_date
inv.t_inv_zone: zone_id, zone, zone_type, is_active, create_by, create_date, update_by, update_date
inv.t_inv_location: location_id, location, description, loc_type, putaway_sequence, pick_sequence, is_active, create_by, create_date, update_by, update_date',
    N'SELECT z.zone, z.zone_type, l.location, l.description, l.loc_type FROM inv.t_inv_zone_location zl INNER JOIN inv.t_inv_zone z ON z.zone_id = zl.zone_id INNER JOIN inv.t_inv_location l ON l.location_id = zl.location_id ORDER BY z.zone, l.location;
SELECT z.zone, COUNT(*) AS location_count FROM inv.t_inv_zone_location zl INNER JOIN inv.t_inv_zone z ON z.zone_id = zl.zone_id GROUP BY z.zone ORDER BY z.zone;'
),
(
    N'/master/itemCategory',
    N'Item Category - หมวดหมู่สินค้า',
    N'ใช้สำหรับช่วยค้นหา ตรวจสอบ และอธิบายข้อมูลหมวดหมู่สินค้า เช่น item category, description และสถานะการใช้งาน',
    N'inv.t_inv_category',
    N'inv.t_inv_category: category_id, item_category, description, is_active, create_by, create_date, update_by, update_date',
    N'SELECT item_category, description, is_active FROM inv.t_inv_category WHERE is_active = 1 ORDER BY item_category;
SELECT item_category, create_date, update_date FROM inv.t_inv_category ORDER BY update_date DESC;'
),
(
    N'/master/zoneCategory',
    N'Zone Category - ผูกโซนกับหมวดหมู่สินค้า',
    N'ใช้สำหรับช่วยตรวจสอบความสัมพันธ์ระหว่างโซนกับหมวดหมู่สินค้า และช่วยตอบว่าแต่ละหมวดหมู่ผูกกับโซนใด',
    N'inv.t_inv_zone_category, inv.t_inv_zone, inv.t_inv_category',
    N'inv.t_inv_zone_category: zone_category_id, zone_id, category_id, create_by, create_date
inv.t_inv_zone: zone_id, zone, zone_type, is_active, create_by, create_date, update_by, update_date
inv.t_inv_category: category_id, item_category, description, is_active, create_by, create_date, update_by, update_date',
    N'SELECT z.zone, z.zone_type, c.item_category, c.description FROM inv.t_inv_zone_category zc INNER JOIN inv.t_inv_zone z ON z.zone_id = zc.zone_id INNER JOIN inv.t_inv_category c ON c.category_id = zc.category_id ORDER BY z.zone, c.item_category;
SELECT c.item_category, COUNT(*) AS zone_count FROM inv.t_inv_zone_category zc INNER JOIN inv.t_inv_category c ON c.category_id = zc.category_id GROUP BY c.item_category ORDER BY c.item_category;'
),
(
    N'/master/businessPartner',
    N'Business Partner - หุ้นส่วนทางธุรกิจ',
    N'ใช้สำหรับช่วยค้นหา ตรวจสอบ และอธิบายข้อมูลหุ้นส่วนทางธุรกิจ เช่น owner, business code, business name, business type, contact, email, ที่อยู่ และ user defined fields',
    N'inv.t_inv_business_partner, inv.t_inv_owner',
    N'inv.t_inv_business_partner: business_partner_id, owner_id, owner_code, business_code, business_name, business_type, description, address_line1, address_line2, address_line3, contact, email, user_def1, user_def2, user_def3, user_def4, user_def5, user_def6, user_def7, user_def8, user_def9, user_def10, is_active, create_by, create_date, update_by, update_date
inv.t_inv_owner: owner_id, owner_code, owner_name, description, address_line1, address_line2, address_line3, is_active, create_by, create_date, update_by, update_date',
    N'SELECT bp.owner_code, o.owner_name, bp.business_code, bp.business_name, bp.business_type, bp.contact, bp.email, bp.is_active FROM inv.t_inv_business_partner bp LEFT JOIN inv.t_inv_owner o ON o.owner_id = bp.owner_id WHERE bp.is_active = 1 ORDER BY bp.business_code;
SELECT business_type, COUNT(*) AS partner_count FROM inv.t_inv_business_partner WHERE is_active = 1 GROUP BY business_type ORDER BY business_type;'
),
(
    N'/master/item',
    N'Item Master - ข้อมูลสินค้า',
    N'ใช้สำหรับช่วยค้นหา ตรวจสอบ และอธิบายข้อมูลสินค้า เช่น item number, description, category, inventory type, lot/expiry/SN control, min/max quantity, user defined fields และหน่วยนับสินค้า',
    N'inv.t_inv_item, inv.t_inv_item_uom, inv.t_inv_category',
    N'inv.t_inv_item: item_master_id, item_number, description, category_id, item_category, inventory_type, lot_control, expiry_date_control, sn_control, min_qty, max_qty, user_def1, user_def2, user_def3, user_def4, user_def5, user_def6, user_def7, user_def8, user_def9, user_def10, is_active, create_by, create_date, update_by, update_date
inv.t_inv_item_uom: item_uom_id, item_master_id, item_number, uom, primary_uom, conversion_factor, sequence, picking_class, is_active, create_by, create_date, update_by, update_date
inv.t_inv_category: category_id, item_category, description, is_active, create_by, create_date, update_by, update_date',
    N'SELECT i.item_number, i.description, i.item_category, i.inventory_type, i.lot_control, i.expiry_date_control, i.sn_control, i.min_qty, i.max_qty, i.is_active FROM inv.t_inv_item i WHERE i.is_active = 1 ORDER BY i.item_number;
SELECT i.item_number, i.description, u.uom, u.primary_uom, u.conversion_factor, u.picking_class FROM inv.t_inv_item i LEFT JOIN inv.t_inv_item_uom u ON u.item_master_id = i.item_master_id WHERE i.item_number = @item_number ORDER BY u.sequence;'
);

MERGE ais.t_ai_page_config AS target
USING @Configs AS source
    ON target.process = source.process
WHEN MATCHED THEN
    UPDATE SET
        target.page_name = source.page_name,
        target.system_prompt_id = @SystemPromptId,
        target.sub_system_prompt = source.sub_system_prompt,
        target.allowed_tables = source.allowed_tables,
        target.allowed_columns = source.allowed_columns,
        target.sample_queries = source.sample_queries,
        target.is_active = 1,
        target.update_by = N'system',
        target.update_date = @Now
WHEN NOT MATCHED THEN
    INSERT (
        process,
        page_name,
        system_prompt_id,
        sub_system_prompt,
        allowed_tables,
        allowed_columns,
        sample_queries,
        is_active,
        create_by,
        create_date
    )
    VALUES (
        source.process,
        source.page_name,
        @SystemPromptId,
        source.sub_system_prompt,
        source.allowed_tables,
        source.allowed_columns,
        source.sample_queries,
        1,
        N'system',
        @Now
    );

SELECT
    pc.process,
    pc.page_name,
    pc.allowed_tables,
    pc.is_active
FROM ais.t_ai_page_config pc
WHERE pc.process LIKE N'/master/%'
ORDER BY pc.process;
