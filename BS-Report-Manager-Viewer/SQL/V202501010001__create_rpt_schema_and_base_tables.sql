-- Migration: Create rpt schema and base table rpt.t_com_config_report.
-- This is the foundational migration that must be run before any ALTER TABLE migrations.

-- Create schema if not exists
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'rpt')
BEGIN
    EXEC sp_executesql N'CREATE SCHEMA rpt AUTHORIZATION dbo';
END;

-- Create base report config table
IF OBJECT_ID('rpt.t_com_config_report', 'U') IS NULL
BEGIN
    CREATE TABLE rpt.t_com_config_report
    (
        report_code            NVARCHAR(100)  NOT NULL CONSTRAINT PK_t_com_config_report PRIMARY KEY,
        report_name            NVARCHAR(300)  NOT NULL,
        report_type            NVARCHAR(50)   NOT NULL,
        is_print_by_server     NVARCHAR(10)   NOT NULL CONSTRAINT DF_t_com_config_report_is_print_by_server DEFAULT ('NO'),
        printer_name           NVARCHAR(300)  NULL,
        report_path            NVARCHAR(1000) NULL,
        bartender_data_path    NVARCHAR(1000) NULL,
        bartender_trigger_path NVARCHAR(1000) NULL,
        html_page_size         NVARCHAR(50)   NULL,
        rdlc_dataset_name      NVARCHAR(200)  NULL,
        ssrs_server_url        NVARCHAR(500)  NULL,
        ssrs_report_path       NVARCHAR(500)  NULL,
        ssrs_username          NVARCHAR(100)  NULL,
        ssrs_password          NVARCHAR(255)  NULL,
        ssrs_domain_name       NVARCHAR(100)  NULL,
        run_as                 NVARCHAR(50)   NULL,
        json_parameter         NVARCHAR(MAX)  NULL,
        sql_object_type        NVARCHAR(50)   NULL,
        sql_command            NVARCHAR(MAX)  NULL,
        is_active              NVARCHAR(10)   NOT NULL CONSTRAINT DF_t_com_config_report_is_active DEFAULT ('YES'),
        create_date            DATETIME2      NOT NULL CONSTRAINT DF_t_com_config_report_create_date DEFAULT (SYSUTCDATETIME()),
        update_date            DATETIME2      NULL
    );

    CREATE INDEX IX_t_com_config_report_is_active
        ON rpt.t_com_config_report(is_active, report_name, report_code);
END;
