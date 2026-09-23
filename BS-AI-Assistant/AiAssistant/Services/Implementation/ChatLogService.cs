using AiAssistant.Models.Entities;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Logs all chat interactions to the ais.t_ai_chat_log table.
/// </summary>
public class ChatLogService : IChatLogService
{
    private readonly string _connectionString;
    private readonly ILogger<ChatLogService> _logger;

    public ChatLogService(IConfiguration configuration, ILogger<ChatLogService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _logger = logger;
    }

    public async Task<long?> LogChatAsync(ChatLog chatLog)
    {
        const string sql = @"
            INSERT INTO ais.t_ai_chat_log (
                process, user_id,
                user_message, ai_response,
                system_prompt_id, ai_config_id, ai_decision, generated_sql,
                prompt_tokens, completion_tokens, total_tokens, processing_time_ms,
                is_success, error_message,
                model_name, create_date
            ) VALUES (
                @Process, @UserId,
                @UserMessage, @AiResponse,
                @SystemPromptId, @AiConfigId, @AiDecision, @GeneratedSql,
                @PromptTokens, @CompletionTokens, @TotalTokens, @ProcessingTimeMs,
                @IsSuccess, @ErrorMessage,
                @ModelName, GETDATE()
            );
            SELECT CAST(SCOPE_IDENTITY() AS BIGINT);";

        try
        {
            using var connection = new SqlConnection(_connectionString);
            var aiChatLogId = await connection.ExecuteScalarAsync<long>(sql, chatLog);
            _logger.LogDebug("Chat log saved for user {UserId}, process {Process}", chatLog.UserId, chatLog.Process);
            return aiChatLogId;
        }
        catch (Exception ex)
        {
            // Logging failures should not break the chat flow
            _logger.LogError(ex, "Failed to save chat log for user {UserId}, process {Process}", chatLog.UserId, chatLog.Process);
            return null;
        }
    }
}
