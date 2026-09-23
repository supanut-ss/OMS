-- Migration: Remove unused Jaspersoft server columns and seed local Jasper paths.
-- Local Docker rendering uses:
--   report_path             -> .jasper or .jrxml template file under Reports/jasper
--   jasper_sample_json_path -> sample JSON file under Reports/jasper

IF COL_LENGTH('rpt.t_com_config_report', 'jasper_server_url') IS NOT NULL
BEGIN
    ALTER TABLE rpt.t_com_config_report DROP COLUMN jasper_server_url;
END;

IF COL_LENGTH('rpt.t_com_config_report', 'jasper_report_uri') IS NOT NULL
BEGIN
    ALTER TABLE rpt.t_com_config_report DROP COLUMN jasper_report_uri;
END;

IF COL_LENGTH('rpt.t_com_config_report', 'jasper_username') IS NOT NULL
BEGIN
    ALTER TABLE rpt.t_com_config_report DROP COLUMN jasper_username;
END;

IF COL_LENGTH('rpt.t_com_config_report', 'jasper_password') IS NOT NULL
BEGIN
    ALTER TABLE rpt.t_com_config_report DROP COLUMN jasper_password;
END;

UPDATE rpt.t_com_config_report
SET
    report_path = N'InboundReceipt.jasper',
    jasper_sample_json_path = N'InboundReceipt.json',
    jasper_output_format = COALESCE(NULLIF(jasper_output_format, N''), N'pdf'),
    update_date = GETDATE()
WHERE report_code = N'InboundReceipt';

UPDATE rpt.t_com_config_report
SET
    report_path = N'InboundOrderReceiveSummary.jasper',
    jasper_sample_json_path = N'InboundOrderReceiveSummary.json',
    jasper_output_format = COALESCE(NULLIF(jasper_output_format, N''), N'pdf'),
    update_date = GETDATE()
WHERE report_code = N'InboundReceiptSummary';

UPDATE rpt.t_com_config_report
SET
    report_path = N'InventorySummaryItem.jasper',
    jasper_sample_json_path = N'InventorySummaryItem.json',
    jasper_output_format = COALESCE(NULLIF(jasper_output_format, N''), N'pdf'),
    update_date = GETDATE()
WHERE report_code = N'InventorySummaryItem';

UPDATE rpt.t_com_config_report
SET
    report_path = N'OutboundDeliveryNote.jrxml',
    jasper_sample_json_path = N'OutboundDeliveryNote.json',
    jasper_output_format = COALESCE(NULLIF(jasper_output_format, N''), N'pdf'),
    update_date = GETDATE()
WHERE report_code = N'DeliveryNote';

UPDATE rpt.t_com_config_report
SET
    report_path = N'OutboundPickingSlip.jasper',
    jasper_sample_json_path = N'OutboundPickingSlip.json',
    jasper_output_format = COALESCE(NULLIF(jasper_output_format, N''), N'pdf'),
    update_date = GETDATE()
WHERE report_code = N'PickingSlip';
