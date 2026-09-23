-- =============================================================================
-- Migration: Update OpenRouter model names to currently-valid free models
-- Reason:    Several model IDs used in initial seed are no longer valid on
--            OpenRouter (e.g. google/gemma-4-31b:free returns HTTP 400
--            "not a valid model ID" as of May 2025).
-- Safe to run multiple times (MERGE / upsert pattern).
-- =============================================================================

DECLARE @configId INT

SELECT @configId = provider_config_id
FROM   [ais].[t_ai_provider_config] WITH (NOLOCK)
WHERE  provider_name = 'OpenRouter' AND is_active = 1

IF @configId IS NULL
BEGIN
    PRINT 'No active OpenRouter provider config found. Nothing to update.'
    RETURN
END

-- Deactivate all existing models for this provider so we start clean
UPDATE [ais].[t_ai_model_priority]
SET    is_active    = 0,
       update_by    = 'migration',
       update_date  = GETDATE()
WHERE  provider_config_id = @configId

-- Upsert current valid free models
-- Priority 0 = primary model; higher numbers = fallbacks
MERGE [ais].[t_ai_model_priority] AS target
USING (
    VALUES
        (@configId, 'deepseek/deepseek-r1:free',              0),
        (@configId, 'google/gemma-3-27b-it:free',             1),
        (@configId, 'meta-llama/llama-3.3-70b-instruct:free', 2),
        (@configId, 'mistralai/mistral-7b-instruct:free',     3),
        (@configId, 'qwen/qwen3-coder:free',                  4)
) AS src (provider_config_id, model_name, priority_order)
ON  target.provider_config_id = src.provider_config_id
AND target.model_name         = src.model_name
WHEN MATCHED THEN
    UPDATE SET
        priority_order = src.priority_order,
        is_active      = 1,
        update_by      = 'migration',
        update_date    = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (provider_config_id, model_name, priority_order, is_active, create_by)
    VALUES (src.provider_config_id, src.model_name, src.priority_order, 1, 'migration');

PRINT CONCAT('Updated models for provider_config_id = ', @configId, '. Rows affected: ', @@ROWCOUNT)
GO
