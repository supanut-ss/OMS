-- =============================================================================
-- BS-AI-Assistance: Add API Key column to ais.t_ai_provider_config
-- Description: Adds encrypted API key storage for AI providers.
-- Database: MyInventory (SQL Server)
-- Schema:   ais
-- =============================================================================

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ais')
BEGIN
    EXEC('CREATE SCHEMA [ais]')
END
GO

IF COL_LENGTH('ais.t_ai_provider_config', 'api_key') IS NULL
BEGIN
    ALTER TABLE [ais].[t_ai_provider_config]
        ADD [api_key] NVARCHAR(4000) NULL
    PRINT 'Added column: ais.t_ai_provider_config.api_key'
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.extended_properties ep
    WHERE ep.class_desc = 'OBJECT_OR_COLUMN'
      AND ep.major_id = OBJECT_ID(N'[ais].[t_ai_provider_config]')
      AND ep.minor_id = COLUMNPROPERTY(OBJECT_ID(N'[ais].[t_ai_provider_config]'), 'api_key', 'ColumnId')
      AND ep.name = N'MS_Description'
)
BEGIN
    EXEC sys.sp_addextendedproperty
        @name=N'MS_Description',
        @value=N'Encrypted AI provider API key. The assistant service decrypts this value at runtime before calling the provider.',
        @level0type=N'SCHEMA', @level0name=N'ais',
        @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
        @level2type=N'COLUMN', @level2name=N'api_key'
    PRINT 'Added extended property: ais.t_ai_provider_config.api_key'
END
GO

PRINT 'Migration complete: ais.t_ai_provider_config now supports encrypted API key storage'