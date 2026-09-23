using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

public interface ITextEmbeddingService
{
    Task<TextEmbeddingResult> CreateEmbeddingAsync(string text, CancellationToken cancellationToken = default);
}
