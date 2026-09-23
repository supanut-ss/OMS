using AiAssistant.Models.Entities;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Service for logging chat interactions to the database.
/// </summary>
public interface IChatLogService
{
    /// <summary>
    /// Logs a complete chat interaction to the t_ai_chat_log table.
    /// </summary>
    Task<long?> LogChatAsync(ChatLog chatLog);
}
