namespace AiAssistant.Models.Responses;

/// <summary>
/// Response for creating a KnowledgeBase source document.
/// </summary>
public class CreateKnowledgeDocumentResponse
{
    public bool Success { get; set; }
    public long KnowledgeDocumentId { get; set; }
    public int ChunkCount { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Response for KnowledgeBase chunk generation.
/// </summary>
public class KnowledgeChunkBuildResponse
{
    public bool Success { get; set; }
    public int DocumentCount { get; set; }
    public int ChunkCount { get; set; }
    public DateTime ProcessedAtUtc { get; set; }
    public List<KnowledgeChunkBuildItem> Items { get; set; } = [];
    public string? ErrorMessage { get; set; }
}

public class KnowledgeChunkBuildItem
{
    public long KnowledgeDocumentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int ChunkCount { get; set; }
}

/// <summary>
/// Response for rebuilding vector embeddings on active KnowledgeBase chunks.
/// </summary>
public class KnowledgeEmbeddingBuildResponse
{
    public bool Success { get; set; }
    public int ChunkCount { get; set; }
    public string EmbeddingProvider { get; set; } = string.Empty;
    public string EmbeddingModel { get; set; } = string.Empty;
    public int EmbeddingDimension { get; set; }
    public DateTime ProcessedAtUtc { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Lightweight document list response for KnowledgeBase admin screens.
/// </summary>
public class KnowledgeDocumentListResponse
{
    public bool Success { get; set; }
    public IEnumerable<KnowledgeDocumentListItem> Items { get; set; } = [];
    public string? ErrorMessage { get; set; }
}

public class KnowledgeDocumentListItem
{
    public long KnowledgeDocumentId { get; set; }
    public string DocType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Process { get; set; }
    public string? ModuleName { get; set; }
    public string? SchemaName { get; set; }
    public string? TableName { get; set; }
    public string? SourcePath { get; set; }
    public string? SourceHash { get; set; }
    public bool IsGenerated { get; set; }
    public bool IsActive { get; set; }
    public int ChunkCount { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime? UpdateDate { get; set; }
}
