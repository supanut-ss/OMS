using System.Text.Json.Serialization;

namespace ApiCore.Models.Responses;

public sealed class PartAttachmentResponse
{
    [JsonPropertyName("part_attachment_id")]
    public long PartAttachmentId { get; init; }

    [JsonPropertyName("part_id")]
    public long PartId { get; init; }

    [JsonPropertyName("attachment_type")]
    public string AttachmentType { get; init; } = string.Empty;

    [JsonPropertyName("attachment_name")]
    public string AttachmentName { get; init; } = string.Empty;

    [JsonPropertyName("mime_type")]
    public string MimeType { get; init; } = string.Empty;

    [JsonPropertyName("storage_path")]
    public string StoragePath { get; init; } = string.Empty;

    [JsonPropertyName("content_url")]
    public string ContentUrl { get; init; } = string.Empty;
}
