-- =============================================================================
-- Migration: Rename audit columns in ais schema tables
-- Database: MyInventory
-- Changes:
--   created_date -> create_date
--   created_by   -> create_by
--   updated_by   -> update_by
--   updated_date -> update_date
-- =============================================================================

USE MyInventory;
GO

-- =============================================================================
-- TABLE: ais.t_ai_system_prompt
-- =============================================================================
PRINT N'[START] Renaming columns in ais.t_ai_system_prompt...';
GO

-- 1. Drop DEFAULT constraint บน created_date ก่อน rename
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'ais' AND t.name = 't_ai_system_prompt' AND c.name = 'created_date';

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE ais.t_ai_system_prompt DROP CONSTRAINT ' + @ConstraintName);
    PRINT N'  [OK] Dropped DEFAULT on created_date';
END
GO

-- Rename columns
EXEC sp_rename 'ais.t_ai_system_prompt.created_by',   'create_by',   'COLUMN'; PRINT N'  [OK] created_by  -> create_by';
EXEC sp_rename 'ais.t_ai_system_prompt.created_date',  'create_date',  'COLUMN'; PRINT N'  [OK] created_date -> create_date';
EXEC sp_rename 'ais.t_ai_system_prompt.updated_by',   'update_by',   'COLUMN'; PRINT N'  [OK] updated_by  -> update_by';
EXEC sp_rename 'ais.t_ai_system_prompt.updated_date',  'update_date',  'COLUMN'; PRINT N'  [OK] updated_date -> update_date';
GO

-- Re-add DEFAULT constraint on create_date
ALTER TABLE ais.t_ai_system_prompt ADD CONSTRAINT DF_ai_system_prompt_create_date DEFAULT (GETDATE()) FOR create_date;
PRINT N'  [OK] Re-added DEFAULT (GETDATE()) on create_date';
PRINT N'[DONE] ais.t_ai_system_prompt';
GO

-- =============================================================================
-- TABLE: ais.t_ai_page_config
-- =============================================================================
PRINT N'[START] Renaming columns in ais.t_ai_page_config...';
GO

DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'ais' AND t.name = 't_ai_page_config' AND c.name = 'created_date';

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE ais.t_ai_page_config DROP CONSTRAINT ' + @ConstraintName);
    PRINT N'  [OK] Dropped DEFAULT on created_date';
END
GO

EXEC sp_rename 'ais.t_ai_page_config.created_by',   'create_by',   'COLUMN'; PRINT N'  [OK] created_by  -> create_by';
EXEC sp_rename 'ais.t_ai_page_config.created_date',  'create_date',  'COLUMN'; PRINT N'  [OK] created_date -> create_date';
EXEC sp_rename 'ais.t_ai_page_config.updated_by',   'update_by',   'COLUMN'; PRINT N'  [OK] updated_by  -> update_by';
EXEC sp_rename 'ais.t_ai_page_config.updated_date',  'update_date',  'COLUMN'; PRINT N'  [OK] updated_date -> update_date';
GO

ALTER TABLE ais.t_ai_page_config ADD CONSTRAINT DF_ai_page_config_create_date DEFAULT (GETDATE()) FOR create_date;
PRINT N'  [OK] Re-added DEFAULT (GETDATE()) on create_date';
PRINT N'[DONE] ais.t_ai_page_config';
GO

-- =============================================================================
-- TABLE: ais.t_ai_chat_log  (only has created_date, no updated columns)
-- =============================================================================
PRINT N'[START] Renaming columns in ais.t_ai_chat_log...';
GO

DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'ais' AND t.name = 't_ai_chat_log' AND c.name = 'created_date';

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE ais.t_ai_chat_log DROP CONSTRAINT ' + @ConstraintName);
    PRINT N'  [OK] Dropped DEFAULT on created_date';
END
GO

EXEC sp_rename 'ais.t_ai_chat_log.created_date', 'create_date', 'COLUMN'; PRINT N'  [OK] created_date -> create_date';
GO

ALTER TABLE ais.t_ai_chat_log ADD CONSTRAINT DF_ai_chat_log_create_date DEFAULT (GETDATE()) FOR create_date;
PRINT N'  [OK] Re-added DEFAULT (GETDATE()) on create_date';
PRINT N'[DONE] ais.t_ai_chat_log';
GO

-- =============================================================================
-- Verify result
-- =============================================================================
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'ais'
  AND TABLE_NAME IN ('t_ai_system_prompt', 't_ai_page_config', 't_ai_chat_log')
  AND COLUMN_NAME IN ('create_by', 'create_date', 'update_by', 'update_date')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
GO
