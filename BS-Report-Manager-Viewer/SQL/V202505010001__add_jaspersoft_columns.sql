-- Migration: Add local Jasper report output columns to rpt.t_com_config_report.
-- BS-Report-Manager-Viewer runs Jasper locally in Docker. The report template
-- path is stored in report_path; the sample JSON path is added separately.

IF COL_LENGTH('rpt.t_com_config_report', 'jasper_output_format') IS NULL
BEGIN
    ALTER TABLE rpt.t_com_config_report
        ADD jasper_output_format NVARCHAR(20) NULL;
END;
