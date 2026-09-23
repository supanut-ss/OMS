-- Convert report filter flags from YES/NO text to SQL Server BIT.

IF OBJECT_ID('rpt.t_com_config_report_filter', 'U') IS NULL
BEGIN
    THROW 51000, 'Table rpt.t_com_config_report_filter does not exist.', 1;
END;

DECLARE @ObjectId INT = OBJECT_ID(N'rpt.t_com_config_report_filter', N'U');
DECLARE @ConstraintName SYSNAME;
DECLARE @Sql NVARCHAR(MAX);

IF EXISTS
(
    SELECT 1
    FROM sys.columns
    WHERE object_id = @ObjectId
      AND name = N'is_required'
      AND system_type_id <> TYPE_ID(N'bit')
)
BEGIN
    SELECT @ConstraintName = dc.name
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = @ObjectId
      AND c.name = N'is_required';

    IF @ConstraintName IS NOT NULL
    BEGIN
        SET @Sql = N'ALTER TABLE rpt.t_com_config_report_filter DROP CONSTRAINT '
            + QUOTENAME(@ConstraintName) + N';';
        EXEC sys.sp_executesql @Sql;
    END;

    UPDATE rpt.t_com_config_report_filter
    SET is_required = CASE
        WHEN UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(10), is_required)))) IN (N'YES', N'1', N'TRUE') THEN N'1'
        ELSE N'0'
    END;

    ALTER TABLE rpt.t_com_config_report_filter
        ALTER COLUMN is_required BIT NOT NULL;
END;

IF EXISTS
(
    SELECT 1
    FROM sys.columns
    WHERE object_id = @ObjectId
      AND name = N'is_active'
      AND system_type_id <> TYPE_ID(N'bit')
)
BEGIN
    IF EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = @ObjectId
          AND name = N'IX_t_com_config_report_filter_report_code'
    )
    BEGIN
        DROP INDEX IX_t_com_config_report_filter_report_code
            ON rpt.t_com_config_report_filter;
    END;

    SET @ConstraintName = NULL;

    SELECT @ConstraintName = dc.name
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = @ObjectId
      AND c.name = N'is_active';

    IF @ConstraintName IS NOT NULL
    BEGIN
        SET @Sql = N'ALTER TABLE rpt.t_com_config_report_filter DROP CONSTRAINT '
            + QUOTENAME(@ConstraintName) + N';';
        EXEC sys.sp_executesql @Sql;
    END;

    UPDATE rpt.t_com_config_report_filter
    SET is_active = CASE
        WHEN UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(10), is_active)))) IN (N'YES', N'1', N'TRUE') THEN N'1'
        ELSE N'0'
    END;

    ALTER TABLE rpt.t_com_config_report_filter
        ALTER COLUMN is_active BIT NOT NULL;
END;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = @ObjectId
      AND c.name = N'is_required'
)
BEGIN
    ALTER TABLE rpt.t_com_config_report_filter
        ADD CONSTRAINT DF_t_com_config_report_filter_is_required
        DEFAULT (0) FOR is_required;
END;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = @ObjectId
      AND c.name = N'is_active'
)
BEGIN
    ALTER TABLE rpt.t_com_config_report_filter
        ADD CONSTRAINT DF_t_com_config_report_filter_is_active
        DEFAULT (1) FOR is_active;
END;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = @ObjectId
      AND name = N'IX_t_com_config_report_filter_report_code'
)
BEGIN
    CREATE INDEX IX_t_com_config_report_filter_report_code
        ON rpt.t_com_config_report_filter(report_code, is_active, sort_order);
END;

EXEC sys.sp_updateextendedproperty
    @name = N'MS_Description',
    @value = N'Indicates whether the user must provide a value before running the report. 1 = required, 0 = optional. Defaults to 0.',
    @level0type = N'SCHEMA', @level0name = N'rpt',
    @level1type = N'TABLE', @level1name = N't_com_config_report_filter',
    @level2type = N'COLUMN', @level2name = N'is_required';

EXEC sys.sp_updateextendedproperty
    @name = N'MS_Description',
    @value = N'Indicates whether this filter configuration is active. 1 = active, 0 = inactive. Defaults to 1.',
    @level0type = N'SCHEMA', @level0name = N'rpt',
    @level1type = N'TABLE', @level1name = N't_com_config_report_filter',
    @level2type = N'COLUMN', @level2name = N'is_active';
