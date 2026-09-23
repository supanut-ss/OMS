-- =============================================================================
-- BS-AI-Assistance: Knowledge Base + Schema Catalog Migration
-- Description: Adds RAG knowledge tables and SQL Server schema-description catalog
-- Database: MyInventory (SQL Server)
-- =============================================================================

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ais')
BEGIN
    EXEC('CREATE SCHEMA [ais]')
END
GO

-- =============================================================================
-- Table 1: ais.t_ai_knowledge_document
-- Purpose: Stores source-level knowledge documents before chunking/embedding.
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_knowledge_document]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_knowledge_document] (
        [knowledge_document_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [doc_type]              NVARCHAR(50)    NOT NULL,
        [title]                 NVARCHAR(300)   NOT NULL,
        [content]               NVARCHAR(MAX)   NOT NULL,
        [process]               NVARCHAR(200)   NULL,
        [module_name]           NVARCHAR(200)   NULL,
        [schema_name]           SYSNAME         NULL,
        [table_name]            SYSNAME         NULL,
        [source_path]           NVARCHAR(1000)  NULL,
        [source_version]        NVARCHAR(100)   NULL,
        [source_hash]           NVARCHAR(128)   NULL,
        [language_code]         NVARCHAR(20)    NOT NULL DEFAULT N'th-TH',
        [is_generated]          BIT             NOT NULL DEFAULT 0,
        [is_active]             BIT             NOT NULL DEFAULT 1,
        [create_by]             NVARCHAR(100)   NULL,
        [create_date]           DATETIME        NOT NULL DEFAULT GETDATE(),
        [update_by]             NVARCHAR(100)   NULL,
        [update_date]           DATETIME        NULL
    )

    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_document_doc_type]
        ON [ais].[t_ai_knowledge_document]([doc_type], [is_active])

    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_document_process]
        ON [ais].[t_ai_knowledge_document]([process], [is_active])
        WHERE [process] IS NOT NULL

    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_document_table]
        ON [ais].[t_ai_knowledge_document]([schema_name], [table_name], [is_active])
        WHERE [schema_name] IS NOT NULL AND [table_name] IS NOT NULL

    PRINT 'Created table: ais.t_ai_knowledge_document'
END
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Knowledge document source table for BS-AI-KnowledgeBase. Stores full source documents such as process docs, API docs, business rules, UI page context, and generated schema summaries before chunking and embedding.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_knowledge_document'
GO

-- =============================================================================
-- Table 2: ais.t_ai_knowledge_chunk
-- Purpose: Stores searchable chunks derived from knowledge documents.
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_knowledge_chunk]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_knowledge_chunk] (
        [knowledge_chunk_id]    BIGINT IDENTITY(1,1) PRIMARY KEY,
        [knowledge_document_id] BIGINT          NOT NULL,
        [chunk_index]           INT             NOT NULL,
        [chunk_title]           NVARCHAR(300)   NULL,
        [chunk_content]         NVARCHAR(MAX)   NOT NULL,
        [embedding_text]        NVARCHAR(MAX)   NOT NULL,
        [embedding_provider]    NVARCHAR(100)   NULL,
        [embedding_model]       NVARCHAR(200)   NULL,
        [embedding_dimension]   INT             NULL,
        -- Store vectors as JSON for portability. If SQL Server native vector is available,
        -- add a dedicated vector column in a later migration and keep this as fallback/audit.
        [embedding_json]        NVARCHAR(MAX)   NULL,
        [content_hash]          NVARCHAR(128)   NOT NULL,
        [token_count]           INT             NULL,
        [is_embedded]           BIT             NOT NULL DEFAULT 0,
        [is_active]             BIT             NOT NULL DEFAULT 1,
        [create_date]           DATETIME        NOT NULL DEFAULT GETDATE(),
        [update_date]           DATETIME        NULL,

        CONSTRAINT [FK_ai_knowledge_chunk_document]
            FOREIGN KEY ([knowledge_document_id])
            REFERENCES [ais].[t_ai_knowledge_document]([knowledge_document_id])
            ON DELETE CASCADE,

        CONSTRAINT [UQ_ai_knowledge_chunk_document_index]
            UNIQUE ([knowledge_document_id], [chunk_index])
    )

    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_chunk_active_embedded]
        ON [ais].[t_ai_knowledge_chunk]([is_active], [is_embedded])

    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_chunk_document]
        ON [ais].[t_ai_knowledge_chunk]([knowledge_document_id])

    PRINT 'Created table: ais.t_ai_knowledge_chunk'
END
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Searchable knowledge chunks derived from t_ai_knowledge_document. Each chunk can be embedded and retrieved for RAG prompt assembly.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_knowledge_chunk'
GO

-- =============================================================================
-- Table 3: ais.t_ai_schema_catalog
-- Purpose: Stores SQL Server schema/table/column descriptions synced from metadata.
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_schema_catalog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_schema_catalog] (
        [schema_catalog_id]  BIGINT IDENTITY(1,1) PRIMARY KEY,
        [schema_name]        SYSNAME         NOT NULL,
        [table_name]         SYSNAME         NOT NULL,
        [table_description]  NVARCHAR(MAX)   NULL,
        [column_name]        SYSNAME         NOT NULL,
        [column_description] NVARCHAR(MAX)   NULL,
        [data_type]          NVARCHAR(128)   NOT NULL,
        [max_length]         INT             NOT NULL,
        [precision_value]    TINYINT         NOT NULL,
        [scale_value]        TINYINT         NOT NULL,
        [is_nullable]        BIT             NOT NULL,
        [is_primary_key]     BIT             NOT NULL DEFAULT 0,
        [is_identity]        BIT             NOT NULL DEFAULT 0,
        [object_id]          INT             NOT NULL,
        [column_id]          INT             NOT NULL,
        [metadata_hash]      NVARCHAR(128)   NULL,
        [last_synced_date]   DATETIME        NOT NULL DEFAULT GETDATE(),
        [is_active]          BIT             NOT NULL DEFAULT 1,

        CONSTRAINT [UQ_ai_schema_catalog_column]
            UNIQUE ([schema_name], [table_name], [column_name])
    )

    CREATE NONCLUSTERED INDEX [IX_ai_schema_catalog_table]
        ON [ais].[t_ai_schema_catalog]([schema_name], [table_name], [is_active])

    CREATE NONCLUSTERED INDEX [IX_ai_schema_catalog_column]
        ON [ais].[t_ai_schema_catalog]([column_name], [is_active])

    PRINT 'Created table: ais.t_ai_schema_catalog'
END
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Schema catalog synced from SQL Server metadata and MS_Description extended properties. Used as the source of truth for AI schema understanding and SQL generation context.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_schema_catalog'
GO

-- =============================================================================
-- Table 4: ais.t_ai_schema_relation
-- Purpose: Stores foreign-key relations for schema-aware retrieval and SQL joins.
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_schema_relation]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_schema_relation] (
        [schema_relation_id]       BIGINT IDENTITY(1,1) PRIMARY KEY,
        [foreign_key_name]         SYSNAME        NOT NULL,
        [parent_schema_name]       SYSNAME        NOT NULL,
        [parent_table_name]        SYSNAME        NOT NULL,
        [parent_column_name]       SYSNAME        NOT NULL,
        [referenced_schema_name]   SYSNAME        NOT NULL,
        [referenced_table_name]    SYSNAME        NOT NULL,
        [referenced_column_name]   SYSNAME        NOT NULL,
        [relation_description]     NVARCHAR(MAX)  NULL,
        [object_id]                INT            NOT NULL,
        [constraint_column_id]     INT            NOT NULL,
        [last_synced_date]         DATETIME       NOT NULL DEFAULT GETDATE(),
        [is_active]                BIT            NOT NULL DEFAULT 1,

        CONSTRAINT [UQ_ai_schema_relation_column]
            UNIQUE (
                [foreign_key_name],
                [parent_schema_name],
                [parent_table_name],
                [parent_column_name],
                [referenced_schema_name],
                [referenced_table_name],
                [referenced_column_name]
            )
    )

    CREATE NONCLUSTERED INDEX [IX_ai_schema_relation_parent]
        ON [ais].[t_ai_schema_relation]([parent_schema_name], [parent_table_name], [is_active])

    CREATE NONCLUSTERED INDEX [IX_ai_schema_relation_referenced]
        ON [ais].[t_ai_schema_relation]([referenced_schema_name], [referenced_table_name], [is_active])

    PRINT 'Created table: ais.t_ai_schema_relation'
END
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Foreign-key relation catalog synced from SQL Server metadata. Used by AI retrieval to understand joins between tables and avoid guessing relationships.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_schema_relation'
GO

-- =============================================================================
-- Table 5: ais.t_ai_knowledge_retrieval_log
-- Purpose: Audits which knowledge/schema records were retrieved for each chat.
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_knowledge_retrieval_log]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_knowledge_retrieval_log] (
        [knowledge_retrieval_log_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [ai_chat_log_id]             BIGINT         NULL,
        [knowledge_chunk_id]         BIGINT         NULL,
        [schema_catalog_id]          BIGINT         NULL,
        [schema_relation_id]         BIGINT         NULL,
        [retrieval_mode]             NVARCHAR(50)   NOT NULL,
        [similarity_score]           DECIMAL(9,6)   NULL,
        [rank_order]                 INT            NOT NULL,
        [process]                    NVARCHAR(200)  NULL,
        [query_text]                 NVARCHAR(MAX)  NULL,
        [create_date]                DATETIME       NOT NULL DEFAULT GETDATE(),

        CONSTRAINT [FK_ai_knowledge_retrieval_log_chat]
            FOREIGN KEY ([ai_chat_log_id])
            REFERENCES [ais].[t_ai_chat_log]([ai_chat_log_id]),

        CONSTRAINT [FK_ai_knowledge_retrieval_log_chunk]
            FOREIGN KEY ([knowledge_chunk_id])
            REFERENCES [ais].[t_ai_knowledge_chunk]([knowledge_chunk_id]),

        CONSTRAINT [FK_ai_knowledge_retrieval_log_schema_catalog]
            FOREIGN KEY ([schema_catalog_id])
            REFERENCES [ais].[t_ai_schema_catalog]([schema_catalog_id]),

        CONSTRAINT [FK_ai_knowledge_retrieval_log_schema_relation]
            FOREIGN KEY ([schema_relation_id])
            REFERENCES [ais].[t_ai_schema_relation]([schema_relation_id])
    )

    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_retrieval_log_chat]
        ON [ais].[t_ai_knowledge_retrieval_log]([ai_chat_log_id], [rank_order])

    CREATE NONCLUSTERED INDEX [IX_ai_knowledge_retrieval_log_process]
        ON [ais].[t_ai_knowledge_retrieval_log]([process], [create_date] DESC)

    PRINT 'Created table: ais.t_ai_knowledge_retrieval_log'
END
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Audit log for RAG retrieval. Records which knowledge chunks, schema catalog rows, or schema relations were retrieved for each AI chat request.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_knowledge_retrieval_log'
GO

-- =============================================================================
-- View: ais.v_ai_schema_metadata_source
-- Purpose: Source query for schema sync service.
-- =============================================================================
CREATE OR ALTER VIEW [ais].[v_ai_schema_metadata_source]
AS
SELECT
    s.name AS schema_name,
    t.name AS table_name,
    CAST(tbl_desc.value AS NVARCHAR(MAX)) AS table_description,
    c.name AS column_name,
    ty.name AS data_type,
    c.max_length,
    c.precision AS precision_value,
    c.scale AS scale_value,
    c.is_nullable,
    CAST(CASE WHEN pk_cols.column_id IS NULL THEN 0 ELSE 1 END AS BIT) AS is_primary_key,
    c.is_identity,
    t.object_id,
    c.column_id,
    CAST(col_desc.value AS NVARCHAR(MAX)) AS column_description
FROM sys.tables t
JOIN sys.schemas s
    ON s.schema_id = t.schema_id
JOIN sys.columns c
    ON c.object_id = t.object_id
JOIN sys.types ty
    ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.extended_properties tbl_desc
    ON tbl_desc.major_id = t.object_id
   AND tbl_desc.minor_id = 0
   AND tbl_desc.name = N'MS_Description'
LEFT JOIN sys.extended_properties col_desc
    ON col_desc.major_id = c.object_id
   AND col_desc.minor_id = c.column_id
   AND col_desc.name = N'MS_Description'
LEFT JOIN (
    SELECT
        ic.object_id,
        ic.column_id
    FROM sys.indexes i
    JOIN sys.index_columns ic
        ON ic.object_id = i.object_id
       AND ic.index_id = i.index_id
    WHERE i.is_primary_key = 1
) pk_cols
    ON pk_cols.object_id = c.object_id
   AND pk_cols.column_id = c.column_id
WHERE t.is_ms_shipped = 0;
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Source view for syncing SQL Server schema/table/column metadata and MS_Description values into ais.t_ai_schema_catalog.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'VIEW',@level1name=N'v_ai_schema_metadata_source'
GO

-- =============================================================================
-- View: ais.v_ai_schema_relation_source
-- Purpose: Source query for foreign-key relation sync service.
-- =============================================================================
CREATE OR ALTER VIEW [ais].[v_ai_schema_relation_source]
AS
SELECT
    fk.name AS foreign_key_name,
    parent_schema.name AS parent_schema_name,
    parent_table.name AS parent_table_name,
    parent_column.name AS parent_column_name,
    referenced_schema.name AS referenced_schema_name,
    referenced_table.name AS referenced_table_name,
    referenced_column.name AS referenced_column_name,
    CAST(fk_desc.value AS NVARCHAR(MAX)) AS relation_description,
    fk.object_id,
    fkc.constraint_column_id
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc
    ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables parent_table
    ON parent_table.object_id = fkc.parent_object_id
JOIN sys.schemas parent_schema
    ON parent_schema.schema_id = parent_table.schema_id
JOIN sys.columns parent_column
    ON parent_column.object_id = fkc.parent_object_id
   AND parent_column.column_id = fkc.parent_column_id
JOIN sys.tables referenced_table
    ON referenced_table.object_id = fkc.referenced_object_id
JOIN sys.schemas referenced_schema
    ON referenced_schema.schema_id = referenced_table.schema_id
JOIN sys.columns referenced_column
    ON referenced_column.object_id = fkc.referenced_object_id
   AND referenced_column.column_id = fkc.referenced_column_id
LEFT JOIN sys.extended_properties fk_desc
    ON fk_desc.major_id = fk.object_id
   AND fk_desc.minor_id = 0
   AND fk_desc.name = N'MS_Description'
WHERE parent_table.is_ms_shipped = 0
  AND referenced_table.is_ms_shipped = 0;
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Source view for syncing SQL Server foreign-key metadata into ais.t_ai_schema_relation.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'VIEW',@level1name=N'v_ai_schema_relation_source'
GO

-- =============================================================================
-- Stored Procedure: ais.sp_sync_ai_schema_catalog
-- Purpose: Optional DB-side sync helper for schema metadata and relations.
-- The API service has the same sync logic; this procedure is useful for SQL Agent.
-- =============================================================================
CREATE OR ALTER PROCEDURE [ais].[sp_sync_ai_schema_catalog]
AS
BEGIN
    SET NOCOUNT ON;

    MERGE [ais].[t_ai_schema_catalog] AS target
    USING (
        SELECT
            [schema_name],
            [table_name],
            [table_description],
            [column_name],
            [column_description],
            [data_type],
            [max_length],
            [precision_value],
            [scale_value],
            [is_nullable],
            [is_primary_key],
            [is_identity],
            [object_id],
            [column_id],
            CONVERT(NVARCHAR(128), HASHBYTES('SHA2_256',
                CONCAT(
                    [schema_name], '|', [table_name], '|', ISNULL([table_description], ''),
                    '|', [column_name], '|', ISNULL([column_description], ''),
                    '|', [data_type], '|', [max_length], '|', [precision_value],
                    '|', [scale_value], '|', [is_nullable], '|', [is_primary_key], '|', [is_identity]
                )
            ), 2) AS [metadata_hash]
        FROM [ais].[v_ai_schema_metadata_source]
    ) AS source
    ON target.[schema_name] = source.[schema_name]
       AND target.[table_name] = source.[table_name]
       AND target.[column_name] = source.[column_name]
    WHEN MATCHED THEN
        UPDATE SET
            [table_description] = source.[table_description],
            [column_description] = source.[column_description],
            [data_type] = source.[data_type],
            [max_length] = source.[max_length],
            [precision_value] = source.[precision_value],
            [scale_value] = source.[scale_value],
            [is_nullable] = source.[is_nullable],
            [is_primary_key] = source.[is_primary_key],
            [is_identity] = source.[is_identity],
            [object_id] = source.[object_id],
            [column_id] = source.[column_id],
            [metadata_hash] = source.[metadata_hash],
                [last_synced_date] = GETDATE(),
            [is_active] = 1
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (
            [schema_name], [table_name], [table_description], [column_name],
            [column_description], [data_type], [max_length], [precision_value],
            [scale_value], [is_nullable], [is_primary_key], [is_identity],
            [object_id], [column_id], [metadata_hash], [last_synced_date], [is_active]
        )
        VALUES (
            source.[schema_name], source.[table_name], source.[table_description], source.[column_name],
            source.[column_description], source.[data_type], source.[max_length], source.[precision_value],
            source.[scale_value], source.[is_nullable], source.[is_primary_key], source.[is_identity],
            source.[object_id], source.[column_id], source.[metadata_hash], GETDATE(), 1
        );

    UPDATE target
    SET [is_active] = 0,
        [last_synced_date] = GETDATE()
    FROM [ais].[t_ai_schema_catalog] target
    WHERE NOT EXISTS (
        SELECT 1
        FROM [ais].[v_ai_schema_metadata_source] source
        WHERE source.[schema_name] = target.[schema_name]
          AND source.[table_name] = target.[table_name]
          AND source.[column_name] = target.[column_name]
    );

    MERGE [ais].[t_ai_schema_relation] AS target
    USING [ais].[v_ai_schema_relation_source] AS source
    ON target.[foreign_key_name] = source.[foreign_key_name]
       AND target.[parent_schema_name] = source.[parent_schema_name]
       AND target.[parent_table_name] = source.[parent_table_name]
       AND target.[parent_column_name] = source.[parent_column_name]
       AND target.[referenced_schema_name] = source.[referenced_schema_name]
       AND target.[referenced_table_name] = source.[referenced_table_name]
       AND target.[referenced_column_name] = source.[referenced_column_name]
    WHEN MATCHED THEN
        UPDATE SET
            [relation_description] = source.[relation_description],
            [object_id] = source.[object_id],
            [constraint_column_id] = source.[constraint_column_id],
                [last_synced_date] = GETDATE(),
            [is_active] = 1
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (
            [foreign_key_name], [parent_schema_name], [parent_table_name], [parent_column_name],
            [referenced_schema_name], [referenced_table_name], [referenced_column_name],
            [relation_description], [object_id], [constraint_column_id], [last_synced_date], [is_active]
        )
        VALUES (
            source.[foreign_key_name], source.[parent_schema_name], source.[parent_table_name], source.[parent_column_name],
            source.[referenced_schema_name], source.[referenced_table_name], source.[referenced_column_name],
                source.[relation_description], source.[object_id], source.[constraint_column_id], GETDATE(), 1
        );

    UPDATE target
    SET [is_active] = 0,
        [last_synced_date] = GETDATE()
    FROM [ais].[t_ai_schema_relation] target
    WHERE NOT EXISTS (
        SELECT 1
        FROM [ais].[v_ai_schema_relation_source] source
        WHERE source.[foreign_key_name] = target.[foreign_key_name]
          AND source.[parent_schema_name] = target.[parent_schema_name]
          AND source.[parent_table_name] = target.[parent_table_name]
          AND source.[parent_column_name] = target.[parent_column_name]
          AND source.[referenced_schema_name] = target.[referenced_schema_name]
          AND source.[referenced_table_name] = target.[referenced_table_name]
          AND source.[referenced_column_name] = target.[referenced_column_name]
    );
END
GO

PRINT 'BS-AI-KnowledgeBase schema migration completed.'
GO
