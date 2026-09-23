SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF SCHEMA_ID(N'ais') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA [ais]');
END
GO

IF OBJECT_ID(N'ais.t_ai_embedding_provider_config', N'U') IS NULL
BEGIN
    CREATE TABLE [ais].[t_ai_embedding_provider_config] (
        [embedding_provider_config_id] INT IDENTITY(1,1) NOT NULL,
        [provider_name] NVARCHAR(100) NOT NULL,
        [base_url] NVARCHAR(500) NOT NULL,
        [embedding_endpoint] NVARCHAR(200) NOT NULL CONSTRAINT [DF_t_ai_embedding_provider_config_embedding_endpoint] DEFAULT N'/v1/embeddings',
        [embedding_model] NVARCHAR(200) NOT NULL,
        [api_key_env_name] NVARCHAR(100) NULL,
        [dimension] INT NOT NULL CONSTRAINT [DF_t_ai_embedding_provider_config_dimension] DEFAULT (384),
        [timeout_seconds] INT NOT NULL CONSTRAINT [DF_t_ai_embedding_provider_config_timeout_seconds] DEFAULT (60),
        [description] NVARCHAR(1000) NULL,
        [is_active] BIT NOT NULL CONSTRAINT [DF_t_ai_embedding_provider_config_is_active] DEFAULT (1),
        [create_by] NVARCHAR(100) NULL,
        [create_date] DATETIME NOT NULL CONSTRAINT [DF_t_ai_embedding_provider_config_create_date] DEFAULT (GETDATE()),
        [update_by] NVARCHAR(100) NULL,
        [update_date] DATETIME NULL,
        CONSTRAINT [PK_t_ai_embedding_provider_config] PRIMARY KEY CLUSTERED ([embedding_provider_config_id] ASC)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = N'UX_t_ai_embedding_provider_config_active'
      AND [object_id] = OBJECT_ID(N'ais.t_ai_embedding_provider_config')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_t_ai_embedding_provider_config_active]
        ON [ais].[t_ai_embedding_provider_config] ([is_active])
        WHERE [is_active] = 1;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [ais].[t_ai_embedding_provider_config]
    WHERE [provider_name] = N'local'
)
BEGIN
    INSERT INTO [ais].[t_ai_embedding_provider_config] (
        [provider_name],
        [base_url],
        [embedding_endpoint],
        [embedding_model],
        [api_key_env_name],
        [dimension],
        [timeout_seconds],
        [description],
        [is_active],
        [create_by]
    )
    VALUES (
        N'local',
        N'local',
        N'/v1/embeddings',
        N'bs-ai-local-hashing-v1',
        NULL,
        384,
        60,
        N'Local deterministic fallback embedding. Use this until an external OpenAI-compatible embedding provider is configured.',
        1,
        N'system'
    );
END
GO

IF OBJECT_ID(N'ais.t_ai_knowledge_chunk_token', N'U') IS NULL
BEGIN
    CREATE TABLE [ais].[t_ai_knowledge_chunk_token] (
        [knowledge_chunk_id] BIGINT NOT NULL,
        [token] NVARCHAR(128) NOT NULL,
        [token_weight] DECIMAL(9,4) NOT NULL CONSTRAINT [DF_t_ai_knowledge_chunk_token_token_weight] DEFAULT (1),
        [create_date] DATETIME NOT NULL CONSTRAINT [DF_t_ai_knowledge_chunk_token_create_date] DEFAULT (GETDATE()),
        CONSTRAINT [PK_t_ai_knowledge_chunk_token] PRIMARY KEY CLUSTERED ([token] ASC, [knowledge_chunk_id] ASC),
        CONSTRAINT [FK_t_ai_knowledge_chunk_token_chunk] FOREIGN KEY ([knowledge_chunk_id])
            REFERENCES [ais].[t_ai_knowledge_chunk] ([knowledge_chunk_id])
            ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = N'IX_t_ai_knowledge_chunk_token_chunk'
      AND [object_id] = OBJECT_ID(N'ais.t_ai_knowledge_chunk_token')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_t_ai_knowledge_chunk_token_chunk]
        ON [ais].[t_ai_knowledge_chunk_token] ([knowledge_chunk_id]);
END
GO

IF OBJECT_ID(N'ais.t_ai_knowledge_chunk_token', N'U') IS NOT NULL
BEGIN
    INSERT INTO [ais].[t_ai_knowledge_chunk_token] (
        [knowledge_chunk_id],
        [token],
        [token_weight]
    )
    SELECT
        c.[knowledge_chunk_id],
        v.[value] AS [token],
        COUNT_BIG(*) AS [token_weight]
    FROM [ais].[t_ai_knowledge_chunk] c
    CROSS APPLY STRING_SPLIT(
        LOWER(
            TRANSLATE(
                CAST(c.[embedding_text] AS NVARCHAR(MAX)),
                N'.,;:!?()[]{}"''/\|+=*-_@#$%^&~`' + CHAR(9) + CHAR(10) + CHAR(13),
                REPLICATE(N' ', 37)
            )
        ),
        N' '
    ) v
    WHERE c.[is_active] = 1
      AND LEN(v.[value]) BETWEEN 2 AND 128
      AND NOT EXISTS (
            SELECT 1
            FROM [ais].[t_ai_knowledge_chunk_token] existing
            WHERE existing.[knowledge_chunk_id] = c.[knowledge_chunk_id]
              AND existing.[token] = v.[value]
      )
    GROUP BY c.[knowledge_chunk_id], v.[value];
END
GO

DECLARE @Descriptions TABLE (
    [schema_name] SYSNAME,
    [table_name] SYSNAME,
    [column_name] SYSNAME NULL,
    [description] NVARCHAR(4000)
);

INSERT INTO @Descriptions ([schema_name], [table_name], [column_name], [description])
VALUES
    (N'ais', N't_ai_embedding_provider_config', NULL, N'Embedding provider configuration for AI KnowledgeBase vector generation. Stores OpenAI-compatible endpoint settings without storing raw secret values.'),
    (N'ais', N't_ai_embedding_provider_config', N'provider_name', N'Embedding provider type/name, for example local, openai, azure_openai, ollama, or any OpenAI-compatible service.'),
    (N'ais', N't_ai_embedding_provider_config', N'base_url', N'Base URL for the embedding provider.'),
    (N'ais', N't_ai_embedding_provider_config', N'embedding_endpoint', N'Provider endpoint path used to create embeddings.'),
    (N'ais', N't_ai_embedding_provider_config', N'embedding_model', N'Embedding model name sent to the provider.'),
    (N'ais', N't_ai_embedding_provider_config', N'api_key_env_name', N'Environment variable or configuration key that contains the provider API key. Raw keys are not stored in this table.'),
    (N'ais', N't_ai_embedding_provider_config', N'dimension', N'Expected vector dimension for the configured embedding model.'),
    (N'ais', N't_ai_embedding_provider_config', N'timeout_seconds', N'Embedding request timeout in seconds.'),
    (N'ais', N't_ai_knowledge_chunk_token', NULL, N'Production-scale inverted token index for fast prefiltering before vector similarity scoring.'),
    (N'ais', N't_ai_knowledge_chunk_token', N'knowledge_chunk_id', N'Knowledge chunk that owns this token.'),
    (N'ais', N't_ai_knowledge_chunk_token', N'token', N'Normalized searchable token extracted from chunk text.'),
    (N'ais', N't_ai_knowledge_chunk_token', N'token_weight', N'Frequency/weight of this token inside the chunk.');

DECLARE @schema SYSNAME, @table SYSNAME, @column SYSNAME, @description NVARCHAR(4000);

DECLARE description_cursor CURSOR LOCAL FAST_FORWARD FOR
SELECT [schema_name], [table_name], [column_name], [description]
FROM @Descriptions;

OPEN description_cursor;
FETCH NEXT FROM description_cursor INTO @schema, @table, @column, @description;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF @column IS NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM sys.extended_properties ep
            JOIN sys.tables t ON ep.major_id = t.object_id
            JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE ep.[name] = N'MS_Description'
              AND s.[name] = @schema
              AND t.[name] = @table
              AND ep.minor_id = 0
        )
            EXEC sys.sp_updateextendedproperty
                @name = N'MS_Description',
                @value = @description,
                @level0type = N'SCHEMA', @level0name = @schema,
                @level1type = N'TABLE', @level1name = @table;
        ELSE
            EXEC sys.sp_addextendedproperty
                @name = N'MS_Description',
                @value = @description,
                @level0type = N'SCHEMA', @level0name = @schema,
                @level1type = N'TABLE', @level1name = @table;
    END
    ELSE
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM sys.extended_properties ep
            JOIN sys.tables t ON ep.major_id = t.object_id
            JOIN sys.schemas s ON t.schema_id = s.schema_id
            JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = ep.minor_id
            WHERE ep.[name] = N'MS_Description'
              AND s.[name] = @schema
              AND t.[name] = @table
              AND c.[name] = @column
        )
            EXEC sys.sp_updateextendedproperty
                @name = N'MS_Description',
                @value = @description,
                @level0type = N'SCHEMA', @level0name = @schema,
                @level1type = N'TABLE', @level1name = @table,
                @level2type = N'COLUMN', @level2name = @column;
        ELSE
            EXEC sys.sp_addextendedproperty
                @name = N'MS_Description',
                @value = @description,
                @level0type = N'SCHEMA', @level0name = @schema,
                @level1type = N'TABLE', @level1name = @table,
                @level2type = N'COLUMN', @level2name = @column;
    END

    FETCH NEXT FROM description_cursor INTO @schema, @table, @column, @description;
END

CLOSE description_cursor;
DEALLOCATE description_cursor;
GO
