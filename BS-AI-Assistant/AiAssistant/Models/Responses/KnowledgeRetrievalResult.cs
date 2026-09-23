namespace AiAssistant.Models.Responses;

/// <summary>
/// Retrieved RAG context prepared for prompt injection.
/// </summary>
public class KnowledgeRetrievalResult
{
    public string FormattedContext { get; set; } = string.Empty;
    public int KnowledgeChunkCount { get; set; }
    public int SchemaColumnCount { get; set; }
    public int SchemaRelationCount { get; set; }
    public List<KnowledgeRetrievalLogItem> LogItems { get; set; } = [];
    public bool HasContext =>
        KnowledgeChunkCount > 0 ||
        SchemaColumnCount > 0 ||
        SchemaRelationCount > 0;
}

public class KnowledgeRetrievalLogItem
{
    public long? KnowledgeChunkId { get; set; }
    public long? SchemaCatalogId { get; set; }
    public long? SchemaRelationId { get; set; }
    public string RetrievalMode { get; set; } = string.Empty;
    public decimal? SimilarityScore { get; set; }
    public int RankOrder { get; set; }
}

