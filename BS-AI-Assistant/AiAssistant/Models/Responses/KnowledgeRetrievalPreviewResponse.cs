namespace AiAssistant.Models.Responses;

/// <summary>
/// Debug response for previewing RAG context without calling the LLM.
/// </summary>
public class KnowledgeRetrievalPreviewResponse
{
    public bool Success { get; set; }
    public string Process { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public int KnowledgeChunkCount { get; set; }
    public int SchemaColumnCount { get; set; }
    public int SchemaRelationCount { get; set; }
    public string FormattedContext { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}

