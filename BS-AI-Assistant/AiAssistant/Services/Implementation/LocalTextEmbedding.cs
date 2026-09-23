using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Lightweight deterministic text embedding used until an external embedding provider is configured.
/// It stores normalized hashing-vector embeddings as JSON so retrieval can use cosine similarity today.
/// </summary>
internal static class LocalTextEmbedding
{
    public const string Provider = "local";
    public const string Model = "bs-ai-local-hashing-v1";
    public const int Dimension = 384;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = false
    };

    public static float[] CreateVector(string text)
    {
        var vector = new float[Dimension];
        foreach (var feature in ExtractFeatures(text))
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(feature));
            var index = BitConverter.ToUInt32(hash, 0) % Dimension;
            var sign = (hash[4] & 1) == 0 ? 1f : -1f;
            vector[index] += sign;
        }

        Normalize(vector);
        return vector;
    }

    public static string CreateJson(string text) =>
        JsonSerializer.Serialize(CreateVector(text), JsonOptions);

    public static bool TryParseJson(string? value, out float[] vector)
    {
        vector = [];
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<float[]>(value);
            if (parsed is not { Length: Dimension })
            {
                return false;
            }

            vector = parsed;
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static double CosineSimilarity(float[] left, float[] right)
    {
        if (left.Length != right.Length || left.Length == 0)
        {
            return 0;
        }

        double dot = 0;
        double leftNorm = 0;
        double rightNorm = 0;
        for (var i = 0; i < left.Length; i++)
        {
            dot += left[i] * right[i];
            leftNorm += left[i] * left[i];
            rightNorm += right[i] * right[i];
        }

        if (leftNorm == 0 || rightNorm == 0)
        {
            return 0;
        }

        return dot / (Math.Sqrt(leftNorm) * Math.Sqrt(rightNorm));
    }

    private static IEnumerable<string> ExtractFeatures(string text)
    {
        var normalized = text.ToLowerInvariant();
        var tokens = Regex.Matches(normalized, @"[\p{L}\p{N}_]+")
            .Select(match => match.Value)
            .Where(token => token.Length >= 2)
            .Take(500);

        foreach (var token in tokens)
        {
            yield return $"tok:{token}";
        }

        var compact = Regex.Replace(normalized, @"\s+", " ").Trim();
        foreach (var gram in GetCharacterGrams(compact, 3).Take(800))
        {
            yield return $"tri:{gram}";
        }
    }

    private static IEnumerable<string> GetCharacterGrams(string value, int size)
    {
        if (value.Length <= size)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                yield return value;
            }

            yield break;
        }

        for (var i = 0; i <= value.Length - size; i++)
        {
            var gram = value.Substring(i, size);
            if (!string.IsNullOrWhiteSpace(gram))
            {
                yield return gram;
            }
        }
    }

    private static void Normalize(float[] vector)
    {
        double norm = 0;
        foreach (var value in vector)
        {
            norm += value * value;
        }

        if (norm == 0)
        {
            return;
        }

        var scale = (float)(1.0 / Math.Sqrt(norm));
        for (var i = 0; i < vector.Length; i++)
        {
            vector[i] *= scale;
        }
    }
}
