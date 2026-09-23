-- Migration: Seed report filter mapping from sample Jasper JSON files.
-- Source samples:
--   InboundReceipt.json
--   InventorySummaryItem.json
--   InboundOrderReceiveSummary.json
--   OutboundPickingSlip.json
--   OutboundDeliveryNote.json

IF OBJECT_ID('rpt.t_com_config_report_filter', 'U') IS NULL
BEGIN
    THROW 51000, 'Table rpt.t_com_config_report_filter does not exist. Run V202505260002__add_report_filter_mapping.sql first.', 1;
END;

DECLARE @Filters TABLE
(
    report_code NVARCHAR(100) NOT NULL,
    parameter_name NVARCHAR(100) NOT NULL,
    label NVARCHAR(200) NOT NULL,
    input_type NVARCHAR(30) NOT NULL,
    data_type NVARCHAR(30) NOT NULL,
    sql_field_name NVARCHAR(200) NULL,
    operator NVARCHAR(20) NULL,
    default_value NVARCHAR(500) NULL,
    placeholder NVARCHAR(200) NULL,
    option_source_type NVARCHAR(30) NULL,
    option_json NVARCHAR(MAX) NULL,
    option_sql NVARCHAR(MAX) NULL,
    is_required NVARCHAR(10) NOT NULL,
    sort_order INT NOT NULL,
    is_active NVARCHAR(10) NOT NULL
);

UPDATE rpt.t_com_config_report_filter
SET report_code = CASE report_code
    WHEN N'InboundOrderReceiveSummary' THEN N'InboundReceiptSummary'
    WHEN N'OutboundPickingSlip' THEN N'PickingSlip'
    WHEN N'OutboundDeliveryNote' THEN N'DeliveryNote'
    ELSE report_code
END,
update_date = SYSUTCDATETIME()
WHERE report_code IN (N'InboundOrderReceiveSummary', N'OutboundPickingSlip', N'OutboundDeliveryNote');

INSERT INTO @Filters
(
    report_code,
    parameter_name,
    label,
    input_type,
    data_type,
    sql_field_name,
    operator,
    default_value,
    placeholder,
    option_source_type,
    option_json,
    option_sql,
    is_required,
    sort_order,
    is_active
)
VALUES
    -- InboundReceipt.json -> header/details/footer sample fields.
    (N'InboundReceipt', N'inbound_order', N'Inbound Order', N'text', N'string', N'inbound_order_number', N'=', NULL, N'Inbound order no.', NULL, NULL, NULL, N'YES', 10, N'YES'),
    (N'InboundReceipt', N'order_type', N'Order Type', N'text', N'string', N'order_type', N'=', NULL, N'Order type', NULL, NULL, NULL, N'NO', 20, N'YES'),
    (N'InboundReceipt', N'order_status', N'Order Status', N'text', N'string', N'order_status', N'=', NULL, N'Order status', NULL, NULL, NULL, N'NO', 30, N'YES'),
    (N'InboundReceipt', N'warehouse', N'Warehouse', N'text', N'string', N'warehouse', N'=', NULL, N'Warehouse', NULL, NULL, NULL, N'NO', 40, N'YES'),
    (N'InboundReceipt', N'receive_date', N'Receive Date', N'date', N'date', N'receive_date', N'=', NULL, NULL, NULL, NULL, NULL, N'NO', 50, N'YES'),

    -- InboundOrderReceiveSummary.json -> rpt.t_com_config_report.report_code = InboundReceiptSummary.
    (N'InboundReceiptSummary', N'inbound_order', N'Inbound Order', N'text', N'string', N'inbound_order_number', N'=', NULL, N'Inbound order no.', NULL, NULL, NULL, N'YES', 10, N'YES'),
    (N'InboundReceiptSummary', N'order_type', N'Order Type', N'text', N'string', N'order_type', N'=', NULL, N'Order type', NULL, NULL, NULL, N'NO', 20, N'YES'),
    (N'InboundReceiptSummary', N'order_status', N'Order Status', N'text', N'string', N'order_status', N'=', NULL, N'Order status', NULL, NULL, NULL, N'NO', 30, N'YES'),
    (N'InboundReceiptSummary', N'receive_date', N'Order Date', N'date', N'date', N'order_date', N'=', NULL, NULL, NULL, NULL, NULL, N'NO', 40, N'YES'),
    (N'InboundReceiptSummary', N'warehouse', N'Warehouse', N'text', N'string', N'warehouse', N'=', NULL, N'Warehouse', NULL, NULL, NULL, N'NO', 50, N'YES'),
    (N'InboundReceiptSummary', N'customer', N'Customer', N'text', N'string', N'customer_name', N'LIKE', NULL, N'Customer', NULL, NULL, NULL, N'NO', 60, N'YES'),

    -- InventorySummaryItem.json -> detail-level sample fields.
    (N'InventorySummaryItem', N'warehouse', N'Warehouse', N'text', N'string', N'warehouse', N'=', NULL, N'Warehouse', NULL, NULL, NULL, N'NO', 10, N'YES'),
    (N'InventorySummaryItem', N'item_category', N'Item Category', N'text', N'string', N'item_category', N'=', NULL, N'Item category', NULL, NULL, NULL, N'NO', 20, N'YES'),
    (N'InventorySummaryItem', N'item_number', N'Item Number', N'text', N'string', N'item_number', N'LIKE', NULL, N'Item number', NULL, NULL, NULL, N'NO', 30, N'YES'),
    (N'InventorySummaryItem', N'status', N'Status', N'text', N'string', N'inv_status', N'=', NULL, N'Status', NULL, NULL, NULL, N'NO', 40, N'YES'),

    -- OutboundPickingSlip.json -> rpt.t_com_config_report.report_code = PickingSlip.
    (N'PickingSlip', N'order_number', N'Order Number', N'text', N'string', N'outbound_order_number', N'=', NULL, N'Order number', NULL, NULL, NULL, N'YES', 10, N'YES'),
    (N'PickingSlip', N'order_date', N'Order Date', N'date', N'date', N'order_date', N'=', NULL, NULL, NULL, NULL, NULL, N'NO', 20, N'YES'),
    (N'PickingSlip', N'customer_code', N'Customer Code', N'text', N'string', N'customer_code', N'=', NULL, N'Customer code', NULL, NULL, NULL, N'NO', 30, N'YES'),
    (N'PickingSlip', N'zone', N'Zone', N'text', N'string', N'zone', N'=', NULL, N'Zone', NULL, NULL, NULL, N'NO', 40, N'YES'),
    (N'PickingSlip', N'location', N'Location', N'text', N'string', N'location', N'=', NULL, N'Location', NULL, NULL, NULL, N'NO', 50, N'YES'),

    -- OutboundDeliveryNote.json -> rpt.t_com_config_report.report_code = DeliveryNote.
    (N'DeliveryNote', N'order_number', N'Order Number', N'text', N'string', N'outbound_order_number', N'=', NULL, N'Order number', NULL, NULL, NULL, N'YES', 10, N'YES'),
    (N'DeliveryNote', N'customer_code', N'Customer Code', N'text', N'string', N'customer_code', N'=', NULL, N'Customer code', NULL, NULL, NULL, N'NO', 20, N'YES'),
    (N'DeliveryNote', N'ship_to_code', N'Ship To Code', N'text', N'string', N'ship_to_code', N'=', NULL, N'Ship to code', NULL, NULL, NULL, N'NO', 30, N'YES'),
    (N'DeliveryNote', N'order_type', N'Order Type', N'text', N'string', N'order_type', N'=', NULL, N'Order type', NULL, NULL, NULL, N'NO', 40, N'YES'),
    (N'DeliveryNote', N'order_date', N'Order Date', N'date', N'date', N'order_date', N'=', NULL, NULL, NULL, NULL, NULL, N'NO', 50, N'YES'),
    (N'DeliveryNote', N'delivery_date', N'Delivery Date', N'date', N'date', N'delivery_date_actual', N'=', NULL, NULL, NULL, NULL, NULL, N'NO', 60, N'YES'),
    (N'DeliveryNote', N'departure_date', N'Departure Date', N'date', N'date', NULL, N'=', NULL, NULL, NULL, NULL, NULL, N'NO', 70, N'NO'),
    (N'DeliveryNote', N'issue_wh', N'Issue Warehouse', N'text', N'string', N'warehouse', N'=', NULL, N'Issue warehouse', NULL, NULL, NULL, N'NO', 80, N'YES');

MERGE rpt.t_com_config_report_filter AS target
USING @Filters AS source
    ON target.report_code = source.report_code
   AND target.parameter_name = source.parameter_name
WHEN MATCHED THEN
    UPDATE SET
        target.label = source.label,
        target.input_type = source.input_type,
        target.data_type = source.data_type,
        target.sql_field_name = source.sql_field_name,
        target.operator = source.operator,
        target.default_value = source.default_value,
        target.placeholder = source.placeholder,
        target.option_source_type = source.option_source_type,
        target.option_json = source.option_json,
        target.option_sql = source.option_sql,
        target.is_required = source.is_required,
        target.sort_order = source.sort_order,
        target.is_active = source.is_active,
        target.update_date = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT
    (
        report_code,
        parameter_name,
        label,
        input_type,
        data_type,
        sql_field_name,
        operator,
        default_value,
        placeholder,
        option_source_type,
        option_json,
        option_sql,
        is_required,
        sort_order,
        is_active
    )
    VALUES
    (
        source.report_code,
        source.parameter_name,
        source.label,
        source.input_type,
        source.data_type,
        source.sql_field_name,
        source.operator,
        source.default_value,
        source.placeholder,
        source.option_source_type,
        source.option_json,
        source.option_sql,
        source.is_required,
        source.sort_order,
        source.is_active
    );

UPDATE rpt.t_com_config_report_filter
SET sql_field_name = N'delivery_date_actual',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'DeliveryNote'
  AND parameter_name = N'delivery_date';

UPDATE rpt.t_com_config_report_filter
SET sql_field_name = N'outbound_order_number',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'DeliveryNote'
  AND parameter_name = N'order_number';

UPDATE rpt.t_com_config_report_filter
SET sql_field_name = NULL,
    is_active = N'NO',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'DeliveryNote'
  AND parameter_name = N'departure_date';

UPDATE rpt.t_com_config_report_filter
SET sql_field_name = N'warehouse',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'DeliveryNote'
  AND parameter_name = N'issue_wh';

UPDATE rpt.t_com_config_report_filter
SET label = N'Order Date',
    sql_field_name = N'order_date',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'InboundReceiptSummary'
  AND parameter_name = N'receive_date';

UPDATE rpt.t_com_config_report_filter
SET sql_field_name = N'customer_name',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'InboundReceiptSummary'
  AND parameter_name = N'customer';

UPDATE rpt.t_com_config_report_filter
SET sql_field_name = N'inv_status',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'InventorySummaryItem'
  AND parameter_name = N'status';

UPDATE rpt.t_com_config_report_filter
SET sql_field_name = N'outbound_order_number',
    update_date = SYSUTCDATETIME()
WHERE report_code = N'PickingSlip'
  AND parameter_name = N'order_number';
