using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Retrieves AI knowledge and schema context for RAG prompt assembly.
/// </summary>
public interface IKnowledgeRetrievalService
{
    Task<KnowledgeRetrievalResult> RetrieveContextAsync(
        string process,
        string userMessage,
        string? allowedTables,
        string? allowedColumns);

    Task LogRetrievalAsync(
        long aiChatLogId,
        string process,
        string queryText,
        KnowledgeRetrievalResult retrievalResult);
}

