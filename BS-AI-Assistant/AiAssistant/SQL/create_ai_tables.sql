-- =============================================================================
-- BS-AI-Assistance: Database Schema Migration
-- Description: Creates the AI System (ais) schema and related tables
-- Database: MyInventory (SQL Server)
-- =============================================================================

-- Create schema if not exists
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ais')
BEGIN
    EXEC('CREATE SCHEMA [ais]')
END
GO

-- =============================================================================
-- Table 1: ais.t_ai_system_prompt
-- Purpose: Global AI system prompts (rules and guidelines shared across all pages)
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_system_prompt]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_system_prompt] (
        [system_prompt_id]  INT IDENTITY(1,1) PRIMARY KEY,
        [prompt_name]       NVARCHAR(200)   NOT NULL,
        [system_prompt]     NVARCHAR(MAX)   NOT NULL,
        [description]       NVARCHAR(500)   NULL,
        [is_active]         BIT             NOT NULL DEFAULT 1,
        [created_by]        NVARCHAR(100)   NULL,
        [created_date]      DATETIME        NOT NULL DEFAULT GETDATE(),
        [updated_by]        NVARCHAR(100)   NULL,
        [updated_date]      DATETIME        NULL
    )
    PRINT 'Created table: ais.t_ai_system_prompt'
END
GO

-- Extended Properties: ais.t_ai_system_prompt
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Global AI system prompts defining rules, behavior, and scope for the AI Database Assistant. Shared across all pages unless overridden by a page-specific config.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Primary Key. Auto-increment unique identifier for each system prompt record. Referenced by t_ai_page_config and t_ai_chat_log.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'system_prompt_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'A short unique name for referencing this prompt, e.g. ''default'', ''inventory'', ''sales''. Used to look up and identify the prompt programmatically.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'prompt_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The full text of the system prompt sent to the AI on every request. Defines the AI''s role, restrictions (SELECT only), output format (JSON), and response language rules.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'system_prompt'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Human-readable description explaining the purpose and usage of this system prompt. Intended for administrators to understand the prompt without reading its full content.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'description'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Indicates whether this system prompt is currently active. 1 = Active (in use), 0 = Inactive (disabled). The system always selects the prompt where is_active = 1.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The user ID or system identifier who created this record, e.g. ''system'', ''admin'', or an employee code. Used for audit trail.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'created_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The date and time when this record was created. Defaults to the current server date/time (GETDATE()).' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'created_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The user ID or system identifier who last modified this record. NULL if the record has never been updated.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'updated_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The date and time when this record was last modified. NULL if the record has never been updated.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_system_prompt', @level2type=N'COLUMN',@level2name=N'updated_date'
GO

-- =============================================================================
-- Table 2: ais.t_ai_page_config
-- Purpose: Page-specific sub-system prompts mapped by process path
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_page_config]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_page_config] (
        [ai_config_id]      INT IDENTITY(1,1) PRIMARY KEY,
        [process]           NVARCHAR(200)   NOT NULL,
        [page_name]         NVARCHAR(200)   NOT NULL,
        [sub_system_prompt] NVARCHAR(MAX)   NOT NULL,
        [allowed_tables]    NVARCHAR(MAX)   NULL,
        [allowed_columns]   NVARCHAR(MAX)   NULL,
        [sample_queries]    NVARCHAR(MAX)   NULL,
        [system_prompt_id]  INT             NULL,
        [is_active]         BIT             NOT NULL DEFAULT 1,
        [created_by]        NVARCHAR(100)   NULL,
        [created_date]      DATETIME        NOT NULL DEFAULT GETDATE(),
        [updated_by]        NVARCHAR(100)   NULL,
        [updated_date]      DATETIME        NULL,

        CONSTRAINT [FK_ai_page_config_system_prompt]
            FOREIGN KEY ([system_prompt_id])
            REFERENCES [ais].[t_ai_system_prompt]([system_prompt_id])
    )

    -- Index: Unique lookup per active process path
    CREATE UNIQUE NONCLUSTERED INDEX [IX_ai_page_config_process]
        ON [ais].[t_ai_page_config]([process])
        WHERE [is_active] = 1

    PRINT 'Created table: ais.t_ai_page_config'
END
GO

-- Extended Properties: ais.t_ai_page_config
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Page-specific AI configuration that provides contextual sub-system prompts, table access restrictions, and sample SQL queries for each application page.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Primary Key. Auto-increment unique identifier for each page AI configuration record. Referenced by t_ai_chat_log.ai_config_id.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'ai_config_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The URL path of the application page this config applies to, e.g. ''/dashboard'', ''/inventory/item''. Used as the lookup key when the AI is invoked from a specific page. Must be unique among active records.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'process'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Display name of the application page, e.g. ''Dashboard'', ''Stock Management''. Included in the AI prompt context so the AI knows which page it is operating on.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'page_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Additional context prompt appended after the global system prompt for this specific page. Describes the page purpose, relevant tables, and data scope to help the AI generate accurate responses.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'sub_system_prompt'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'JSON array of table names the AI is permitted to query on this page, e.g. ["dbo.t_item","dbo.t_stock"]. NULL means no table restriction (governed by global system prompt rules only).' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'allowed_tables'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'JSON array defining permitted columns per table, e.g. [{"table":"dbo.t_item","columns":["item_code","item_name"]}]. NULL means no column restriction. Used to prevent exposure of sensitive fields.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'allowed_columns'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'JSON array of example SQL query templates for this page, e.g. [{"desc":"Stock on hand","sql":"SELECT ..."}]. Provided to the AI as few-shot examples to improve query accuracy against the actual schema.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'sample_queries'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Foreign Key referencing t_ai_system_prompt.system_prompt_id. Specifies which global system prompt this page config is paired with. NULL defaults to the first active system prompt.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'system_prompt_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Indicates whether this page configuration is currently active. 1 = Active, 0 = Inactive. Only active configs are returned during page lookup (enforced by unique filtered index).' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The user ID or system identifier who created this record. Used for audit trail.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'created_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The date and time when this record was created. Defaults to the current server date/time (GETDATE()).' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'created_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The user ID or system identifier who last modified this record. NULL if the record has never been updated.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'updated_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The date and time when this record was last modified. NULL if the record has never been updated.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_page_config', @level2type=N'COLUMN',@level2name=N'updated_date'
GO

-- =============================================================================
-- Table 3: ais.t_ai_chat_log
-- Purpose: Complete audit log of all AI interactions
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ais].[t_ai_chat_log]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ais].[t_ai_chat_log] (
        [ai_chat_log_id]                  BIGINT IDENTITY(1,1) PRIMARY KEY,

        -- Context
        [process]             NVARCHAR(200)   NOT NULL,
        [user_id]             NVARCHAR(100)   NOT NULL,

        -- Conversation
        [user_message]        NVARCHAR(MAX)   NOT NULL,
        [ai_response]         NVARCHAR(MAX)   NULL,

        -- AI Decision Trace
        [system_prompt_id]    INT             NULL,
        [ai_config_id]        INT             NULL,
        [ai_decision]         NVARCHAR(50)    NULL,
        [generated_sql]       NVARCHAR(MAX)   NULL,

        -- Resource Consumption
        [prompt_tokens]       INT             NULL DEFAULT 0,
        [completion_tokens]   INT             NULL DEFAULT 0,
        [total_tokens]        INT             NULL DEFAULT 0,
        [processing_time_ms]  BIGINT          NULL DEFAULT 0,

        -- System Health
        [is_success]          BIT             NOT NULL DEFAULT 1,
        [error_message]       NVARCHAR(MAX)   NULL,

        -- Metadata
        [model_name]          NVARCHAR(200)   NULL,
        [created_date]        DATETIME        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT [FK_chat_log_system_prompt]
            FOREIGN KEY ([system_prompt_id])
            REFERENCES [ais].[t_ai_system_prompt]([system_prompt_id]),
        CONSTRAINT [FK_chat_log_ai_page_config]
            FOREIGN KEY ([ai_config_id])
            REFERENCES [ais].[t_ai_page_config]([ai_config_id])
    )

    CREATE NONCLUSTERED INDEX [IX_chat_log_process]      ON [ais].[t_ai_chat_log]([process])
    CREATE NONCLUSTERED INDEX [IX_chat_log_user_id]      ON [ais].[t_ai_chat_log]([user_id])
    CREATE NONCLUSTERED INDEX [IX_chat_log_created_date] ON [ais].[t_ai_chat_log]([created_date] DESC)
    CREATE NONCLUSTERED INDEX [IX_chat_log_ai_decision]  ON [ais].[t_ai_chat_log]([ai_decision])

    PRINT 'Created table: ais.t_ai_chat_log'
END
GO

-- Extended Properties: ais.t_ai_chat_log
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Complete audit log of all AI interactions. Records every user request and AI response along with decision tracing, token consumption, and performance metrics for monitoring, debugging, and billing purposes.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Primary Key. Auto-increment unique identifier for each chat log record. Uses BIGINT to support high-volume logging without overflow.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'ai_chat_log_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The URL path of the page where the user submitted the AI request, e.g. ''/dashboard''. Used to filter logs by module or page for analytics and troubleshooting.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'process'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The identifier of the user who submitted the request, e.g. employee code or username. Used to track per-user AI usage and for access auditing.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'user_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The raw question or instruction submitted by the user to the AI. Stored exactly as received, before any processing or prompt augmentation.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'user_message'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The natural language response returned by the AI to the user. NULL if an error occurred before a response was received from the AI API.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'ai_response'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Foreign Key referencing t_ai_system_prompt.system_prompt_id. Records which global system prompt version was active during this interaction, enabling prompt versioning audit.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'system_prompt_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Foreign Key referencing t_ai_page_config.ai_config_id. Records which page configuration was used in this interaction. NULL if no matching page config was found (fallback to system prompt only).' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'ai_config_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The AI routing decision for this request. BYPASS_SQL = AI answered directly from its knowledge without querying the database. GENERATE_SQL = AI generated a SQL query to retrieve data from the database.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'ai_decision'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The SQL SELECT statement generated by the AI for this request. Populated only when ai_decision = ''GENERATE_SQL''. NULL for BYPASS_SQL decisions or when SQL generation failed.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'generated_sql'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Number of tokens consumed by the input prompt sent to the AI API. Used for cost tracking and billing analysis.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'prompt_tokens'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Number of tokens consumed by the AI response (completion). Used for cost tracking and billing analysis.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'completion_tokens'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Total tokens consumed = prompt_tokens + completion_tokens. Used for monthly per-user cost summaries and AI budget monitoring.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'total_tokens'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Total end-to-end processing time in milliseconds, measured from receiving the user request to returning the AI response. Used for performance monitoring and SLA tracking.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'processing_time_ms'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Indicates whether this AI interaction completed successfully. 1 = Success, 0 = Failed. Used to calculate error rates and trigger alerts when failure rates exceed thresholds.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'is_success'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Detailed error message when is_success = 0. Contains exception message, API error code, or validation failure reason. NULL when the interaction was successful.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'error_message'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The AI model identifier used to process this request, e.g. ''google/gemini-2.0-flash-001''. Used to compare quality and cost across different model versions.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'model_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The server date and time when this log record was created. Defaults to GETDATE(). Used for time-based filtering, reporting, and log retention policies.' , @level0type=N'SCHEMA',@level0name=N'ais', @level1type=N'TABLE',@level1name=N't_ai_chat_log', @level2type=N'COLUMN',@level2name=N'created_date'
GO

-- =============================================================================
-- Seed Data: Default System Prompt
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM [ais].[t_ai_system_prompt] WHERE [prompt_name] = 'default')
BEGIN
    INSERT INTO [ais].[t_ai_system_prompt] ([prompt_name], [system_prompt], [description], [is_active], [created_by])
    VALUES (
        'default',
        N'You are an AI Database Assistant for the MyInventory enterprise system. Your role is to help users query and understand data from the SQL Server database.

## Core Rules:
1. You MUST respond in the same language as the user''s question.
2. You can ONLY generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, or any data modification queries.
3. Always use TOP clause to limit results (maximum 1000 rows).
4. When generating SQL, always include clear column aliases for readability.
5. Format numbers with commas for readability in your response.
6. If you can answer the question directly from context without querying the database, do so (BYPASS_SQL).
7. If you need data from the database, generate the appropriate SQL query (GENERATE_SQL).

## Response Format:
You must respond in the following JSON format:
```json
{
  "decision": "BYPASS_SQL" or "GENERATE_SQL",
  "sql": "SELECT ... (only if GENERATE_SQL)",
  "response": "Your natural language response to the user"
}
```

## Important:
- Always consider the page context (sub-system prompt) to scope your queries appropriately.
- If the user asks something outside your scope, politely decline and explain what you can help with.
- Summarize data in a clear, easy-to-understand format.',
        N'Default global system prompt for AI Database Assistant',
        1,
        'system'
    )
    PRINT 'Inserted default system prompt'
END
GO

-- =============================================================================
-- Seed Data: Sample Page Config
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM [ais].[t_ai_page_config] WHERE [process] = '/dashboard')
BEGIN
    INSERT INTO [ais].[t_ai_page_config] ([process], [page_name], [sub_system_prompt], [system_prompt_id], [is_active], [created_by])
    VALUES (
        '/dashboard',
        'Dashboard',
        N'You are currently on the Dashboard page. You can help users with:
- Summary statistics and KPIs
- General data overview queries
- Cross-module data analysis

Available tables and their purposes:
- Use appropriate tables based on the user''s question context.
- Always provide summary/aggregate data when possible.',
        (SELECT TOP 1 [system_prompt_id] FROM [ais].[t_ai_system_prompt] WHERE [prompt_name] = 'default'),
        1,
        'system'
    )
    PRINT 'Inserted sample page config for /dashboard'
END
GO

PRINT '=== AI Database Assistant schema migration completed ==='
GO
