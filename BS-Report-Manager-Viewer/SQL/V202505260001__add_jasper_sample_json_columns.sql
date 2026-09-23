-- Migration: Add Jaspersoft sample JSON template columns.
-- The path is kept for audit/download trace. The JSON content is used by
-- BS-Report-Manager-Viewer to shape SQL view rows into Jasper's nested JSON.

IF COL_LENGTH('rpt.t_com_config_report', 'jasper_sample_json_path') IS NULL
BEGIN
    ALTER TABLE rpt.t_com_config_report
        ADD jasper_sample_json_path NVARCHAR(1000) NULL;
END;

IF COL_LENGTH('rpt.t_com_config_report', 'jasper_sample_json') IS NULL
BEGIN
    ALTER TABLE rpt.t_com_config_report
        ADD jasper_sample_json NVARCHAR(MAX) NULL;
END;
