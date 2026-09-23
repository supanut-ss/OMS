-- Configure master-data report filters as dropdowns.
-- Supports both legacy report codes and the normalized report codes used by the viewer.

IF OBJECT_ID('rpt.t_com_config_report_filter', 'U') IS NULL
BEGIN
    THROW 51000, 'Table rpt.t_com_config_report_filter does not exist.', 1;
END;

DECLARE @DropdownFilters TABLE
(
    report_code NVARCHAR(100) NOT NULL,
    parameter_name NVARCHAR(100) NOT NULL,
    option_sql NVARCHAR(MAX) NOT NULL
);

DECLARE @WarehouseSql NVARCHAR(MAX) = N'
SELECT
    warehouse AS [value],
    CASE
        WHEN NULLIF(LTRIM(RTRIM(warehouse_name)), N'''') IS NULL THEN warehouse
        ELSE CONCAT(warehouse, N'' - '', warehouse_name)
    END AS [label]
FROM inv.t_inv_warehouse
WHERE is_active = 1
  AND NULLIF(LTRIM(RTRIM(warehouse)), N'''') IS NOT NULL
ORDER BY warehouse';

DECLARE @ItemCategorySql NVARCHAR(MAX) = N'
SELECT
    item_category AS [value],
    CASE
        WHEN NULLIF(LTRIM(RTRIM(description)), N'''') IS NULL THEN item_category
        ELSE CONCAT(item_category, N'' - '', description)
    END AS [label]
FROM inv.t_inv_category
WHERE is_active = 1
  AND NULLIF(LTRIM(RTRIM(item_category)), N'''') IS NOT NULL
ORDER BY item_category';

DECLARE @InboundOrderTypeSql NVARCHAR(MAX) = N'
SELECT
    value_member AS [value],
    COALESCE(NULLIF(LTRIM(RTRIM(display_member)), N''''), value_member) AS [label]
FROM sec.t_com_combobox_item
WHERE group_name = N''inbound_order_type''
  AND is_active = 1
  AND NULLIF(LTRIM(RTRIM(value_member)), N'''') IS NOT NULL
ORDER BY display_sequence, value_member';

DECLARE @InboundOrderStatusSql NVARCHAR(MAX) = N'
SELECT
    value_member AS [value],
    COALESCE(NULLIF(LTRIM(RTRIM(display_member)), N''''), value_member) AS [label]
FROM sec.t_com_combobox_item
WHERE group_name = N''inbound_order_status''
  AND is_active = 1
  AND NULLIF(LTRIM(RTRIM(value_member)), N'''') IS NOT NULL
ORDER BY display_sequence, value_member';

DECLARE @OutboundOrderTypeSql NVARCHAR(MAX) = N'
SELECT
    value_member AS [value],
    COALESCE(NULLIF(LTRIM(RTRIM(display_member)), N''''), value_member) AS [label]
FROM sec.t_com_combobox_item
WHERE group_name = N''outbound_order_type''
  AND is_active = 1
  AND NULLIF(LTRIM(RTRIM(value_member)), N'''') IS NOT NULL
ORDER BY display_sequence, value_member';

INSERT INTO @DropdownFilters (report_code, parameter_name, option_sql)
VALUES
    (N'InboundReceipt', N'order_type', @InboundOrderTypeSql),
    (N'InboundReceipt', N'order_status', @InboundOrderStatusSql),
    (N'InboundReceipt', N'warehouse', @WarehouseSql),
    (N'InboundReceiptSummary', N'order_type', @InboundOrderTypeSql),
    (N'InboundReceiptSummary', N'order_status', @InboundOrderStatusSql),
    (N'InboundReceiptSummary', N'warehouse', @WarehouseSql),
    (N'InboundOrderReceiveSummary', N'order_type', @InboundOrderTypeSql),
    (N'InboundOrderReceiveSummary', N'order_status', @InboundOrderStatusSql),
    (N'InboundOrderReceiveSummary', N'warehouse', @WarehouseSql),
    (N'InventorySummaryItem', N'warehouse', @WarehouseSql),
    (N'InventorySummaryItem', N'item_category', @ItemCategorySql),
    (N'DeliveryNote', N'order_type', @OutboundOrderTypeSql),
    (N'DeliveryNote', N'issue_wh', @WarehouseSql),
    (N'OutboundDeliveryNote', N'order_type', @OutboundOrderTypeSql),
    (N'OutboundDeliveryNote', N'issue_wh', @WarehouseSql);

UPDATE target
SET
    target.input_type = N'select',
    target.option_source_type = N'sql',
    target.option_json = NULL,
    target.option_sql = source.option_sql,
    target.update_date = SYSUTCDATETIME()
FROM rpt.t_com_config_report_filter AS target
INNER JOIN @DropdownFilters AS source
    ON source.report_code = target.report_code
   AND source.parameter_name = target.parameter_name;
