using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AiAssistant.Models.Requests;

/// <summary>
/// A single message in the conversation history.
/// </summary>
public class ConversationMessage
{
    /// <summary>The speaker role: "user" or "assistant".</summary>
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    /// <summary>The message content.</summary>
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

/// <summary>
/// Request model for the AI Chat endpoint.
/// </summary>
public class ChatRequest
{
    /// <summary>
    /// The current page/process path (e.g., "/master/owner").
    /// Used to load page-specific AI context.
    /// </summary>
    [Required]
    public string Process { get; set; } = string.Empty;

    /// <summary>
    /// The user's natural language question.
    /// </summary>
    [Required]
    public string UserMessage { get; set; } = string.Empty;

    /// <summary>
    /// The user ID for logging and context.
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// The display name of the logged-in user (e.g. "สมชาย ใจดี").
    /// Injected into the AI context so the AI can resolve "ฉัน / I / me" in queries.
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// Previous conversation turns to include as context (max 10 messages).
    /// Each item has Role ("user"/"assistant") and Content.
    /// </summary>
    public List<ConversationMessage> ConversationHistory { get; set; } = [];

    /// <summary>
    /// Optional system prompt override for admin-level chat surfaces.
    /// When provided, it takes precedence over the page configuration prompt.
    /// </summary>
    [JsonPropertyName("system_prompt_id")]
    public int? SystemPromptId { get; set; }

    /// <summary>
    /// Optional image attachment as a Base64-encoded string (without data URI prefix).
    /// Only used when the provider has allow_file_attachment = true.
    /// Max recommended size: 5 MB (before base64 encoding).
    /// </summary>
    public string? AttachmentBase64 { get; set; }

    /// <summary>
    /// MIME type of the attached image (e.g. "image/jpeg", "image/png").
    /// Required when AttachmentBase64 is provided.
    /// </summary>
    public string? AttachmentMimeType { get; set; }
}
