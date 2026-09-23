-- Migration: Seed StickerInboundItem filters for selected inbound detail lines.

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
    (N'StickerInboundItem', N'inbound_order_number', N'Inbound Order', N'text', N'string', N'inbound_order_number', N'=', NULL, N'Inbound order no.', NULL, NULL, NULL, N'YES', 10, N'YES'),
    (N'StickerInboundItem', N'inbound_detail_ids', N'Inbound Detail Lines', N'text', N'number', N'inbound_detail_id', N'IN', NULL, N'Selected inbound detail ids', NULL, NULL, NULL, N'YES', 20, N'YES');

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
