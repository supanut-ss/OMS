using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

public sealed class OverviewStatsService : IOverviewStatsService
{
    private readonly string _connectionString;
    private readonly ILogger<OverviewStatsService> _logger;

    public OverviewStatsService(IConfiguration configuration, ILogger<OverviewStatsService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _logger = logger;
    }

    public async Task<OverviewStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync(cancellationToken);

            // Run all count queries in a single round-trip via multi-query
            const string sql = """
                -- 1. Active chat provider + top priority model
                SELECT TOP 1
                    p.provider_name  AS ProviderName,
                    m.model_name     AS ModelName,
                    p.is_active      AS IsActive
                FROM [ais].[t_ai_provider_config] p
                LEFT JOIN [ais].[t_ai_model_priority] m
                    ON m.provider_config_id = p.provider_config_id AND m.is_active = 1
                WHERE p.is_active = 1
                ORDER BY p.provider_config_id ASC, m.priority_order ASC;

                -- 2. Active embedding provider
                SELECT TOP 1
                    provider_name    AS ProviderName,
                    embedding_model  AS EmbeddingModel,
                    is_active        AS IsActive
                FROM [ais].[t_ai_embedding_provider_config]
                WHERE is_active = 1
                ORDER BY embedding_provider_config_id ASC;

                -- 3. System prompt count
                SELECT COUNT(*)
                FROM [ais].[t_ai_system_prompt]
                WHERE is_active = 1;

                -- 4. Page config count
                SELECT COUNT(*)
                FROM [ais].[t_ai_page_config]
                WHERE is_active = 1;

                -- 5. Document, chunk, embedded chunk counts
                SELECT
                    (SELECT COUNT(*) FROM [ais].[t_ai_knowledge_document] WHERE is_active = 1) AS DocumentCount,
                    (SELECT COUNT(*) FROM [ais].[t_ai_knowledge_chunk]    WHERE is_active = 1) AS ChunkCount,
                    (SELECT COUNT(*) FROM [ais].[t_ai_knowledge_chunk]    WHERE is_active = 1 AND is_embedded = 1) AS EmbeddedChunkCount;

                -- 6. Schema stats
                SELECT
                    COUNT(DISTINCT table_name) AS TableCount,
                    COUNT(*)                   AS ColumnCount,
                    MAX(last_synced_date)       AS LastSyncDate
                FROM [ais].[t_ai_schema_catalog]
                WHERE is_active = 1;

                -- 7. Chat activity today and overall success rate (last 200 logs)
                SELECT
                    (SELECT COUNT(*) FROM [ais].[t_ai_chat_log]
                     WHERE CAST(create_date AS DATE) = CAST(GETDATE() AS DATE)) AS ChatToday,
                    (SELECT COUNT(*) FROM [ais].[t_ai_chat_log]) AS ChatTotal,
                    (SELECT CAST(SUM(CASE WHEN is_success = 1 THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(*), 0) * 100 AS DECIMAL(5,1))
                     FROM (SELECT TOP 200 is_success FROM [ais].[t_ai_chat_log] ORDER BY create_date DESC) recent) AS SuccessRate;

                -- 8. Recent 5 chat logs
                SELECT TOP 5
                    user_message      AS UserMessage,
                    model_name        AS ModelName,
                    is_success        AS IsSuccess,
                    processing_time_ms AS ProcessingTimeMs,
                    create_date       AS CreatedDate,
                    ai_decision       AS AiDecision
                FROM [ais].[t_ai_chat_log]
                ORDER BY create_date DESC;
                """;

            using var multi = await conn.QueryMultipleAsync(sql);

            var chatProvider = await multi.ReadFirstOrDefaultAsync<ChatProviderRow>();
            var embProvider = await multi.ReadFirstOrDefaultAsync<EmbeddingProviderRow>();
            var promptCount = await multi.ReadFirstAsync<int>();
            var pageConfigCount = await multi.ReadFirstAsync<int>();
            var knowledgeCounts = await multi.ReadFirstAsync<KnowledgeCounts>();
            var schemaCounts = await multi.ReadFirstAsync<SchemaCounts>();
            var chatActivity = await multi.ReadFirstAsync<ChatActivity>();
            var recentLogs = (await multi.ReadAsync<RecentChatLogItem>()).ToList();

            return new OverviewStatsResponse
            {
                Success = true,

                ChatProviderName = chatProvider?.ProviderName,
                ChatModelName = chatProvider?.ModelName,
                ChatProviderActive = chatProvider?.IsActive ?? false,

                EmbeddingProviderName = embProvider?.ProviderName,
                EmbeddingModel = embProvider?.EmbeddingModel,
                EmbeddingProviderActive = embProvider?.IsActive ?? false,

                SystemPromptCount = promptCount,
                PageConfigCount = pageConfigCount,

                DocumentCount = knowledgeCounts.DocumentCount,
                ChunkCount = knowledgeCounts.ChunkCount,
                EmbeddedChunkCount = knowledgeCounts.EmbeddedChunkCount,

                SchemaTableCount = schemaCounts.TableCount,
                SchemaColumnCount = schemaCounts.ColumnCount,
                LastSchemaSyncDate = schemaCounts.LastSyncDate,

                ChatToday = chatActivity.ChatToday,
                ChatTotal = chatActivity.ChatTotal,
                ChatSuccessRate = (double)(chatActivity.SuccessRate ?? 0),

                RecentLogs = recentLogs,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to gather overview stats");
            return new OverviewStatsResponse
            {
                Success = false,
                ErrorMessage = ex.Message,
            };
        }
    }

    // ── Internal result row types ────────────────────────────────────────────
    private sealed record ChatProviderRow(string? ProviderName, string? ModelName, bool IsActive);
    private sealed record EmbeddingProviderRow(string? ProviderName, string? EmbeddingModel, bool IsActive);
    private sealed record KnowledgeCounts(int DocumentCount, int ChunkCount, int EmbeddedChunkCount);
    private sealed record SchemaCounts(int TableCount, int ColumnCount, DateTime? LastSyncDate);
    private sealed record ChatActivity(int ChatToday, int ChatTotal, decimal? SuccessRate);
}
