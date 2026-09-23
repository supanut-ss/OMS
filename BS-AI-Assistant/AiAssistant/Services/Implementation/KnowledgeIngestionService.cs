using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using AiAssistant.Models.Requests;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Builds the manual KnowledgeBase side of RAG: document ingestion and chunk generation.
/// </summary>
public class KnowledgeIngestionService : IKnowledgeIngestionService
{
    private readonly string _connectionString;
    private readonly ITextEmbeddingService _textEmbeddingService;
    private readonly ILogger<KnowledgeIngestionService> _logger;

    public KnowledgeIngestionService(
        IConfiguration configuration,
        ITextEmbeddingService textEmbeddingService,
        ILogger<KnowledgeIngestionService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _textEmbeddingService = textEmbeddingService;
        _logger = logger;
    }

    public async Task<CreateKnowledgeDocumentResponse> CreateDocumentAsync(CreateKnowledgeDocumentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return new CreateKnowledgeDocumentResponse
            {
                Success = false,
                ErrorMessage = "Document content is required."
            };
        }

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            using var transaction = connection.BeginTransaction();

            var sourceHash = ComputeSha256(request.Content);
            var documentId = await connection.QuerySingleAsync<long>(
                InsertDocumentSql,
                new
                {
                    DocType = NormalizeRequired(request.DocType, "manual", 50),
                    Title = NormalizeRequired(request.Title, "Untitled Knowledge Document", 300),
                    Content = request.Content.Trim(),
                    Process = NormalizeOptional(request.Process),
                    ModuleName = NormalizeOptional(request.ModuleName),
                    SchemaName = NormalizeOptional(request.SchemaName),
                    TableName = NormalizeOptional(request.TableName),
                    SourcePath = NormalizeOptional(request.SourcePath),
                    SourceVersion = NormalizeOptional(request.SourceVersion),
                    SourceHash = sourceHash,
                    LanguageCode = NormalizeRequired(request.LanguageCode, "th-TH", 20),
                    request.IsGenerated,
                    CreateBy = NormalizeOptional(request.CreateBy) ?? "system"
                },
                transaction);

            var chunkCount = 0;
            if (request.GenerateChunks)
            {
                chunkCount = await BuildChunksForDocumentAsync(
                    connection,
                    transaction,
                    documentId,
                    request.Title,
                    request.Content,
                    request.ChunkSize,
                    request.ChunkOverlap);
            }

            transaction.Commit();

            return new CreateKnowledgeDocumentResponse
            {
                Success = true,
                KnowledgeDocumentId = documentId,
                ChunkCount = chunkCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Knowledge document ingestion failed.");
            return new CreateKnowledgeDocumentResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<KnowledgeChunkBuildResponse> BuildChunksAsync(BuildKnowledgeChunksRequest request)
    {
        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var documents = (await connection.QueryAsync<KnowledgeDocumentContentRow>(
                SelectDocumentsForChunkingSql,
                new { request.KnowledgeDocumentId }))
                .ToList();

            var response = new KnowledgeChunkBuildResponse
            {
                Success = true,
                ProcessedAtUtc = DateTime.UtcNow,
                DocumentCount = documents.Count
            };

            foreach (var document in documents)
            {
                using var transaction = connection.BeginTransaction();
                var chunkCount = await BuildChunksForDocumentAsync(
                    connection,
                    transaction,
                    document.KnowledgeDocumentId,
                    document.Title,
                    document.Content,
                    request.ChunkSize,
                    request.ChunkOverlap);
                transaction.Commit();

                response.Items.Add(new KnowledgeChunkBuildItem
                {
                    KnowledgeDocumentId = document.KnowledgeDocumentId,
                    Title = document.Title,
                    ChunkCount = chunkCount
                });
                response.ChunkCount += chunkCount;
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Knowledge chunk build failed.");
            return new KnowledgeChunkBuildResponse
            {
                Success = false,
                ProcessedAtUtc = DateTime.UtcNow,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<KnowledgeDocumentListResponse> GetDocumentsAsync(string? process, string? docType, int limit)
    {
        try
        {
            using var connection = new SqlConnection(_connectionString);
            var items = await connection.QueryAsync<KnowledgeDocumentListItem>(
                SelectDocumentsSql,
                new
                {
                    Process = NormalizeOptional(process),
                    DocType = NormalizeOptional(docType),
                    Limit = Math.Clamp(limit, 1, 500)
                });

            return new KnowledgeDocumentListResponse
            {
                Success = true,
                Items = items
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read knowledge documents.");
            return new KnowledgeDocumentListResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<KnowledgeEmbeddingBuildResponse> BuildEmbeddingsAsync(BuildKnowledgeEmbeddingsRequest request)
    {
        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            using var transaction = connection.BeginTransaction();

            var chunks = (await connection.QueryAsync<KnowledgeChunkContentRow>(
                SelectChunksForEmbeddingSql,
                new { request.KnowledgeDocumentId },
                transaction))
                .ToList();

            TextEmbeddingResult? lastEmbedding = null;
            foreach (var chunk in chunks)
            {
                var embedding = await _textEmbeddingService.CreateEmbeddingAsync(chunk.EmbeddingText);
                lastEmbedding = embedding;
                await connection.ExecuteAsync(
                    UpdateChunkEmbeddingSql,
                    new
                    {
                        chunk.KnowledgeChunkId,
                        EmbeddingProvider = embedding.Provider,
                        EmbeddingModel = embedding.Model,
                        EmbeddingDimension = embedding.Dimension,
                        EmbeddingJson = embedding.EmbeddingJson
                    },
                    transaction);

                await ReplaceChunkTokensAsync(
                    connection,
                    transaction,
                    chunk.KnowledgeChunkId,
                    ExtractIndexTokens(chunk.EmbeddingText));
            }

            transaction.Commit();

            return new KnowledgeEmbeddingBuildResponse
            {
                Success = true,
                ChunkCount = chunks.Count,
                EmbeddingProvider = lastEmbedding?.Provider ?? string.Empty,
                EmbeddingModel = lastEmbedding?.Model ?? string.Empty,
                EmbeddingDimension = lastEmbedding?.Dimension ?? 0,
                ProcessedAtUtc = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Knowledge embedding build failed.");
            return new KnowledgeEmbeddingBuildResponse
            {
                Success = false,
                ProcessedAtUtc = DateTime.UtcNow,
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<int> BuildChunksForDocumentAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        long documentId,
        string title,
        string content,
        int chunkSize,
        int chunkOverlap)
    {
        var chunks = SplitIntoChunks(content, chunkSize, chunkOverlap);

        for (var i = 0; i < chunks.Count; i++)
        {
            var chunk = chunks[i];
            var embedding = await _textEmbeddingService.CreateEmbeddingAsync(chunk);
            var chunkTitle = chunks.Count == 1
                ? title
                : $"{title} ({i + 1}/{chunks.Count})";

            var chunkId = await connection.QuerySingleAsync<long>(
                UpsertChunkSql,
                new
                {
                    KnowledgeDocumentId = documentId,
                    ChunkIndex = i,
                    ChunkTitle = TrimToLength(chunkTitle, 300),
                    ChunkContent = chunk,
                    EmbeddingText = chunk,
                    EmbeddingProvider = embedding.Provider,
                    EmbeddingModel = embedding.Model,
                    EmbeddingDimension = embedding.Dimension,
                    EmbeddingJson = embedding.EmbeddingJson,
                    ContentHash = ComputeSha256(chunk),
                    TokenCount = EstimateTokenCount(chunk)
                },
                transaction);

            await ReplaceChunkTokensAsync(connection, transaction, chunkId, ExtractIndexTokens(chunk));
        }

        await connection.ExecuteAsync(
            DeactivateStaleChunksSql,
            new
            {
                KnowledgeDocumentId = documentId,
                ActiveChunkCount = chunks.Count
            },
            transaction);

        return chunks.Count;
    }

    private static List<string> SplitIntoChunks(string content, int requestedChunkSize, int requestedOverlap)
    {
        var normalized = NormalizeContent(content);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return [];
        }

        var chunkSize = Math.Clamp(requestedChunkSize, 300, 4000);
        var overlap = Math.Clamp(requestedOverlap, 0, Math.Min(1000, chunkSize / 2));
        var chunks = new List<string>();
        var start = 0;

        while (start < normalized.Length)
        {
            var targetEnd = Math.Min(start + chunkSize, normalized.Length);
            var end = FindChunkBoundary(normalized, start, targetEnd);
            if (end <= start)
            {
                end = targetEnd;
            }

            var chunk = normalized[start..end].Trim();
            if (!string.IsNullOrWhiteSpace(chunk))
            {
                chunks.Add(chunk);
            }

            if (end >= normalized.Length)
            {
                break;
            }

            start = Math.Max(0, end - overlap);
            while (start < normalized.Length && char.IsWhiteSpace(normalized[start]))
            {
                start++;
            }
        }

        return chunks;
    }

    private static int FindChunkBoundary(string content, int start, int targetEnd)
    {
        if (targetEnd >= content.Length)
        {
            return content.Length;
        }

        var minEnd = Math.Min(content.Length, start + 300);
        var boundaryChars = new[] { "\r\n\r\n", "\n\n", "\r\n", "\n", ". ", "。", "।", " " };
        foreach (var boundary in boundaryChars)
        {
            var index = content.LastIndexOf(boundary, targetEnd - 1, targetEnd - start, StringComparison.Ordinal);
            if (index >= minEnd)
            {
                return index + boundary.Length;
            }
        }

        return targetEnd;
    }

    private static string NormalizeContent(string content)
    {
        var lines = content
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Split('\n')
            .Select(line => line.TrimEnd());

        return string.Join('\n', lines).Trim();
    }

    private static string ComputeSha256(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static int EstimateTokenCount(string value) =>
        Math.Max(1, (int)Math.Ceiling(value.Length / 4.0));

    private static string NormalizeRequired(string? value, string fallback, int maxLength) =>
        TrimToLength(string.IsNullOrWhiteSpace(value) ? fallback : value.Trim(), maxLength);

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string TrimToLength(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    private static List<ChunkTokenRow> ExtractIndexTokens(string value) =>
        Regex.Matches(value.ToLowerInvariant(), @"[\p{L}\p{N}_]+")
            .Select(match => match.Value)
            .Where(token => token.Length is >= 2 and <= 128)
            .GroupBy(token => token)
            .OrderByDescending(group => group.Count())
            .ThenBy(group => group.Key)
            .Take(250)
            .Select(group => new ChunkTokenRow(
                group.Key,
                Math.Min(99.9999m, Math.Round((decimal)group.Count(), 4))))
            .ToList();

    private static async Task ReplaceChunkTokensAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        long chunkId,
        IReadOnlyCollection<ChunkTokenRow> tokens)
    {
        await connection.ExecuteAsync(DeleteChunkTokensSql, new { KnowledgeChunkId = chunkId }, transaction);

        if (tokens.Count == 0)
        {
            return;
        }

        var rows = tokens.Select(token => new
        {
            KnowledgeChunkId = chunkId,
            token.Token,
            token.TokenWeight
        });

        await connection.ExecuteAsync(InsertChunkTokenSql, rows, transaction);
    }

    private const string InsertDocumentSql = """
        INSERT INTO [ais].[t_ai_knowledge_document] (
            [doc_type],
            [title],
            [content],
            [process],
            [module_name],
            [schema_name],
            [table_name],
            [source_path],
            [source_version],
            [source_hash],
            [language_code],
            [is_generated],
            [is_active],
            [create_by],
            [create_date]
        )
        OUTPUT INSERTED.[knowledge_document_id]
        VALUES (
            @DocType,
            @Title,
            @Content,
            @Process,
            @ModuleName,
            @SchemaName,
            @TableName,
            @SourcePath,
            @SourceVersion,
            @SourceHash,
            @LanguageCode,
            @IsGenerated,
            1,
            @CreateBy,
            GETDATE()
        );
        """;

    private const string SelectDocumentsForChunkingSql = """
        SELECT
            [knowledge_document_id] AS KnowledgeDocumentId,
            [title] AS Title,
            [content] AS Content
        FROM [ais].[t_ai_knowledge_document]
        WHERE [is_active] = 1
          AND (@KnowledgeDocumentId IS NULL OR [knowledge_document_id] = @KnowledgeDocumentId)
        ORDER BY [knowledge_document_id];
        """;

    private const string UpsertChunkSql = """
        MERGE [ais].[t_ai_knowledge_chunk] AS target
        USING (
            SELECT
                @KnowledgeDocumentId AS [knowledge_document_id],
                @ChunkIndex AS [chunk_index]
        ) AS source
            ON target.[knowledge_document_id] = source.[knowledge_document_id]
           AND target.[chunk_index] = source.[chunk_index]
        WHEN MATCHED THEN
            UPDATE SET
                [chunk_title] = @ChunkTitle,
                [chunk_content] = @ChunkContent,
                [embedding_text] = @EmbeddingText,
                [embedding_provider] = @EmbeddingProvider,
                [embedding_model] = @EmbeddingModel,
                [embedding_dimension] = @EmbeddingDimension,
                [embedding_json] = @EmbeddingJson,
                [content_hash] = @ContentHash,
                [token_count] = @TokenCount,
                [is_embedded] = 1,
                [is_active] = 1,
                [update_date] = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (
                [knowledge_document_id],
                [chunk_index],
                [chunk_title],
                [chunk_content],
                [embedding_text],
                [embedding_provider],
                [embedding_model],
                [embedding_dimension],
                [embedding_json],
                [content_hash],
                [token_count],
                [is_embedded],
                [is_active],
                [create_date]
            )
            VALUES (
                @KnowledgeDocumentId,
                @ChunkIndex,
                @ChunkTitle,
                @ChunkContent,
                @EmbeddingText,
                @EmbeddingProvider,
                @EmbeddingModel,
                @EmbeddingDimension,
                @EmbeddingJson,
                @ContentHash,
                @TokenCount,
                1,
                1,
                GETDATE()
            )
        OUTPUT INSERTED.[knowledge_chunk_id];
        """;

    private const string DeactivateStaleChunksSql = """
        UPDATE [ais].[t_ai_knowledge_chunk]
        SET [is_active] = 0,
            [update_date] = GETDATE()
        WHERE [knowledge_document_id] = @KnowledgeDocumentId
          AND [chunk_index] >= @ActiveChunkCount
          AND [is_active] = 1;
        """;

    private const string SelectDocumentsSql = """
        SELECT TOP (@Limit)
            d.[knowledge_document_id] AS KnowledgeDocumentId,
            d.[doc_type] AS DocType,
            d.[title] AS Title,
            d.[process] AS Process,
            d.[module_name] AS ModuleName,
            d.[schema_name] AS SchemaName,
            d.[table_name] AS TableName,
            d.[source_path] AS SourcePath,
            d.[source_hash] AS SourceHash,
            d.[is_generated] AS IsGenerated,
            d.[is_active] AS IsActive,
            COUNT(CASE WHEN c.[is_active] = 1 THEN 1 END) AS ChunkCount,
            d.[create_date] AS CreateDate,
            d.[update_date] AS UpdateDate
        FROM [ais].[t_ai_knowledge_document] d
        LEFT JOIN [ais].[t_ai_knowledge_chunk] c
            ON c.[knowledge_document_id] = d.[knowledge_document_id]
        WHERE (@Process IS NULL OR d.[process] = @Process)
          AND (@DocType IS NULL OR d.[doc_type] = @DocType)
        GROUP BY
            d.[knowledge_document_id],
            d.[doc_type],
            d.[title],
            d.[process],
            d.[module_name],
            d.[schema_name],
            d.[table_name],
            d.[source_path],
            d.[source_hash],
            d.[is_generated],
            d.[is_active],
            d.[create_date],
            d.[update_date]
        ORDER BY d.[create_date] DESC, d.[knowledge_document_id] DESC;
        """;

    private const string SelectChunksForEmbeddingSql = """
        SELECT
            c.[knowledge_chunk_id] AS KnowledgeChunkId,
            c.[embedding_text] AS EmbeddingText
        FROM [ais].[t_ai_knowledge_chunk] c
        JOIN [ais].[t_ai_knowledge_document] d
            ON d.[knowledge_document_id] = c.[knowledge_document_id]
        WHERE c.[is_active] = 1
          AND d.[is_active] = 1
          AND (@KnowledgeDocumentId IS NULL OR c.[knowledge_document_id] = @KnowledgeDocumentId)
        ORDER BY c.[knowledge_document_id], c.[chunk_index];
        """;

    private const string UpdateChunkEmbeddingSql = """
        UPDATE [ais].[t_ai_knowledge_chunk]
        SET [embedding_provider] = @EmbeddingProvider,
            [embedding_model] = @EmbeddingModel,
            [embedding_dimension] = @EmbeddingDimension,
            [embedding_json] = @EmbeddingJson,
            [is_embedded] = 1,
            [update_date] = GETDATE()
        WHERE [knowledge_chunk_id] = @KnowledgeChunkId;
        """;

    private const string DeleteChunkTokensSql = """
        IF OBJECT_ID(N'ais.t_ai_knowledge_chunk_token', N'U') IS NOT NULL
        BEGIN
            DELETE FROM [ais].[t_ai_knowledge_chunk_token]
            WHERE [knowledge_chunk_id] = @KnowledgeChunkId;
        END
        """;

    private const string InsertChunkTokenSql = """
        IF OBJECT_ID(N'ais.t_ai_knowledge_chunk_token', N'U') IS NOT NULL
        BEGIN
            INSERT INTO [ais].[t_ai_knowledge_chunk_token] (
                [knowledge_chunk_id],
                [token],
                [token_weight],
                [create_date]
            )
            VALUES (
                @KnowledgeChunkId,
                @Token,
                @TokenWeight,
                GETDATE()
            );
        END
        """;

    private sealed record ChunkTokenRow(string Token, decimal TokenWeight);

    private sealed class KnowledgeDocumentContentRow
    {
        public long KnowledgeDocumentId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    private sealed class KnowledgeChunkContentRow
    {
        public long KnowledgeChunkId { get; set; }
        public string EmbeddingText { get; set; } = string.Empty;
    }
}
