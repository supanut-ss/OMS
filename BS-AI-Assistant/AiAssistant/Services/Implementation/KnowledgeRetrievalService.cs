using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// RAG retrieval using vector/keyword hybrid matching over knowledge chunks and schema catalog.
/// </summary>
public class KnowledgeRetrievalService : IKnowledgeRetrievalService
{
    private const int MaxKnowledgeChunks = 8;
    private readonly string _connectionString;
    private readonly ITextEmbeddingService _textEmbeddingService;
    private readonly ILogger<KnowledgeRetrievalService> _logger;

    public KnowledgeRetrievalService(
        IConfiguration configuration,
        ITextEmbeddingService textEmbeddingService,
        ILogger<KnowledgeRetrievalService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _textEmbeddingService = textEmbeddingService;
        _logger = logger;
    }

    public async Task<KnowledgeRetrievalResult> RetrieveContextAsync(
        string process,
        string userMessage,
        string? allowedTables,
        string? allowedColumns)
    {
        try
        {
            var allowAllTables = ContainsWildcardAllowedValue(allowedTables);
            var tableScopes = ParseAllowedTables(allowedTables);
            var tokens = ExtractSearchTokens(userMessage, process, tableScopes);
            var queryEmbedding = (await _textEmbeddingService.CreateEmbeddingAsync(userMessage)).Vector;

            using var connection = new SqlConnection(_connectionString);

            var schemaOverviewRows = allowAllTables
                ? await LoadSchemaOverviewAsync(connection)
                : [];
            var schemaRows = await LoadSchemaCandidatesAsync(connection, tableScopes, tokens, allowAllTables);
            var scoredSchemaRows = schemaRows
                .Select(row => new ScoredSchemaRow(row, ScoreSchemaRow(row, tokens, tableScopes)))
                .Where(row => row.Score > 0 || tableScopes.Count > 0 || allowAllTables)
                .OrderByDescending(row => row.Score)
                .ThenBy(row => row.Row.SchemaName)
                .ThenBy(row => row.Row.TableName)
                .ThenBy(row => row.Row.ColumnId)
                //.Take(80)
                .ToList();

            var relationRows = await LoadRelationCandidatesAsync(connection, scoredSchemaRows.Select(x => x.Row).ToList());
            var knowledgeRows = await LoadKnowledgeCandidatesAsync(connection, process, tokens);
            var scoredKnowledgeRows = knowledgeRows
                .Select(row => new ScoredKnowledgeRow(row, ScoreKnowledgeRow(row, tokens, process, queryEmbedding)))
                .Where(row => row.Score > 0)
                .OrderByDescending(row => row.Score)
                .ThenBy(row => row.Row.ChunkIndex)
                .Take(MaxKnowledgeChunks)
                .ToList();

            var formattedContext = FormatContext(scoredKnowledgeRows, scoredSchemaRows, relationRows, schemaOverviewRows);

            return new KnowledgeRetrievalResult
            {
                FormattedContext = formattedContext,
                KnowledgeChunkCount = scoredKnowledgeRows.Count,
                SchemaColumnCount = scoredSchemaRows.Count + schemaOverviewRows.Sum(row => row.ColumnNames.Count),
                SchemaRelationCount = relationRows.Count,
                LogItems = BuildLogItems(scoredKnowledgeRows, scoredSchemaRows, relationRows)
            };
        }
        catch (SqlException ex) when (ex.Number is 208 or 207)
        {
            _logger.LogWarning(ex, "Knowledge retrieval skipped because KnowledgeBase tables/views are not ready.");
            return new KnowledgeRetrievalResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Knowledge retrieval failed. Continuing without RAG context.");
            return new KnowledgeRetrievalResult();
        }
    }

    private static async Task<IEnumerable<SchemaCandidateRow>> LoadSchemaCandidatesAsync(
        SqlConnection connection,
        IReadOnlyCollection<TableScope> tableScopes,
        IReadOnlyCollection<string> tokens,
        bool allowAllTables)
    {
        if (tableScopes.Count == 0)
        {
            var likeTokens = tokens
                .Where(token => token.Length >= 3)
                .Take(12)
                .Select(EscapeLikeToken)
                .Select(token => $"%{token}%")
                .ToArray();

            if (likeTokens.Length > 0)
            {
                var predicates = likeTokens
                    .Select((_, index) => $"""
                        [schema_name] LIKE @Token{index} ESCAPE '\'
                        OR [table_name] LIKE @Token{index} ESCAPE '\'
                        OR ISNULL([table_description], '') LIKE @Token{index} ESCAPE '\'
                        OR [column_name] LIKE @Token{index} ESCAPE '\'
                        OR ISNULL([column_description], '') LIKE @Token{index} ESCAPE '\'
                        """);

                var keywordSql = $"""
                    SELECT TOP (400)
                        [schema_catalog_id] AS SchemaCatalogId,
                        [schema_name] AS SchemaName,
                        [table_name] AS TableName,
                        [table_description] AS TableDescription,
                        [column_name] AS ColumnName,
                        [column_description] AS ColumnDescription,
                        [data_type] AS DataType,
                        [is_nullable] AS IsNullable,
                        [is_primary_key] AS IsPrimaryKey,
                        [column_id] AS ColumnId
                    FROM [ais].[t_ai_schema_catalog]
                    WHERE [is_active] = 1
                      AND ({string.Join("\nOR ", predicates)})
                    ORDER BY [schema_name], [table_name], [column_id];
                    """;

                var parameters = new DynamicParameters();
                for (var index = 0; index < likeTokens.Length; index++)
                {
                    parameters.Add($"Token{index}", likeTokens[index]);
                }

                var matchedRows = (await connection.QueryAsync<SchemaCandidateRow>(keywordSql, parameters)).ToList();
                if (matchedRows.Count > 0)
                {
                    return matchedRows;
                }
            }

            var topRows = allowAllTables ? 2000 : 400;
            var sql = $"""
                SELECT TOP ({topRows})
                    [schema_catalog_id] AS SchemaCatalogId,
                    [schema_name] AS SchemaName,
                    [table_name] AS TableName,
                    [table_description] AS TableDescription,
                    [column_name] AS ColumnName,
                    [column_description] AS ColumnDescription,
                    [data_type] AS DataType,
                    [is_nullable] AS IsNullable,
                    [is_primary_key] AS IsPrimaryKey,
                    [column_id] AS ColumnId
                FROM [ais].[t_ai_schema_catalog]
                WHERE [is_active] = 1
                ORDER BY [schema_name], [table_name], [column_id];
                """;

            return await connection.QueryAsync<SchemaCandidateRow>(sql);
        }

        const string filteredSql = """
            SELECT TOP (400)
                [schema_catalog_id] AS SchemaCatalogId,
                [schema_name] AS SchemaName,
                [table_name] AS TableName,
                [table_description] AS TableDescription,
                [column_name] AS ColumnName,
                [column_description] AS ColumnDescription,
                [data_type] AS DataType,
                [is_nullable] AS IsNullable,
                [is_primary_key] AS IsPrimaryKey,
                [column_id] AS ColumnId
            FROM [ais].[t_ai_schema_catalog]
            WHERE [is_active] = 1
              AND CONCAT([schema_name], '.', [table_name]) IN @FullTableNames
            ORDER BY [schema_name], [table_name], [column_id];
            """;

        return await connection.QueryAsync<SchemaCandidateRow>(
            filteredSql,
            new { FullTableNames = tableScopes.Select(x => x.FullName).Distinct().ToArray() });
    }

    private static async Task<List<SchemaOverviewRow>> LoadSchemaOverviewAsync(SqlConnection connection)
    {
        const string sql = """
            SELECT
                [schema_name] AS SchemaName,
                [table_name] AS TableName,
                MAX([table_description]) AS TableDescription,
                STRING_AGG(CONVERT(nvarchar(max), [column_name]), ', ')
                    WITHIN GROUP (ORDER BY [column_id]) AS ColumnList,
                COUNT(1) AS ColumnCount
            FROM [ais].[t_ai_schema_catalog]
            WHERE [is_active] = 1
            GROUP BY [schema_name], [table_name]
            ORDER BY [schema_name], [table_name];
            """;

        var rows = await connection.QueryAsync<SchemaOverviewRecord>(sql);
        return rows
            .Select(row => new SchemaOverviewRow(
                row.SchemaName,
                row.TableName,
                row.TableDescription,
                SplitColumnList(row.ColumnList),
                row.ColumnCount))
            .ToList();
    }

    private static async Task<List<SchemaRelationRow>> LoadRelationCandidatesAsync(
        SqlConnection connection,
        IReadOnlyCollection<SchemaCandidateRow> schemaRows)
    {
        var tableNames = schemaRows
            .Select(x => $"{x.SchemaName}.{x.TableName}")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(50)
            .ToArray();

        if (tableNames.Length == 0)
        {
            return [];
        }

        const string sql = """
            SELECT TOP (60)
                [schema_relation_id] AS SchemaRelationId,
                [foreign_key_name] AS ForeignKeyName,
                [parent_schema_name] AS ParentSchemaName,
                [parent_table_name] AS ParentTableName,
                [parent_column_name] AS ParentColumnName,
                [referenced_schema_name] AS ReferencedSchemaName,
                [referenced_table_name] AS ReferencedTableName,
                [referenced_column_name] AS ReferencedColumnName,
                [relation_description] AS RelationDescription
            FROM [ais].[t_ai_schema_relation]
            WHERE [is_active] = 1
              AND (
                    CONCAT([parent_schema_name], '.', [parent_table_name]) IN @TableNames
                 OR CONCAT([referenced_schema_name], '.', [referenced_table_name]) IN @TableNames
              )
            ORDER BY [parent_schema_name], [parent_table_name], [foreign_key_name];
            """;

        var rows = await connection.QueryAsync<SchemaRelationRow>(sql, new { TableNames = tableNames });
        return rows.ToList();
    }

    private static async Task<IEnumerable<KnowledgeCandidateRow>> LoadKnowledgeCandidatesAsync(
        SqlConnection connection,
        string process,
        IReadOnlyCollection<string> tokens)
    {
        if (tokens.Count > 0)
        {
            const string indexedSql = """
                SELECT TOP (200)
                    c.[knowledge_chunk_id] AS KnowledgeChunkId,
                    c.[chunk_index] AS ChunkIndex,
                    c.[chunk_title] AS ChunkTitle,
                    c.[chunk_content] AS ChunkContent,
                    c.[embedding_json] AS EmbeddingJson,
                    c.[embedding_provider] AS EmbeddingProvider,
                    c.[embedding_model] AS EmbeddingModel,
                    c.[is_embedded] AS IsEmbedded,
                    d.[doc_type] AS DocType,
                    d.[title] AS DocumentTitle,
                    d.[process] AS Process,
                    d.[module_name] AS ModuleName,
                    d.[schema_name] AS SchemaName,
                    d.[table_name] AS TableName,
                    d.[source_path] AS SourcePath,
                    COUNT(t.[token]) AS TokenMatchCount
                FROM [ais].[t_ai_knowledge_chunk] c
                JOIN [ais].[t_ai_knowledge_document] d
                    ON d.[knowledge_document_id] = c.[knowledge_document_id]
                LEFT JOIN [ais].[t_ai_knowledge_chunk_token] t
                    ON t.[knowledge_chunk_id] = c.[knowledge_chunk_id]
                   AND t.[token] IN @Tokens
                WHERE c.[is_active] = 1
                  AND d.[is_active] = 1
                  AND (d.[process] IS NULL OR d.[process] = @Process)
                GROUP BY
                    c.[knowledge_chunk_id],
                    c.[chunk_index],
                    c.[chunk_title],
                    c.[chunk_content],
                    c.[embedding_json],
                    c.[embedding_provider],
                    c.[embedding_model],
                    c.[is_embedded],
                    d.[doc_type],
                    d.[title],
                    d.[process],
                    d.[module_name],
                    d.[schema_name],
                    d.[table_name],
                    d.[source_path]
                HAVING COUNT(t.[token]) > 0 OR d.[process] = @Process
                ORDER BY
                    CASE WHEN d.[process] = @Process THEN 0 ELSE 1 END,
                    COUNT(t.[token]) DESC,
                    d.[doc_type],
                    c.[chunk_index];
                """;

            try
            {
                return await connection.QueryAsync<KnowledgeCandidateRow>(
                    indexedSql,
                    new { Process = process, Tokens = tokens.ToArray() });
            }
            catch (SqlException ex) when (ex.Number is 208 or 207)
            {
                // Token index is optional during rollout. Existing installations still work with the legacy scan.
            }
        }

        const string sql = """
            SELECT TOP (80)
                c.[knowledge_chunk_id] AS KnowledgeChunkId,
                c.[chunk_index] AS ChunkIndex,
                c.[chunk_title] AS ChunkTitle,
                c.[chunk_content] AS ChunkContent,
                c.[embedding_json] AS EmbeddingJson,
                c.[embedding_provider] AS EmbeddingProvider,
                c.[embedding_model] AS EmbeddingModel,
                c.[is_embedded] AS IsEmbedded,
                d.[doc_type] AS DocType,
                d.[title] AS DocumentTitle,
                d.[process] AS Process,
                d.[module_name] AS ModuleName,
                d.[schema_name] AS SchemaName,
                d.[table_name] AS TableName,
                d.[source_path] AS SourcePath,
                CAST(0 AS int) AS TokenMatchCount
            FROM [ais].[t_ai_knowledge_chunk] c
            JOIN [ais].[t_ai_knowledge_document] d
                ON d.[knowledge_document_id] = c.[knowledge_document_id]
            WHERE c.[is_active] = 1
              AND d.[is_active] = 1
              AND (d.[process] IS NULL OR d.[process] = @Process)
            ORDER BY
                CASE WHEN d.[process] = @Process THEN 0 ELSE 1 END,
                d.[doc_type],
                c.[chunk_index];
            """;

        return await connection.QueryAsync<KnowledgeCandidateRow>(sql, new { Process = process });
    }

    private static int ScoreSchemaRow(SchemaCandidateRow row, IReadOnlyCollection<string> tokens, IReadOnlyCollection<TableScope> tableScopes)
    {
        var score = 0;
        var tableIsScoped = tableScopes.Any(scope =>
            string.Equals(scope.SchemaName, row.SchemaName, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(scope.TableName, row.TableName, StringComparison.OrdinalIgnoreCase));

        if (tableIsScoped)
        {
            score += 20;
        }

        var tableHaystack = $"{row.SchemaName} {row.TableName} {row.TableDescription}".ToLowerInvariant();
        var columnHaystack = $"{row.ColumnName} {row.ColumnDescription} {row.DataType}".ToLowerInvariant();
        var haystack = $"{tableHaystack} {columnHaystack}";
        foreach (var token in tokens)
        {
            if (tableHaystack.Contains(token, StringComparison.OrdinalIgnoreCase))
            {
                score += token.Length > 4 ? 8 : 4;
            }
            else if (columnHaystack.Contains(token, StringComparison.OrdinalIgnoreCase))
            {
                score += token.Length > 4 ? 5 : 2;
            }
        }

        if (tokens.Contains("inventory", StringComparer.OrdinalIgnoreCase) &&
            row.TableName.Contains("inventory", StringComparison.OrdinalIgnoreCase))
        {
            score += 15;
        }

        if (tokens.Contains("item", StringComparer.OrdinalIgnoreCase) &&
            row.TableName.Contains("item", StringComparison.OrdinalIgnoreCase))
        {
            score += 8;
        }

        if (!string.IsNullOrWhiteSpace(row.ColumnDescription))
        {
            score += 1;
        }

        if (!string.IsNullOrWhiteSpace(row.TableDescription))
        {
            score += 1;
        }

        return score;
    }

    private static double ScoreKnowledgeRow(
        KnowledgeCandidateRow row,
        IReadOnlyCollection<string> tokens,
        string process,
        float[] queryEmbedding)
    {
        double score = string.Equals(row.Process, process, StringComparison.OrdinalIgnoreCase) ? 20 : 0;
        score += row.TokenMatchCount * 10;

        var titleHaystack = $"{row.DocType} {row.DocumentTitle} {row.ChunkTitle} {row.ModuleName} {row.SchemaName} {row.TableName}".ToLowerInvariant();
        var contentHaystack = row.ChunkContent.ToLowerInvariant();

        foreach (var token in tokens)
        {
            if (titleHaystack.Contains(token, StringComparison.OrdinalIgnoreCase))
            {
                score += token.Length > 4 ? 8 : 4;
            }
            else if (contentHaystack.Contains(token, StringComparison.OrdinalIgnoreCase))
            {
                score += token.Length > 4 ? 5 : 2;
            }
        }

        if (row.IsEmbedded && TryParseEmbeddingJson(row.EmbeddingJson, out var chunkEmbedding))
        {
            var similarity = LocalTextEmbedding.CosineSimilarity(queryEmbedding, chunkEmbedding);
            if (similarity > 0)
            {
                var vectorWeight = string.Equals(row.EmbeddingProvider, LocalTextEmbedding.Provider, StringComparison.OrdinalIgnoreCase)
                    ? 25
                    : 100;
                score += similarity * vectorWeight;
            }
        }

        return score;
    }

    private static bool TryParseEmbeddingJson(string? value, out float[] vector)
    {
        vector = [];
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<float[]>(value);
            if (parsed is not { Length: > 0 })
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

    public async Task LogRetrievalAsync(
        long aiChatLogId,
        string process,
        string queryText,
        KnowledgeRetrievalResult retrievalResult)
    {
        if (retrievalResult.LogItems.Count == 0)
        {
            return;
        }

        try
        {
            const string sql = """
                INSERT INTO [ais].[t_ai_knowledge_retrieval_log] (
                    [ai_chat_log_id],
                    [knowledge_chunk_id],
                    [schema_catalog_id],
                    [schema_relation_id],
                    [retrieval_mode],
                    [similarity_score],
                    [rank_order],
                    [process],
                    [query_text],
                    [create_date]
                )
                VALUES (
                    @AiChatLogId,
                    @KnowledgeChunkId,
                    @SchemaCatalogId,
                    @SchemaRelationId,
                    @RetrievalMode,
                    @SimilarityScore,
                    @RankOrder,
                    @Process,
                    @QueryText,
                    GETDATE()
                );
                """;

            var rows = retrievalResult.LogItems.Select(item => new
            {
                AiChatLogId = aiChatLogId,
                item.KnowledgeChunkId,
                item.SchemaCatalogId,
                item.SchemaRelationId,
                item.RetrievalMode,
                item.SimilarityScore,
                item.RankOrder,
                Process = process,
                QueryText = queryText
            });

            using var connection = new SqlConnection(_connectionString);
            await connection.ExecuteAsync(sql, rows);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log RAG retrieval audit for chat {AiChatLogId}", aiChatLogId);
        }
    }

    private static string FormatContext(
        IReadOnlyCollection<ScoredKnowledgeRow> knowledgeRows,
        IReadOnlyCollection<ScoredSchemaRow> schemaRows,
        IReadOnlyCollection<SchemaRelationRow> relationRows,
        IReadOnlyCollection<SchemaOverviewRow> schemaOverviewRows)
    {
        if (knowledgeRows.Count == 0 && schemaRows.Count == 0 && relationRows.Count == 0 && schemaOverviewRows.Count == 0)
        {
            return string.Empty;
        }

        var builder = new StringBuilder();
        builder.AppendLine("=== RETRIEVED KNOWLEDGE CONTEXT ===");

        if (knowledgeRows.Count > 0)
        {
            var index = 1;
            foreach (var scored in knowledgeRows)
            {
                var row = scored.Row;
                builder.AppendLine($"[{index}] {row.DocType}: {row.DocumentTitle}");
                if (!string.IsNullOrWhiteSpace(row.ChunkTitle))
                {
                    builder.AppendLine($"Title: {row.ChunkTitle}");
                }

                builder.AppendLine(TrimForPrompt(row.ChunkContent, 1200));
                builder.AppendLine();
                index++;
            }
        }
        else
        {
            builder.AppendLine("No manual knowledge chunks matched this request.");
            builder.AppendLine();
        }

        builder.AppendLine("=== RETRIEVED SCHEMA DESCRIPTION CONTEXT ===");
        if (schemaOverviewRows.Count > 0)
        {
            builder.AppendLine("ALLOW ALL SCHEMA OVERVIEW:");
            foreach (var table in schemaOverviewRows.Take(120))
            {
                var columns = string.Join(", ", table.ColumnNames.Take(35));
                var extra = table.ColumnNames.Count > 35
                    ? $" ... (+{table.ColumnNames.Count - 35} more)"
                    : string.Empty;
                builder.AppendLine(
                    $"- {table.SchemaName}.{table.TableName} ({table.ColumnCount} columns): {columns}{extra}. " +
                    $"Description: {EmptyFallback(table.TableDescription)}");
            }

            builder.AppendLine();
        }

        if (schemaRows.Count > 0)
        {
            var availableTables = schemaRows
                .GroupBy(x => new { x.Row.SchemaName, x.Row.TableName })
                .Select(group => $"{group.Key.SchemaName}.{group.Key.TableName}")
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .Take(150)
                .ToList();

            if (availableTables.Count > 0)
            {
                builder.AppendLine("Available Tables:");
                foreach (var tableName in availableTables)
                {
                    builder.AppendLine($"- {tableName}");
                }
                builder.AppendLine();
            }

            foreach (var tableGroup in schemaRows.GroupBy(x => new { x.Row.SchemaName, x.Row.TableName }).Take(12))
            {
                var first = tableGroup.First().Row;
                builder.AppendLine($"Table: {first.SchemaName}.{first.TableName}");
                builder.AppendLine($"Description: {EmptyFallback(first.TableDescription)}");
                builder.AppendLine("Columns:");

                foreach (var scored in tableGroup.Take(20))
                {
                    var row = scored.Row;
                    var pk = row.IsPrimaryKey ? ", PK" : string.Empty;
                    var nullable = row.IsNullable ? "nullable" : "required";
                    builder.AppendLine($"- {row.ColumnName} ({row.DataType}, {nullable}{pk}): {EmptyFallback(row.ColumnDescription)}");
                }

                builder.AppendLine();
            }
        }
        else
        {
            builder.AppendLine("No schema descriptions matched this request.");
            builder.AppendLine();
        }

        if (relationRows.Count > 0)
        {
            builder.AppendLine("=== RETRIEVED SCHEMA RELATIONS ===");
            foreach (var relation in relationRows.Take(30))
            {
                builder.AppendLine(
                    $"- {relation.ParentSchemaName}.{relation.ParentTableName}.{relation.ParentColumnName} -> " +
                    $"{relation.ReferencedSchemaName}.{relation.ReferencedTableName}.{relation.ReferencedColumnName} " +
                    $"({relation.ForeignKeyName})");
            }

            builder.AppendLine();
        }

        builder.AppendLine("=== RAG SQL RULES ===");
        builder.AppendLine("- Prefer tables and columns from RETRIEVED SCHEMA DESCRIPTION CONTEXT.");
        builder.AppendLine("- Treat RETRIEVED KNOWLEDGE CONTEXT as mandatory business logic, not optional background text.");
        builder.AppendLine("- When the knowledge context describes filtering/allocation/release rules, translate every stated rule into SQL joins or WHERE predicates.");
        builder.AppendLine("- Carry request-specific constraints from source rows into downstream checks: status, warehouse/owner, item, lot_number, expiry_date, serial_number, location type, and other control fields when present.");
        builder.AppendLine("- Do not claim stock, allocation, or process eligibility from broad item-level rows when the knowledge rules require narrower constrained rows.");
        builder.AppendLine("- Do not guess table or column names that are not in page config or retrieved schema context.");
        builder.AppendLine("- If schema context is insufficient, answer that there is not enough schema information instead of inventing SQL.");

        return builder.ToString();
    }

    private static List<KnowledgeRetrievalLogItem> BuildLogItems(
        IReadOnlyCollection<ScoredKnowledgeRow> knowledgeRows,
        IReadOnlyCollection<ScoredSchemaRow> schemaRows,
        IReadOnlyCollection<SchemaRelationRow> relationRows)
    {
        var items = new List<KnowledgeRetrievalLogItem>();
        var rank = 1;

        foreach (var scored in knowledgeRows.Take(MaxKnowledgeChunks))
        {
            items.Add(new KnowledgeRetrievalLogItem
            {
                KnowledgeChunkId = scored.Row.KnowledgeChunkId,
                RetrievalMode = "vector_keyword",
                SimilarityScore = ToScore(scored.Score),
                RankOrder = rank++
            });
        }

        foreach (var scored in schemaRows.Take(80))
        {
            items.Add(new KnowledgeRetrievalLogItem
            {
                SchemaCatalogId = scored.Row.SchemaCatalogId,
                RetrievalMode = "schema",
                SimilarityScore = ToScore(scored.Score),
                RankOrder = rank++
            });
        }

        foreach (var relation in relationRows.Take(30))
        {
            items.Add(new KnowledgeRetrievalLogItem
            {
                SchemaRelationId = relation.SchemaRelationId,
                RetrievalMode = "relation",
                RankOrder = rank++
            });
        }

        return items;
    }

    private static decimal? ToScore(double score) =>
        score <= 0 ? null : Math.Round((decimal)score, 6);

    private static List<TableScope> ParseAllowedTables(string? allowedTables)
    {
        if (string.IsNullOrWhiteSpace(allowedTables))
        {
            return [];
        }

        var rawValues = new List<string>();
        try
        {
            var parsed = JsonSerializer.Deserialize<List<string>>(allowedTables);
            if (parsed is { Count: > 0 })
            {
                rawValues.AddRange(parsed);
            }
        }
        catch
        {
            rawValues.AddRange(allowedTables.Split([',', ';', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries));
        }

        return rawValues
            .Select(value => value.Trim().Trim('[', ']', '"', '\''))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Where(value => !IsWildcardAllowedValue(value))
            .Select(value =>
            {
                var parts = value.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                return parts.Length >= 2
                    ? new TableScope(parts[^2], parts[^1])
                    : new TableScope("dbo", parts[0]);
            })
            .DistinctBy(value => value.FullName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static bool ContainsWildcardAllowedValue(string? allowedTables)
    {
        if (string.IsNullOrWhiteSpace(allowedTables))
        {
            return false;
        }

        var rawValues = new List<string>();
        try
        {
            var parsed = JsonSerializer.Deserialize<List<string>>(allowedTables);
            if (parsed is { Count: > 0 })
            {
                rawValues.AddRange(parsed);
            }
        }
        catch
        {
            rawValues.AddRange(allowedTables.Split([',', ';', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries));
        }

        return rawValues.Any(value => IsWildcardAllowedValue(value));
    }

    private static bool IsWildcardAllowedValue(string value)
    {
        var normalized = value.Trim().Trim('[', ']', '"', '\'');
        return normalized is "*" or "*.*" or "all" or "ALL";
    }

    private static List<string> ExtractSearchTokens(string userMessage, string process, IReadOnlyCollection<TableScope> tableScopes)
    {
        var raw = $"{userMessage} {process} {string.Join(' ', tableScopes.Select(x => x.TableName))}";
        var tokens = Regex.Matches(raw.ToLowerInvariant(), @"[\p{L}\p{N}_]+")
            .Select(match => match.Value)
            .Where(token => token.Length >= 2)
            .Where(token => !StopWords.Contains(token))
            .Distinct()
            .Take(40)
            .ToList();

        return tokens;
    }

    private static string EscapeLikeToken(string token) =>
        token
            .Replace(@"\", @"\\")
            .Replace("%", @"\%")
            .Replace("_", @"\_")
            .Replace("[", @"\[");

    private static string TrimForPrompt(string value, int maxLength)
    {
        if (value.Length <= maxLength)
        {
            return value;
        }

        return value[..maxLength] + "...";
    }

    private static string EmptyFallback(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "(no description)" : value.Trim();

    private static List<string> SplitColumnList(string? columnList) =>
        string.IsNullOrWhiteSpace(columnList)
            ? []
            : columnList
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .ToList();

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "the", "and", "for", "with", "from", "this", "that", "show", "list", "get",
        "ของ", "ฉัน", "ผม", "ช่วย", "ขอ", "ดู", "หา", "รายการ", "ข้อมูล"
    };

    private sealed record TableScope(string SchemaName, string TableName)
    {
        public string FullName => $"{SchemaName}.{TableName}";
    }

    private sealed record SchemaOverviewRow(
        string SchemaName,
        string TableName,
        string? TableDescription,
        List<string> ColumnNames,
        int ColumnCount);

    private sealed record ScoredSchemaRow(SchemaCandidateRow Row, int Score);
    private sealed record ScoredKnowledgeRow(KnowledgeCandidateRow Row, double Score);

    private sealed class SchemaOverviewRecord
    {
        public string SchemaName { get; set; } = string.Empty;
        public string TableName { get; set; } = string.Empty;
        public string? TableDescription { get; set; }
        public string? ColumnList { get; set; }
        public int ColumnCount { get; set; }
    }

    private sealed class SchemaCandidateRow
    {
        public long SchemaCatalogId { get; set; }
        public string SchemaName { get; set; } = string.Empty;
        public string TableName { get; set; } = string.Empty;
        public string? TableDescription { get; set; }
        public string ColumnName { get; set; } = string.Empty;
        public string? ColumnDescription { get; set; }
        public string DataType { get; set; } = string.Empty;
        public bool IsNullable { get; set; }
        public bool IsPrimaryKey { get; set; }
        public int ColumnId { get; set; }
    }

    private sealed class SchemaRelationRow
    {
        public long SchemaRelationId { get; set; }
        public string ForeignKeyName { get; set; } = string.Empty;
        public string ParentSchemaName { get; set; } = string.Empty;
        public string ParentTableName { get; set; } = string.Empty;
        public string ParentColumnName { get; set; } = string.Empty;
        public string ReferencedSchemaName { get; set; } = string.Empty;
        public string ReferencedTableName { get; set; } = string.Empty;
        public string ReferencedColumnName { get; set; } = string.Empty;
        public string? RelationDescription { get; set; }
    }

    private sealed class KnowledgeCandidateRow
    {
        public long KnowledgeChunkId { get; set; }
        public int ChunkIndex { get; set; }
        public string? ChunkTitle { get; set; }
        public string ChunkContent { get; set; } = string.Empty;
        public string? EmbeddingJson { get; set; }
        public string? EmbeddingProvider { get; set; }
        public string? EmbeddingModel { get; set; }
        public bool IsEmbedded { get; set; }
        public string DocType { get; set; } = string.Empty;
        public string DocumentTitle { get; set; } = string.Empty;
        public string? Process { get; set; }
        public string? ModuleName { get; set; }
        public string? SchemaName { get; set; }
        public string? TableName { get; set; }
        public string? SourcePath { get; set; }
        public int TokenMatchCount { get; set; }
    }
}

