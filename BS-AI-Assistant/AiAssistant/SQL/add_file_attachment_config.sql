-- =============================================================================
-- BS-AI-Assistance: Add File Attachment Config to ais.t_ai_provider_config
-- Description: Adds allow_file_attachment and allowed_file_types columns so
--              the admin can control per-provider whether users may attach files
--              to AI chat messages, and which MIME types are accepted.
-- =============================================================================

-- ─── Column: allow_file_attachment ───────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[ais].[t_ai_provider_config]')
      AND name = 'allow_file_attachment'
)
BEGIN
    ALTER TABLE [ais].[t_ai_provider_config]
        ADD [allow_file_attachment] BIT NOT NULL DEFAULT 0
    PRINT 'Added column: allow_file_attachment'
END
GO

-- ─── Column: allowed_file_types ──────────────────────────────────────────────
-- Comma-separated MIME types. Empty = inherits from allow_file_attachment only.
-- Example: 'image/jpeg,image/png,image/gif,image/webp'
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[ais].[t_ai_provider_config]')
      AND name = 'allowed_file_types'
)
BEGIN
    ALTER TABLE [ais].[t_ai_provider_config]
        ADD [allowed_file_types] NVARCHAR(500) NULL DEFAULT 'image/jpeg,image/png,image/gif,image/webp'
    PRINT 'Added column: allowed_file_types'
END
GO

-- ─── Extended Properties ─────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID(N'[ais].[t_ai_provider_config]')
      AND minor_id = (
          SELECT column_id FROM sys.columns
          WHERE object_id = OBJECT_ID(N'[ais].[t_ai_provider_config]')
            AND name = 'allow_file_attachment')
      AND name = 'MS_Description'
)
BEGIN
    EXEC sys.sp_addextendedproperty
        @name=N'MS_Description',
        @value=N'Whether this provider supports multimodal (image/file) attachments in chat messages. Set to 1 only for vision-capable models (e.g. claude-3, gpt-4o, gemini-pro-vision).',
        @level0type=N'SCHEMA', @level0name=N'ais',
        @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
        @level2type=N'COLUMN', @level2name=N'allow_file_attachment'
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID(N'[ais].[t_ai_provider_config]')
      AND minor_id = (
          SELECT column_id FROM sys.columns
          WHERE object_id = OBJECT_ID(N'[ais].[t_ai_provider_config]')
            AND name = 'allowed_file_types')
      AND name = 'MS_Description'
)
BEGIN
    EXEC sys.sp_addextendedproperty
        @name=N'MS_Description',
        @value=N'Comma-separated list of allowed MIME types for file attachments. Used by the frontend to filter the file picker and by the backend to validate uploads. Example: image/jpeg,image/png,image/gif,image/webp. NULL or empty = use system default (images only).',
        @level0type=N'SCHEMA', @level0name=N'ais',
        @level1type=N'TABLE',  @level1name=N't_ai_provider_config',
        @level2type=N'COLUMN', @level2name=N'allowed_file_types'
END
GO

-- ─── Enable file attachment for existing active provider ─────────────────────
-- Uncomment and run manually to enable on production:
-- UPDATE [ais].[t_ai_provider_config]
-- SET    allow_file_attachment = 1,
--        allowed_file_types    = 'image/jpeg,image/png,image/gif,image/webp',
--        update_by             = 'migration',
--        update_date           = GETDATE()
-- WHERE  is_active = 1
-- GO

PRINT 'Migration complete: ais.t_ai_provider_config now supports file attachment config'
GO
