namespace AiAssistant.Models.Responses;

public sealed class TextEmbeddingResult
{
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Dimension { get; set; }
    public float[] Vector { get; set; } = [];
    public string EmbeddingJson { get; set; } = "[]";
}
