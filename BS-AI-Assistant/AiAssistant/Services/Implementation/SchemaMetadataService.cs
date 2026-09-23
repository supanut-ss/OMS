using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Reads SQL Server metadata views and upserts them into the AI schema catalog.
/// </summary>
public class SchemaMetadataService : ISchemaMetadataService
{
    private readonly string _connectionString;
    private readonly ILogger<SchemaMetadataService> _logger;

    public SchemaMetadataService(IConfiguration configuration, ILogger<SchemaMetadataService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _logger = logger;
    }

    public async Task<SchemaSyncResponse> SyncSchemaCatalogAsync()
    {
        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            using var transaction = connection.BeginTransaction();

            var sourceColumnCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM [ais].[v_ai_schema_metadata_source]",
                transaction: transaction);

            await connection.ExecuteAsync(SyncSchemaCatalogSql, transaction: transaction, commandTimeout: 120);
            await connection.ExecuteAsync(DeactivateMissingSchemaCatalogSql, transaction: transaction, commandTimeout: 120);

            var sourceRelationCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM [ais].[v_ai_schema_relation_source]",
                transaction: transaction);

            await connection.ExecuteAsync(SyncSchemaRelationSql, transaction: transaction, commandTimeout: 120);
            await connection.ExecuteAsync(DeactivateMissingSchemaRelationSql, transaction: transaction, commandTimeout: 120);

            var activeCatalogColumnCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM [ais].[t_ai_schema_catalog] WHERE [is_active] = 1",
                transaction: transaction);

            var activeRelationCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM [ais].[t_ai_schema_relation] WHERE [is_active] = 1",
                transaction: transaction);

            transaction.Commit();

            _logger.LogInformation(
                "Schema metadata sync completed. Columns: {ColumnCount}, Relations: {RelationCount}",
                activeCatalogColumnCount,
                activeRelationCount);

            return new SchemaSyncResponse
            {
                Success = true,
                SourceColumnCount = sourceColumnCount,
                ActiveCatalogColumnCount = activeCatalogColumnCount,
                SourceRelationCount = sourceRelationCount,
                ActiveRelationCount = activeRelationCount,
                SyncedAtUtc = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Schema metadata sync failed");
            return new SchemaSyncResponse
            {
                Success = false,
                SyncedAtUtc = DateTime.UtcNow,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<SchemaCatalogPreviewResponse> GetSchemaCatalogPreviewAsync(string? schemaName, string? tableName, int limit)
    {
        try
        {
            const string sql = """
                SELECT TOP (@Limit)
                    [schema_name] AS SchemaName,
                    [table_name] AS TableName,
                    [table_description] AS TableDescription,
                    [column_name] AS ColumnName,
                    [data_type] AS DataType,
                    [is_nullable] AS IsNullable,
                    [is_primary_key] AS IsPrimaryKey,
                    [column_description] AS ColumnDescription
                FROM [ais].[t_ai_schema_catalog]
                WHERE [is_active] = 1
                  AND (@SchemaName IS NULL OR [schema_name] = @SchemaName)
                  AND (@TableName IS NULL OR [table_name] = @TableName)
                ORDER BY [schema_name], [table_name], [column_id];
                """;

            using var connection = new SqlConnection(_connectionString);
            var items = await connection.QueryAsync<SchemaCatalogPreviewItem>(
                sql,
                new
                {
                    SchemaName = string.IsNullOrWhiteSpace(schemaName) ? null : schemaName,
                    TableName = string.IsNullOrWhiteSpace(tableName) ? null : tableName,
                    Limit = Math.Clamp(limit, 1, 500)
                });

            return new SchemaCatalogPreviewResponse
            {
                Success = true,
                Items = items
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read schema catalog preview");
            return new SchemaCatalogPreviewResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    private const string SyncSchemaCatalogSql = """
        MERGE [ais].[t_ai_schema_catalog] AS target
        USING (
            SELECT
                [schema_name],
                [table_name],
                [table_description],
                [column_name],
                [column_description],
                [data_type],
                [max_length],
                [precision_value],
                [scale_value],
                [is_nullable],
                [is_primary_key],
                [is_identity],
                [object_id],
                [column_id],
                CONVERT(NVARCHAR(128), HASHBYTES('SHA2_256',
                    CONCAT(
                        [schema_name], '|', [table_name], '|', ISNULL([table_description], ''),
                        '|', [column_name], '|', ISNULL([column_description], ''),
                        '|', [data_type], '|', [max_length], '|', [precision_value],
                        '|', [scale_value], '|', [is_nullable], '|', [is_primary_key], '|', [is_identity]
                    )
                ), 2) AS [metadata_hash]
            FROM [ais].[v_ai_schema_metadata_source]
        ) AS source
        ON target.[schema_name] = source.[schema_name]
           AND target.[table_name] = source.[table_name]
           AND target.[column_name] = source.[column_name]
        WHEN MATCHED THEN
            UPDATE SET
                [table_description] = source.[table_description],
                [column_description] = source.[column_description],
                [data_type] = source.[data_type],
                [max_length] = source.[max_length],
                [precision_value] = source.[precision_value],
                [scale_value] = source.[scale_value],
                [is_nullable] = source.[is_nullable],
                [is_primary_key] = source.[is_primary_key],
                [is_identity] = source.[is_identity],
                [object_id] = source.[object_id],
                [column_id] = source.[column_id],
                [metadata_hash] = source.[metadata_hash],
                [last_synced_date] = GETDATE(),
                [is_active] = 1
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (
                [schema_name], [table_name], [table_description], [column_name],
                [column_description], [data_type], [max_length], [precision_value],
                [scale_value], [is_nullable], [is_primary_key], [is_identity],
                [object_id], [column_id], [metadata_hash], [last_synced_date], [is_active]
            )
            VALUES (
                source.[schema_name], source.[table_name], source.[table_description], source.[column_name],
                source.[column_description], source.[data_type], source.[max_length], source.[precision_value],
                source.[scale_value], source.[is_nullable], source.[is_primary_key], source.[is_identity],
                source.[object_id], source.[column_id], source.[metadata_hash], GETDATE(), 1
            );
        """;

    private const string DeactivateMissingSchemaCatalogSql = """
        UPDATE target
        SET [is_active] = 0,
            [last_synced_date] = GETDATE()
        FROM [ais].[t_ai_schema_catalog] target
        WHERE NOT EXISTS (
            SELECT 1
            FROM [ais].[v_ai_schema_metadata_source] source
            WHERE source.[schema_name] = target.[schema_name]
              AND source.[table_name] = target.[table_name]
              AND source.[column_name] = target.[column_name]
        );
        """;

    private const string SyncSchemaRelationSql = """
        MERGE [ais].[t_ai_schema_relation] AS target
        USING [ais].[v_ai_schema_relation_source] AS source
        ON target.[foreign_key_name] = source.[foreign_key_name]
           AND target.[parent_schema_name] = source.[parent_schema_name]
           AND target.[parent_table_name] = source.[parent_table_name]
           AND target.[parent_column_name] = source.[parent_column_name]
           AND target.[referenced_schema_name] = source.[referenced_schema_name]
           AND target.[referenced_table_name] = source.[referenced_table_name]
           AND target.[referenced_column_name] = source.[referenced_column_name]
        WHEN MATCHED THEN
            UPDATE SET
                [relation_description] = source.[relation_description],
                [object_id] = source.[object_id],
                [constraint_column_id] = source.[constraint_column_id],
                [last_synced_date] = GETDATE(),
                [is_active] = 1
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (
                [foreign_key_name], [parent_schema_name], [parent_table_name], [parent_column_name],
                [referenced_schema_name], [referenced_table_name], [referenced_column_name],
                [relation_description], [object_id], [constraint_column_id], [last_synced_date], [is_active]
            )
            VALUES (
                source.[foreign_key_name], source.[parent_schema_name], source.[parent_table_name], source.[parent_column_name],
                source.[referenced_schema_name], source.[referenced_table_name], source.[referenced_column_name],
                source.[relation_description], source.[object_id], source.[constraint_column_id], GETDATE(), 1
            );
        """;

    private const string DeactivateMissingSchemaRelationSql = """
        UPDATE target
        SET [is_active] = 0,
            [last_synced_date] = GETDATE()
        FROM [ais].[t_ai_schema_relation] target
        WHERE NOT EXISTS (
            SELECT 1
            FROM [ais].[v_ai_schema_relation_source] source
            WHERE source.[foreign_key_name] = target.[foreign_key_name]
              AND source.[parent_schema_name] = target.[parent_schema_name]
              AND source.[parent_table_name] = target.[parent_table_name]
              AND source.[parent_column_name] = target.[parent_column_name]
              AND source.[referenced_schema_name] = target.[referenced_schema_name]
              AND source.[referenced_table_name] = target.[referenced_table_name]
              AND source.[referenced_column_name] = target.[referenced_column_name]
        );
        """;
}
