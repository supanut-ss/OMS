using AiAssistant.Models.Requests;
using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Ingests source documents and builds searchable chunks for AI KnowledgeBase retrieval.
/// </summary>
public interface IKnowledgeIngestionService
{
    Task<CreateKnowledgeDocumentResponse> CreateDocumentAsync(CreateKnowledgeDocumentRequest request);
    Task<KnowledgeChunkBuildResponse> BuildChunksAsync(BuildKnowledgeChunksRequest request);
    Task<KnowledgeEmbeddingBuildResponse> BuildEmbeddingsAsync(BuildKnowledgeEmbeddingsRequest request);
    Task<KnowledgeDocumentListResponse> GetDocumentsAsync(string? process, string? docType, int limit);
}
