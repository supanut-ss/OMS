using System.Data.Common;
using ApiCore.Services.Interfaces;
using Npgsql;

namespace ApiCore.Services.Implementation.Dialects
{
    /// <summary>
    /// PostgreSQL dialect implementation.
    /// Provides PostgreSQL-specific SQL syntax and connection handling.
    /// </summary>
    public class PostgreSqlDialect : ISqlDialect
    {
        public DatabaseProvider Provider => DatabaseProvider.PostgreSql;

        public string ParameterPrefix => "@";

        public string StringConcatOperator => "||";

        public DbConnection CreateConnection(string connectionString)
        {
            return new NpgsqlConnection(connectionString);
        }

        public DbParameter CreateParameter(string name, object value)
        {
            return new NpgsqlParameter(name, value ?? DBNull.Value);
        }

        public DbCommand CreateCommand(string query, DbConnection connection)
        {
            var command = new NpgsqlCommand(query, (NpgsqlConnection)connection);
            return command;
        }

        public string QuoteIdentifier(string identifier)
        {
            return $"\"{identifier}\"";
        }

        public string QuoteTable(string schemaName, string tableName)
        {
            return $"\"{schemaName}\".\"{tableName}\"";
        }

        public string BuildPaginationClause(string offsetParam, string pageSizeParam)
        {
            return $"LIMIT {pageSizeParam} OFFSET {offsetParam}";
        }

        public string GetColumnMetadataQuery()
        {
            return @"
                SELECT 
                    c.column_name AS ""COLUMN_NAME"",
                    c.data_type AS ""DATA_TYPE"",
                    c.is_nullable AS ""IS_NULLABLE"",
                    c.character_maximum_length AS ""CHARACTER_MAXIMUM_LENGTH"",
                    c.numeric_precision AS ""NUMERIC_PRECISION"",
                    c.numeric_scale AS ""NUMERIC_SCALE"",
                    c.column_default AS ""COLUMN_DEFAULT"",
                    CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS ""IS_PRIMARY_KEY"",
                    CASE WHEN c.column_default LIKE 'nextval%' THEN 1 ELSE 0 END AS ""IS_IDENTITY"",
                    pgd.description AS ""COLUMN_DESCRIPTION""
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT ku.table_name, ku.column_name, ku.table_schema
                    FROM information_schema.table_constraints tc
                    INNER JOIN information_schema.key_column_usage ku
                        ON tc.constraint_name = ku.constraint_name
                        AND tc.table_schema = ku.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                ) pk ON c.table_name = pk.table_name 
                    AND c.column_name = pk.column_name
                    AND c.table_schema = pk.table_schema
                LEFT JOIN pg_catalog.pg_statio_all_tables st
                    ON st.schemaname = c.table_schema AND st.relname = c.table_name
                LEFT JOIN pg_catalog.pg_description pgd
                    ON pgd.objoid = st.relid
                    AND pgd.objsubid = c.ordinal_position
                WHERE c.table_name = @TableName 
                    AND c.table_schema = @SchemaName
                ORDER BY c.ordinal_position";
        }

        public string GetSchemaQuery()
        {
            return @"
                -- Tables
                SELECT 
                    t.table_name AS ""TABLE_NAME"",
                    t.table_schema AS ""TABLE_SCHEMA"",
                    'Table' AS ""TABLE_TYPE"",
                    COALESCE(s.n_live_tup, 0)::int AS ""ROW_COUNT"",
                    NULL::timestamp AS ""create_date"",
                    NULL::timestamp AS ""modify_date""
                FROM information_schema.tables t
                LEFT JOIN pg_stat_user_tables s 
                    ON s.schemaname = t.table_schema AND s.relname = t.table_name
                WHERE t.table_type = 'BASE TABLE'
                    AND t.table_schema LIKE @SchemaPattern
                    AND t.table_name LIKE @SearchPattern
                    AND t.table_schema IN ('public', 'app', 'data')
                    AND t.table_name NOT IN ('__EFMigrationsHistory')

                UNION ALL

                -- Views
                SELECT 
                    v.table_name AS ""TABLE_NAME"",
                    v.table_schema AS ""TABLE_SCHEMA"",
                    'View' AS ""TABLE_TYPE"",
                    0 AS ""ROW_COUNT"",
                    NULL::timestamp AS ""create_date"",
                    NULL::timestamp AS ""modify_date""
                FROM information_schema.views v
                WHERE v.table_schema LIKE @SchemaPattern
                    AND v.table_name LIKE @SearchPattern
                    AND v.table_schema IN ('public', 'app', 'data')

                ORDER BY ""TABLE_SCHEMA"", ""TABLE_NAME""";
        }

        public string GetStoredProcedureListQuery()
        {
            return @"
                SELECT 
                    p.proname AS ""PROCEDURE_NAME"",
                    n.nspname AS ""SCHEMA_NAME"",
                    NULL::timestamp AS ""create_date"",
                    NULL::timestamp AS ""modify_date""
                FROM pg_proc p
                INNER JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname LIKE @SchemaPattern
                    AND p.proname LIKE @SearchPattern
                    AND n.nspname IN ('public', 'app', 'data')
                    AND p.prokind IN ('p', 'f')
                ORDER BY n.nspname, p.proname";
        }

        public string GetStoredProcedureMetadataQuery()
        {
            return @"
                SELECT 
                    p.proname AS ""PROCEDURE_NAME"",
                    n.nspname AS ""SCHEMA_NAME"",
                    NULL::timestamp AS ""create_date"",
                    NULL::timestamp AS ""modify_date"",
                    unnest(p.proargnames) AS ""PARAMETER_NAME"",
                    unnest(string_to_array(pg_get_function_arguments(p.oid), ', ')) AS ""DATA_TYPE"",
                    false AS ""is_output"",
                    false AS ""has_default_value"",
                    NULL AS ""default_value"",
                    NULL::smallint AS ""max_length""
                FROM pg_proc p
                INNER JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE p.proname = @ProcedureName 
                    AND n.nspname = @SchemaName
                    AND p.prokind IN ('p', 'f')";
        }

        public string GetTableExistsQuery()
        {
            return @"
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = @TableName 
                    AND table_schema = @SchemaName";
        }

        public string BuildInsertReturning(string schemaName, string tableName, string columns, string values)
        {
            return $@"
                INSERT INTO ""{schemaName}"".""{tableName}"" ({columns})
                VALUES ({values})
                RETURNING *";
        }

        public string BuildUpdateReturning(string schemaName, string tableName, string setClause, string whereClause)
        {
            return $@"
                UPDATE ""{schemaName}"".""{tableName}""
                SET {setClause}
                WHERE {whereClause}
                RETURNING *";
        }

        public string BuildCastToText(string tableAlias, string columnName)
        {
            return $"{tableAlias}.\"{columnName}\"::TEXT";
        }

        public string BuildDataGridQuery(string selectColumns, string fromClause, string whereClause,
            string orderByClause, string? groupByClause = null)
        {
            if (!string.IsNullOrEmpty(groupByClause))
            {
                return $@"
                    SELECT {selectColumns}
                    FROM {fromClause}
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                    {groupByClause}
                    {orderByClause};
                    
                    SELECT COUNT(*) as ""TotalCount"" FROM (
                        SELECT 1 as dummy
                        FROM {fromClause}
                        {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                        {groupByClause}
                    ) as grouped;";
            }
            else
            {
                // PostgreSQL: use two separate queries (no variable declarations)
                return $@"
                    SELECT COUNT(*) as ""TotalCount""
                    FROM {fromClause}
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")};
                    
                    SELECT {selectColumns}
                    FROM {fromClause}
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                    {orderByClause}
                    LIMIT @PageSize OFFSET @Offset;";
            }
        }

        public string BuildCoalesce(string expression, string defaultValue)
        {
            return $"COALESCE({expression}, {defaultValue})";
        }

        public bool IsStoredProcedureNotFoundError(Exception ex)
        {
            return ex is NpgsqlException npgEx &&
                   (npgEx.Message.Contains("does not exist") || npgEx.Message.Contains("function") || npgEx.Message.Contains("procedure"));
        }

        public string GetSpParameterMappingQuery()
        {
            return @"
                SELECT 
                    '$' || (row_number() OVER ())::text AS ""PARAMETER_NAME""
                FROM pg_proc p
                INNER JOIN pg_namespace n ON p.pronamespace = n.oid
                CROSS JOIN unnest(COALESCE(p.proargnames, ARRAY[]::text[])) AS param_name
                WHERE p.proname = @ProcedureName
                    AND n.nspname = @SchemaName
                    AND p.prokind IN ('p', 'f')
                ORDER BY 1";
        }
    }
}
