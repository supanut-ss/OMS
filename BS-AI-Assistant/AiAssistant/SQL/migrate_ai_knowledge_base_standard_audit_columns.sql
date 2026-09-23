-- =============================================================================
-- BS-AI-Assistance: Knowledge Base Audit Column Standardization
-- Description: Renames audit fields and converts date fields to match BS standard
-- Standard: create_by, create_date DATETIME, update_by, update_date DATETIME
-- =============================================================================

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
SET ANSI_WARNINGS ON
GO
SET CONCAT_NULL_YIELDS_NULL ON
GO
SET ARITHABORT ON
GO
SET NUMERIC_ROUNDABORT OFF
GO

-- Rename audit user columns on knowledge document.
IF COL_LENGTH('ais.t_ai_knowledge_document', 'created_by') IS NOT NULL
   AND COL_LENGTH('ais.t_ai_knowledge_document', 'create_by') IS NULL
BEGIN
    EXEC sp_rename 'ais.t_ai_knowledge_document.created_by', 'create_by', 'COLUMN';
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_document', 'updated_by') IS NOT NULL
   AND COL_LENGTH('ais.t_ai_knowledge_document', 'update_by') IS NULL
BEGIN
    EXEC sp_rename 'ais.t_ai_knowledge_document.updated_by', 'update_by', 'COLUMN';
END
GO

-- Rename date columns to the same create/update convention.
IF COL_LENGTH('ais.t_ai_knowledge_document', 'created_date') IS NOT NULL
   AND COL_LENGTH('ais.t_ai_knowledge_document', 'create_date') IS NULL
BEGIN
    EXEC sp_rename 'ais.t_ai_knowledge_document.created_date', 'create_date', 'COLUMN';
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_document', 'updated_date') IS NOT NULL
   AND COL_LENGTH('ais.t_ai_knowledge_document', 'update_date') IS NULL
BEGIN
    EXEC sp_rename 'ais.t_ai_knowledge_document.updated_date', 'update_date', 'COLUMN';
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_chunk', 'created_date') IS NOT NULL
   AND COL_LENGTH('ais.t_ai_knowledge_chunk', 'create_date') IS NULL
BEGIN
    EXEC sp_rename 'ais.t_ai_knowledge_chunk.created_date', 'create_date', 'COLUMN';
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_chunk', 'updated_date') IS NOT NULL
   AND COL_LENGTH('ais.t_ai_knowledge_chunk', 'update_date') IS NULL
BEGIN
    EXEC sp_rename 'ais.t_ai_knowledge_chunk.updated_date', 'update_date', 'COLUMN';
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_retrieval_log', 'created_date') IS NOT NULL
   AND COL_LENGTH('ais.t_ai_knowledge_retrieval_log', 'create_date') IS NULL
BEGIN
    EXEC sp_rename 'ais.t_ai_knowledge_retrieval_log.created_date', 'create_date', 'COLUMN';
END
GO

-- Drop default constraints before altering date column types.
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) +
               N' DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';' + CHAR(13)
FROM sys.default_constraints dc
JOIN sys.columns c
    ON c.object_id = dc.parent_object_id
   AND c.column_id = dc.parent_column_id
JOIN sys.tables t
    ON t.object_id = dc.parent_object_id
JOIN sys.schemas s
    ON s.schema_id = t.schema_id
WHERE s.name = N'ais'
  AND t.name IN (
      N't_ai_knowledge_document',
      N't_ai_knowledge_chunk',
      N't_ai_schema_catalog',
      N't_ai_schema_relation',
      N't_ai_knowledge_retrieval_log'
  )
  AND c.name IN (N'create_date', N'update_date', N'last_synced_date');

IF LEN(@sql) > 0
BEGIN
    EXEC sp_executesql @sql;
END
GO

-- Drop dependent index before altering create_date on retrieval log.
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[ais].[t_ai_knowledge_retrieval_log]')
      AND name = N'IX_ai_knowledge_retrieval_log_process'
)
BEGIN
    DROP INDEX [IX_ai_knowledge_retrieval_log_process] ON [ais].[t_ai_knowledge_retrieval_log];
END
GO

-- Convert date columns to DATETIME.
IF COL_LENGTH('ais.t_ai_knowledge_document', 'create_date') IS NOT NULL
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_document] ALTER COLUMN [create_date] DATETIME NOT NULL;
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_document', 'update_date') IS NOT NULL
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_document] ALTER COLUMN [update_date] DATETIME NULL;
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_chunk', 'create_date') IS NOT NULL
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_chunk] ALTER COLUMN [create_date] DATETIME NOT NULL;
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_chunk', 'update_date') IS NOT NULL
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_chunk] ALTER COLUMN [update_date] DATETIME NULL;
END
GO

IF COL_LENGTH('ais.t_ai_schema_catalog', 'last_synced_date') IS NOT NULL
BEGIN
    ALTER TABLE [ais].[t_ai_schema_catalog] ALTER COLUMN [last_synced_date] DATETIME NOT NULL;
END
GO

IF COL_LENGTH('ais.t_ai_schema_relation', 'last_synced_date') IS NOT NULL
BEGIN
    ALTER TABLE [ais].[t_ai_schema_relation] ALTER COLUMN [last_synced_date] DATETIME NOT NULL;
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_retrieval_log', 'create_date') IS NOT NULL
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_retrieval_log] ALTER COLUMN [create_date] DATETIME NOT NULL;
END
GO

-- Recreate standard defaults with stable names.
IF COL_LENGTH('ais.t_ai_knowledge_document', 'create_date') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_ai_knowledge_document_create_date')
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_document]
    ADD CONSTRAINT [DF_ai_knowledge_document_create_date] DEFAULT GETDATE() FOR [create_date];
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_chunk', 'create_date') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_ai_knowledge_chunk_create_date')
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_chunk]
    ADD CONSTRAINT [DF_ai_knowledge_chunk_create_date] DEFAULT GETDATE() FOR [create_date];
END
GO

IF COL_LENGTH('ais.t_ai_schema_catalog', 'last_synced_date') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_ai_schema_catalog_last_synced_date')
BEGIN
    ALTER TABLE [ais].[t_ai_schema_catalog]
    ADD CONSTRAINT [DF_ai_schema_catalog_last_synced_date] DEFAULT GETDATE() FOR [last_synced_date];
END
GO

IF COL_LENGTH('ais.t_ai_schema_relation', 'last_synced_date') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_ai_schema_relation_last_synced_date')
BEGIN
    ALTER TABLE [ais].[t_ai_schema_relation]
    ADD CONSTRAINT [DF_ai_schema_relation_last_synced_date] DEFAULT GETDATE() FOR [last_synced_date];
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_retrieval_log', 'create_date') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_ai_knowledge_retrieval_log_create_date')
BEGIN
    ALTER TABLE [ais].[t_ai_knowledge_retrieval_log]
    ADD CONSTRAINT [DF_ai_knowledge_retrieval_log_create_date] DEFAULT GETDATE() FOR [create_date];
END
GO

IF COL_LENGTH('ais.t_ai_knowledge_retrieval_log', 'create_date') IS NOT NULL
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_retrieval_log_process]
        ON [ais].[t_ai_knowledge_retrieval_log]([process], [create_date] DESC);
END
GO

PRINT 'KnowledgeBase audit columns standardized successfully.';
GO
