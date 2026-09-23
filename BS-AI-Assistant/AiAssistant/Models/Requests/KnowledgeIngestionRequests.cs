using System.ComponentModel.DataAnnotations;

namespace AiAssistant.Models.Requests;

/// <summary>
/// Request model for adding a source document to the AI KnowledgeBase.
/// </summary>
public class CreateKnowledgeDocumentRequest
{
    [Required]
    [MaxLength(50)]
    public string DocType { get; set; } = "manual";

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Process { get; set; }

    [MaxLength(200)]
    public string? ModuleName { get; set; }

    [MaxLength(128)]
    public string? SchemaName { get; set; }

    [MaxLength(128)]
    public string? TableName { get; set; }

    [MaxLength(1000)]
    public string? SourcePath { get; set; }

    [MaxLength(100)]
    public string? SourceVersion { get; set; }

    [MaxLength(20)]
    public string LanguageCode { get; set; } = "th-TH";

    public bool IsGenerated { get; set; }

    [MaxLength(100)]
    public string? CreateBy { get; set; }

    public bool GenerateChunks { get; set; } = true;

    [Range(300, 4000)]
    public int ChunkSize { get; set; } = 1200;

    [Range(0, 1000)]
    public int ChunkOverlap { get; set; } = 150;
}

/// <summary>
/// Request model for building or rebuilding chunks from KnowledgeBase documents.
/// </summary>
public class BuildKnowledgeChunksRequest
{
    public long? KnowledgeDocumentId { get; set; }

    [Range(300, 4000)]
    public int ChunkSize { get; set; } = 1200;

    [Range(0, 1000)]
    public int ChunkOverlap { get; set; } = 150;
}

/// <summary>
/// Request model for rebuilding embeddings for existing active chunks.
/// </summary>
public class BuildKnowledgeEmbeddingsRequest
{
    public long? KnowledgeDocumentId { get; set; }
}
