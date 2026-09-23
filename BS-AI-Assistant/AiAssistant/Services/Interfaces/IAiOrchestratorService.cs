using AiAssistant.Models.Requests;
using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Main AI orchestrator service that coordinates the full chat flow.
/// </summary>
public interface IAiOrchestratorService
{
    /// <summary>
    /// Processes a chat request through the full AI pipeline:
    /// 1. Load prompts (system + page config)
    /// 2. Send to AI via Semantic Kernel
    /// 3. Handle BYPASS_SQL or GENERATE_SQL decision
    /// 4. Log everything to chat_log
    /// </summary>
    Task<ChatResponse> ProcessChatAsync(ChatRequest request);

    /// <summary>
    /// Generates a list of suggested questions for the given page/process context.
    /// These are quick-pick questions the user can tap to start a conversation.
    /// </summary>
    Task<SuggestionsResponse> GenerateSuggestionsAsync(SuggestionsRequest request);

    /// <summary>
    /// Confirms and executes an AI-generated CRUD proposal.
    /// </summary>
    Task<CrudConfirmResponse> ConfirmCrudAsync(CrudConfirmRequest request);

    /// <summary>
    /// Rejects an AI-generated CRUD proposal without executing it.
    /// </summary>
    Task<CrudConfirmResponse> RejectCrudAsync(CrudConfirmRequest request);


}
