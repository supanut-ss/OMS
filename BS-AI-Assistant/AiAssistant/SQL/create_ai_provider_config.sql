-- =============================================================================
-- BS-AI-Assistance: AI Provider Configuration Tables
-- Description: Stores AI model provider settings (BaseUrl, ChatEndpoint, model 
--              priority list) in the database so they can be changed at runtime
--              without rebuilding the API.
-- Database: MyInventory (SQL Server)
-- Schema:   ais
-- Note:     API Key is stored encrypted in the database and decrypted by the assistant service.
-- =============================================================================

-- Ensure ais schema exists
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ais')
BEGIN
    EXEC('CREATE SCHEMA [ais]')
END
GO

-- =============================================================================
-- Table 1: ais.t_ai_provider_config
-- Purpose: One active row per provider (OpenRouter / Ollama / Azure OpenAI, etc.)
--          Stores the base URL, chat endpoint path, API key, and HTTP timeout.
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects 
               WHERE object_id = OBJECT_ID(N'[ais].[t_ai_provider_config]') AND type = N'U')
BEGIN
    CREATE TABLE [ais].[t_ai_provider_config] (
        [provider_config_id]  INT            IDENTITY(1,1) NOT NULL,
        [provider_name]       NVARCHAR(100)  NOT NULL,
        [base_url]            NVARCHAR(500)  NOT NULL,
        [chat_endpoint]       NVARCHAR(200)  NOT NULL  DEFAULT '/api/v1/chat/completions',
        [api_key]             NVARCHAR(4000) NULL,
        [timeout_seconds]     INT            NOT NULL  DEFAULT 60,
        [is_active]           BIT            NOT NULL  DEFAULT 1,
        [create_by]           NVARCHAR(100)  NULL,
        [create_date]         DATETIME       NOT NULL  DEFAULT GETDATE(),
        [update_by]           NVARCHAR(100)  NULL,
        [update_date]         DATETIME       NULL,
        CONSTRAINT [PK_ai_provider_config] PRIMARY KEY CLUSTERED ([provider_config_id] ASC)
    )
    PRINT 'Created table: ais.t_ai_provider_config'
END
GO

-- =============================================================================
-- Table 2: ais.t_ai_model_priority
-- Purpose: Ordered list of models to try per provider. The service tries models
--          in priority_order ASC and falls back on 429 / 500 / 503 / timeout.
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects 
               WHERE object_id = OBJECT_ID(N'[ais].[t_ai_model_priority]') AND type = N'U')
BEGIN
    CREATE TABLE [ais].[t_ai_model_priority] (
        [model_id]            INT            IDENTITY(1,1) NOT NULL,
        [provider_config_id]  INT            NOT NULL,
        [model_name]          NVARCHAR(200)  NOT NULL,
        [priority_order]      INT            NOT NULL  DEFAULT 0,
        [is_active]           BIT            NOT NULL  DEFAULT 1,
        [create_by]           NVARCHAR(100)  NULL,
        [create_date]         DATETIME       NOT NULL  DEFAULT GETDATE(),
        [update_by]           NVARCHAR(100)  NULL,
        [update_date]         DATETIME       NULL,
        CONSTRAINT [PK_ai_model_priority] PRIMARY KEY CLUSTERED ([model_id] ASC),
        CONSTRAINT [FK_ai_model_priority_provider_config]
            FOREIGN KEY ([provider_config_id])
            REFERENCES [ais].[t_ai_provider_config] ([provider_config_id])
    )
    PRINT 'Created table: ais.t_ai_model_priority'
END
GO

-- =============================================================================
-- Extended Properties: t_ai_provider_config
-- =============================================================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Stores AI provider settings (BaseUrl, ChatEndpoint, timeout) that control which AI service the assistant calls. Change rows here to switch providers at runtime without rebuilding the API. API Key is stored encrypted in the API key column.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Encrypted AI provider API key. The assistant service decrypts this value at runtime before calling the provider.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
    @level2type=N'COLUMN', @level2name=N'api_key'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Primary Key. Auto-increment unique identifier for each provider configuration record.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
    @level2type=N'COLUMN', @level2name=N'provider_config_id'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Display name of the provider, e.g. "OpenRouter", "Ollama", "Azure OpenAI". Used for logging and identification only.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
    @level2type=N'COLUMN', @level2name=N'provider_name'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Base URL of the AI provider. e.g. "https://openrouter.ai" or "http://localhost:11434" for Ollama. Do NOT include the path suffix.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
    @level2type=N'COLUMN', @level2name=N'base_url'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Relative path of the chat completions endpoint. OpenRouter: "/api/v1/chat/completions". Ollama: "/v1/chat/completions".',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
    @level2type=N'COLUMN', @level2name=N'chat_endpoint'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'HTTP request timeout in seconds for each model call. Default 60. Increase for slower local models like Ollama.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
    @level2type=N'COLUMN', @level2name=N'timeout_seconds'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Whether this provider configuration is active. 1 = Active (used by the service), 0 = Inactive. Only one active record is used at a time (first by provider_config_id ASC).',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
    @level2type=N'COLUMN', @level2name=N'is_active'
GO

-- =============================================================================
-- Extended Properties: t_ai_model_priority
-- =============================================================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Ordered list of AI models to try for a given provider. The service attempts models in priority_order ASC and falls back automatically on 429 / 500 / 503 / timeout errors.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_model_priority'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Primary Key. Auto-increment unique identifier for each model entry.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_model_priority',
    @level2type=N'COLUMN', @level2name=N'model_id'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Foreign Key to ais.t_ai_provider_config. Groups models under their parent provider.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_model_priority',
    @level2type=N'COLUMN', @level2name=N'provider_config_id'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Full model identifier string as expected by the provider API, e.g. "google/gemma-4-31b:free", "qwen/qwen3-coder:free", "llama3.2:latest" for Ollama.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_model_priority',
    @level2type=N'COLUMN', @level2name=N'model_name'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Determines the order in which models are tried. Lower number = tried first (primary). 0 = Primary, 1 = Fallback 1, 2 = Fallback 2, etc.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_model_priority',
    @level2type=N'COLUMN', @level2name=N'priority_order'
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description',
    @value=N'Whether this model is active. 0 = skip this model without deleting the record.',
    @level0type=N'SCHEMA', @level0name=N'ais',
    @level1type=N'TABLE',  @level1name=N't_ai_model_priority',
    @level2type=N'COLUMN', @level2name=N'is_active'
GO

-- =============================================================================
-- Seed Data: Default OpenRouter configuration
-- Run only if the table is empty to avoid duplicates.
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM [ais].[t_ai_provider_config])
BEGIN
    INSERT INTO [ais].[t_ai_provider_config]
        ([provider_name], [base_url], [chat_endpoint], [api_key], [timeout_seconds], [is_active], [create_by])
    VALUES
        ('OpenRouter', 'https://openrouter.ai', '/api/v1/chat/completions', NULL, 60, 1, 'system')

    DECLARE @configId INT = SCOPE_IDENTITY()

    INSERT INTO [ais].[t_ai_model_priority]
        ([provider_config_id], [model_name], [priority_order], [is_active], [create_by])
    VALUES
        (@configId, 'deepseek/deepseek-r1:free',              0, 1, 'system'),
        (@configId, 'google/gemma-3-27b-it:free',             1, 1, 'system'),
        (@configId, 'meta-llama/llama-3.3-70b-instruct:free', 2, 1, 'system'),
        (@configId, 'mistralai/mistral-7b-instruct:free',     3, 1, 'system'),
        (@configId, 'qwen/qwen3-coder:free',                  4, 1, 'system')

    PRINT 'Seeded default OpenRouter provider configuration.'
END
GO

-- =============================================================================
-- Example: Switch to Ollama (run manually when needed)
-- =============================================================================
/*
-- Deactivate OpenRouter
UPDATE [ais].[t_ai_provider_config] SET [is_active] = 0 WHERE [provider_name] = 'OpenRouter'

-- Insert Ollama config
INSERT INTO [ais].[t_ai_provider_config]
    ([provider_name], [base_url], [chat_endpoint], [api_key], [timeout_seconds], [is_active], [create_by])
VALUES
    ('Ollama', 'http://localhost:11434', '/v1/chat/completions', NULL, 120, 1, 'admin')

DECLARE @ollamaId INT = SCOPE_IDENTITY()
INSERT INTO [ais].[t_ai_model_priority]
    ([provider_config_id], [model_name], [priority_order], [is_active], [create_by])
VALUES
    (@ollamaId, 'llama3.2:latest', 0, 1, 'admin'),
    (@ollamaId, 'qwen2.5:7b',      1, 1, 'admin')
*/
GO
