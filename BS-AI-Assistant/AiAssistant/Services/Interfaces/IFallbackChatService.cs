using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// A simple text-only message for chat completions (system/user/assistant role).
/// </summary>
public record FallbackMessage(string Role, string Content);

/// <summary>
/// A multimodal message that carries both text and a single image attachment.
/// Serialized to the OpenAI "content array" format:
/// [{"type":"text","text":"..."}, {"type":"image_url","image_url":{"url":"data:..."}}]
/// </summary>
public record FallbackMultimodalMessage(
    string Role,
    string Content,
    string ImageBase64,
    string ImageMimeType) : FallbackMessage(Role, Content);

/// <summary>
/// Chat service that tries models in priority order and automatically falls back
/// to the next model when one fails (429, 503, 500, timeout).
/// </summary>
public interface IFallbackChatService
{
    /// <summary>
    /// Sends chat messages to the AI, trying each configured model in order.
    /// Throws <see cref="InvalidOperationException"/> if all models fail.
    /// </summary>
    Task<FallbackChatResult> CompleteAsync(IList<FallbackMessage> messages);
}
