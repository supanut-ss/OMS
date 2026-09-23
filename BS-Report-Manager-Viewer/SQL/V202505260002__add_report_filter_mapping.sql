-- Migration: Add report filter mapping for BS-Report-Manager-Viewer.
-- Frontend uses this table to render report filters and map values to report parameters.

IF OBJECT_ID('rpt.t_com_config_report_filter', 'U') IS NULL
BEGIN
    CREATE TABLE rpt.t_com_config_report_filter
    (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        report_code NVARCHAR(100) NOT NULL,
        parameter_name NVARCHAR(100) NOT NULL,
        label NVARCHAR(200) NOT NULL,
        input_type NVARCHAR(30) NOT NULL CONSTRAINT DF_t_com_config_report_filter_input_type DEFAULT ('text'),
        data_type NVARCHAR(30) NOT NULL CONSTRAINT DF_t_com_config_report_filter_data_type DEFAULT ('string'),
        sql_field_name NVARCHAR(200) NULL,
        operator NVARCHAR(20) NULL CONSTRAINT DF_t_com_config_report_filter_operator DEFAULT ('='),
        default_value NVARCHAR(500) NULL,
        placeholder NVARCHAR(200) NULL,
        option_source_type NVARCHAR(30) NULL,
        option_json NVARCHAR(MAX) NULL,
        option_sql NVARCHAR(MAX) NULL,
        is_required NVARCHAR(10) NOT NULL CONSTRAINT DF_t_com_config_report_filter_is_required DEFAULT ('NO'),
        sort_order INT NOT NULL CONSTRAINT DF_t_com_config_report_filter_sort_order DEFAULT (0),
        is_active NVARCHAR(10) NOT NULL CONSTRAINT DF_t_com_config_report_filter_is_active DEFAULT ('YES'),
        create_date DATETIME2 NOT NULL CONSTRAINT DF_t_com_config_report_filter_create_date DEFAULT (SYSUTCDATETIME()),
        update_date DATETIME2 NULL
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_t_com_config_report_filter_report_code'
      AND object_id = OBJECT_ID('rpt.t_com_config_report_filter')
)
BEGIN
    CREATE INDEX IX_t_com_config_report_filter_report_code
        ON rpt.t_com_config_report_filter(report_code, is_active, sort_order);
END;

DECLARE @ReportFilterDescriptions TABLE
(
    column_name SYSNAME NULL,
    description NVARCHAR(4000) NOT NULL
);

INSERT INTO @ReportFilterDescriptions (column_name, description)
VALUES
    (NULL, N'Configuration table for report filter controls used by BS-Report-Manager-Viewer. Each active row maps one UI filter field to a report parameter and optional SQL filter expression.'),
    (N'id', N'Primary Key. Auto-increment unique identifier for each report filter configuration row.'),
    (N'report_code', N'Report code that owns this filter configuration. Used by the viewer to load filters for the selected report.'),
    (N'parameter_name', N'Report parameter name that receives the filter value when the report is executed.'),
    (N'label', N'User-facing filter label displayed in the report viewer UI.'),
    (N'input_type', N'Frontend input control type for this filter, such as text, number, date, select, multi-select, checkbox, or autocomplete. Defaults to text.'),
    (N'data_type', N'Logical value type used to parse and submit the filter value, such as string, number, date, boolean, or array. Defaults to string.'),
    (N'sql_field_name', N'Optional SQL field or expression that this filter applies to when building a dynamic WHERE condition. NULL means the filter only maps to the report parameter.'),
    (N'operator', N'Optional SQL comparison operator used with sql_field_name, such as =, LIKE, >=, <=, IN, or BETWEEN. Defaults to =.'),
    (N'default_value', N'Optional default filter value applied when the report filter form is first rendered.'),
    (N'placeholder', N'Optional placeholder text displayed inside the filter input control.'),
    (N'option_source_type', N'Optional source type for selectable filter options, such as json or sql. NULL means the input does not require option data.'),
    (N'option_json', N'Optional JSON array/object containing static option values for select-style filters.'),
    (N'option_sql', N'Optional SQL query used to load dynamic option values for select-style filters.'),
    (N'is_required', N'Indicates whether the user must provide a value before running the report. YES = required, NO = optional. Defaults to NO.'),
    (N'sort_order', N'Display order of the filter in the report viewer form. Lower numbers appear first.'),
    (N'is_active', N'Indicates whether this filter configuration is currently active. YES = active, NO = inactive. Defaults to YES.'),
    (N'create_date', N'Date and time when this filter configuration row was created. Defaults to SYSUTCDATETIME().'),
    (N'update_date', N'Date and time when this filter configuration row was last updated. NULL if never updated.');

DECLARE
    @ObjectId INT = OBJECT_ID(N'rpt.t_com_config_report_filter', N'U'),
    @ColumnName SYSNAME,
    @Description NVARCHAR(4000),
    @MinorId INT;

DECLARE report_filter_description_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT column_name, description
    FROM @ReportFilterDescriptions;

OPEN report_filter_description_cursor;

FETCH NEXT FROM report_filter_description_cursor INTO @ColumnName, @Description;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @MinorId = CASE
        WHEN @ColumnName IS NULL THEN 0
        ELSE COLUMNPROPERTY(@ObjectId, @ColumnName, 'ColumnId')
    END;

    IF @MinorId IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM sys.extended_properties
            WHERE [class] = 1
              AND major_id = @ObjectId
              AND minor_id = @MinorId
              AND [name] = N'MS_Description'
        )
        BEGIN
            IF @ColumnName IS NULL
            BEGIN
                EXEC sys.sp_updateextendedproperty
                    @name = N'MS_Description',
                    @value = @Description,
                    @level0type = N'SCHEMA', @level0name = N'rpt',
                    @level1type = N'TABLE', @level1name = N't_com_config_report_filter';
            END
            ELSE
            BEGIN
                EXEC sys.sp_updateextendedproperty
                    @name = N'MS_Description',
                    @value = @Description,
                    @level0type = N'SCHEMA', @level0name = N'rpt',
                    @level1type = N'TABLE', @level1name = N't_com_config_report_filter',
                    @level2type = N'COLUMN', @level2name = @ColumnName;
            END;
        END
        ELSE
        BEGIN
            IF @ColumnName IS NULL
            BEGIN
                EXEC sys.sp_addextendedproperty
                    @name = N'MS_Description',
                    @value = @Description,
                    @level0type = N'SCHEMA', @level0name = N'rpt',
                    @level1type = N'TABLE', @level1name = N't_com_config_report_filter';
            END
            ELSE
            BEGIN
                EXEC sys.sp_addextendedproperty
                    @name = N'MS_Description',
                    @value = @Description,
                    @level0type = N'SCHEMA', @level0name = N'rpt',
                    @level1type = N'TABLE', @level1name = N't_com_config_report_filter',
                    @level2type = N'COLUMN', @level2name = @ColumnName;
            END;
        END;
    END;

    FETCH NEXT FROM report_filter_description_cursor INTO @ColumnName, @Description;
END;

CLOSE report_filter_description_cursor;
DEALLOCATE report_filter_description_cursor;
