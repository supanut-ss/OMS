-- =============================================================================
-- BS-AI-Assistance: Knowledge Base Field Descriptions
-- Description: Adds or updates MS_Description for all columns created by
--              create_ai_knowledge_base.sql.
-- =============================================================================

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [ais].[sp_upsert_column_description]
    @table_name SYSNAME,
    @column_name SYSNAME,
    @description NVARCHAR(4000)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM sys.extended_properties ep
        JOIN sys.tables t
            ON t.object_id = ep.major_id
        JOIN sys.schemas s
            ON s.schema_id = t.schema_id
        JOIN sys.columns c
            ON c.object_id = t.object_id
           AND c.column_id = ep.minor_id
        WHERE s.name = N'ais'
          AND t.name = @table_name
          AND c.name = @column_name
          AND ep.name = N'MS_Description'
    )
    BEGIN
        EXEC sys.sp_updateextendedproperty
            @name = N'MS_Description',
            @value = @description,
            @level0type = N'SCHEMA', @level0name = N'ais',
            @level1type = N'TABLE',  @level1name = @table_name,
            @level2type = N'COLUMN', @level2name = @column_name;
    END
    ELSE IF COL_LENGTH(N'ais.' + @table_name, @column_name) IS NOT NULL
    BEGIN
        EXEC sys.sp_addextendedproperty
            @name = N'MS_Description',
            @value = @description,
            @level0type = N'SCHEMA', @level0name = N'ais',
            @level1type = N'TABLE',  @level1name = @table_name,
            @level2type = N'COLUMN', @level2name = @column_name;
    END
END
GO

-- ais.t_ai_knowledge_document
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'knowledge_document_id', N'Primary Key. Auto-increment unique identifier for each knowledge source document.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'doc_type', N'Knowledge document type such as system_overview, process, schema, api, business_rule, faq, error_code, or ui_page.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'title', N'Human-readable title of the source document used by administrators and retrieval previews.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'content', N'Full source content before chunking. Can contain process notes, API details, business rules, FAQ content, or generated schema summaries.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'process', N'Optional UI process/page path this document applies to, e.g. /master/item. NULL means global knowledge.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'module_name', N'Optional module or subsystem name used for filtering and organizing knowledge.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'schema_name', N'Optional database schema name when this document is related to a specific table or schema.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'table_name', N'Optional database table name when this document is related to a specific table.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'source_path', N'Original source path or identifier, such as a markdown file path, API route, or generated schema source.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'source_version', N'Optional source version, release tag, document version, or schema version.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'source_hash', N'Hash of the source content used to detect changes and avoid unnecessary re-ingestion.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'language_code', N'Language code of the document content, e.g. th-TH or en-US.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'is_generated', N'Indicates whether this document was generated automatically by a sync/ingestion process. 1 = generated, 0 = manually curated.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'is_active', N'Indicates whether this document is active and can be used for retrieval. 1 = Active, 0 = Inactive.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'create_by', N'User ID or system identifier that created this knowledge document record.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'create_date', N'Date and time when this knowledge document record was created. Defaults to GETDATE().';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'update_by', N'User ID or system identifier that last updated this knowledge document record.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_document', N'update_date', N'Date and time when this knowledge document record was last updated.';
GO

-- ais.t_ai_knowledge_chunk
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'knowledge_chunk_id', N'Primary Key. Auto-increment unique identifier for each searchable knowledge chunk.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'knowledge_document_id', N'Foreign Key referencing t_ai_knowledge_document. Identifies the source document this chunk belongs to.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'chunk_index', N'Zero-based or one-based sequence number of this chunk within its source document.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'chunk_title', N'Optional title or heading for this chunk, often derived from markdown headings or schema section names.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'chunk_content', N'Original chunk text that can be injected into an AI prompt after retrieval.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'embedding_text', N'Text normalized for embedding generation. May include metadata plus chunk content for better retrieval quality.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'embedding_provider', N'Embedding provider name used to generate this chunk vector, such as OpenAI, AzureOpenAI, Ollama, or local.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'embedding_model', N'Embedding model name used for this chunk.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'embedding_dimension', N'Number of vector dimensions produced by the embedding model.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'embedding_json', N'Portable JSON representation of the embedding vector. Can be replaced or supplemented by a native vector column later.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'content_hash', N'Hash of the chunk content used to detect content changes and decide whether re-embedding is needed.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'token_count', N'Estimated token count for this chunk, used for prompt budgeting and retrieval tuning.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'is_embedded', N'Indicates whether this chunk has a current embedding. 1 = embedded, 0 = embedding pending.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'is_active', N'Indicates whether this chunk is active and can be retrieved. 1 = Active, 0 = Inactive.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'create_date', N'Date and time when this chunk record was created. Defaults to GETDATE().';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_chunk', N'update_date', N'Date and time when this chunk record was last updated.';
GO

-- ais.t_ai_schema_catalog
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'schema_catalog_id', N'Primary Key. Auto-increment unique identifier for each synced table-column metadata record.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'schema_name', N'Database schema name of the source table, e.g. dbo, ais, inv.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'table_name', N'Database table name of the source column.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'table_description', N'Table description read from SQL Server MS_Description extended property at table level.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'column_name', N'Database column name.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'column_description', N'Column description read from SQL Server MS_Description extended property at column level.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'data_type', N'SQL Server data type of the source column.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'max_length', N'Maximum length from sys.columns. For Unicode types, SQL Server stores byte length.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'precision_value', N'Numeric precision from sys.columns.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'scale_value', N'Numeric scale from sys.columns.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'is_nullable', N'Indicates whether the source column allows NULL. 1 = Nullable, 0 = Required.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'is_primary_key', N'Indicates whether the source column is part of a primary key. 1 = Primary key column, 0 = Not primary key.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'is_identity', N'Indicates whether the source column is an identity column.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'object_id', N'SQL Server object_id of the source table at the time of sync.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'column_id', N'SQL Server column_id of the source column at the time of sync.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'metadata_hash', N'Hash of synced metadata used to detect changes in table/column definition or description.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'last_synced_date', N'Date and time when this schema metadata record was last synced. Defaults to GETDATE().';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_catalog', N'is_active', N'Indicates whether this metadata record still exists in the source schema. 1 = Active, 0 = Removed or inactive.';
GO

-- ais.t_ai_schema_relation
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'schema_relation_id', N'Primary Key. Auto-increment unique identifier for each synced foreign-key relation record.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'foreign_key_name', N'Foreign key constraint name from SQL Server metadata.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'parent_schema_name', N'Schema name of the table that owns the foreign key column.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'parent_table_name', N'Table name that owns the foreign key column.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'parent_column_name', N'Column name that references another table.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'referenced_schema_name', N'Schema name of the referenced table.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'referenced_table_name', N'Table name referenced by the foreign key.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'referenced_column_name', N'Column name referenced by the foreign key.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'relation_description', N'Optional relation description read from MS_Description on the foreign key constraint.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'object_id', N'SQL Server object_id of the foreign key constraint.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'constraint_column_id', N'Column sequence number within the foreign key constraint.';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'last_synced_date', N'Date and time when this relation metadata record was last synced. Defaults to GETDATE().';
EXEC [ais].[sp_upsert_column_description] N't_ai_schema_relation', N'is_active', N'Indicates whether this relation still exists in the source schema. 1 = Active, 0 = Removed or inactive.';
GO

-- ais.t_ai_knowledge_retrieval_log
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'knowledge_retrieval_log_id', N'Primary Key. Auto-increment unique identifier for each RAG retrieval audit row.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'ai_chat_log_id', N'Optional Foreign Key referencing t_ai_chat_log. Links retrieved context to the chat interaction when available.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'knowledge_chunk_id', N'Optional Foreign Key referencing t_ai_knowledge_chunk when a manual/generated knowledge chunk was retrieved.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'schema_catalog_id', N'Optional Foreign Key referencing t_ai_schema_catalog when a schema column context row was retrieved.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'schema_relation_id', N'Optional Foreign Key referencing t_ai_schema_relation when a relation context row was retrieved.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'retrieval_mode', N'Retrieval mode used for this row, such as keyword, vector, hybrid, schema, or relation.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'similarity_score', N'Optional retrieval similarity or relevance score. Higher values indicate stronger relevance.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'rank_order', N'Rank order of the retrieved item within the context set sent to the AI.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'process', N'UI process/page path used during retrieval, e.g. /master/item.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'query_text', N'User query or normalized retrieval query used to search the knowledge base.';
EXEC [ais].[sp_upsert_column_description] N't_ai_knowledge_retrieval_log', N'create_date', N'Date and time when this retrieval audit row was created. Defaults to GETDATE().';
GO

DROP PROCEDURE [ais].[sp_upsert_column_description];
GO

PRINT 'KnowledgeBase field descriptions added or updated successfully.';
GO
