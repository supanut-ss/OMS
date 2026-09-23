using System.Data.Common;
using ApiCore.Services.Interfaces;
using MySqlConnector;

namespace ApiCore.Services.Implementation.Dialects
{
    /// <summary>
    /// MySQL / MariaDB dialect implementation.
    /// Provides MySQL-specific SQL syntax and connection handling.
    /// Uses backtick quoting and LIMIT/OFFSET pagination.
    /// </summary>
    public class MySqlDialect : ISqlDialect
    {
        public DatabaseProvider Provider => DatabaseProvider.MySql;

        public string ParameterPrefix => "@";

        public string StringConcatOperator => "||";

        public DbConnection CreateConnection(string connectionString)
        {
            return new MySqlConnection(connectionString);
        }

        public DbParameter CreateParameter(string name, object value)
        {
            return new MySqlParameter(name, value ?? DBNull.Value);
        }

        public DbCommand CreateCommand(string query, DbConnection connection)
        {
            return new MySqlCommand(query, (MySqlConnection)connection);
        }

        public string QuoteIdentifier(string identifier)
        {
            return $"`{identifier}`";
        }

        public string QuoteTable(string schemaName, string tableName)
        {
            return $"`{schemaName}`.`{tableName}`";
        }

        public string BuildPaginationClause(string offsetParam, string pageSizeParam)
        {
            return $"LIMIT {pageSizeParam} OFFSET {offsetParam}";
        }

        public string GetColumnMetadataQuery()
        {
            return @"
                SELECT 
                    c.COLUMN_NAME,
                    c.DATA_TYPE,
                    c.IS_NULLABLE,
                    c.CHARACTER_MAXIMUM_LENGTH,
                    c.NUMERIC_PRECISION,
                    c.NUMERIC_SCALE,
                    c.COLUMN_DEFAULT,
                    CASE WHEN kcu.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IS_PRIMARY_KEY,
                    CASE WHEN c.EXTRA LIKE '%auto_increment%' THEN 1 ELSE 0 END AS IS_IDENTITY,
                    NULL AS COLUMN_DESCRIPTION
                FROM information_schema.COLUMNS c
                LEFT JOIN (
                    SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME, kcu.TABLE_SCHEMA
                    FROM information_schema.TABLE_CONSTRAINTS tc
                    INNER JOIN information_schema.KEY_COLUMN_USAGE kcu
                        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                        AND tc.TABLE_NAME = kcu.TABLE_NAME
                    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                ) kcu ON c.TABLE_NAME = kcu.TABLE_NAME
                    AND c.COLUMN_NAME = kcu.COLUMN_NAME
                    AND c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                WHERE c.TABLE_NAME = @TableName
                    AND c.TABLE_SCHEMA = @SchemaName
                ORDER BY c.ORDINAL_POSITION";
        }

        public string GetSchemaQuery()
        {
            return @"
                -- Tables
                SELECT 
                    t.TABLE_NAME,
                    t.TABLE_SCHEMA,
                    'Table' AS TABLE_TYPE,
                    COALESCE(t.TABLE_ROWS, 0) AS ROW_COUNT,
                    t.CREATE_TIME AS create_date,
                    t.UPDATE_TIME AS modify_date
                FROM information_schema.TABLES t
                WHERE t.TABLE_TYPE = 'BASE TABLE'
                    AND t.TABLE_SCHEMA LIKE @SchemaPattern
                    AND t.TABLE_NAME LIKE @SearchPattern
                    AND t.TABLE_NAME NOT IN ('__EFMigrationsHistory')

                UNION ALL

                -- Views
                SELECT 
                    v.TABLE_NAME,
                    v.TABLE_SCHEMA,
                    'View' AS TABLE_TYPE,
                    0 AS ROW_COUNT,
                    NULL AS create_date,
                    NULL AS modify_date
                FROM information_schema.VIEWS v
                WHERE v.TABLE_SCHEMA LIKE @SchemaPattern
                    AND v.TABLE_NAME LIKE @SearchPattern

                ORDER BY TABLE_SCHEMA, TABLE_NAME";
        }

        public string GetStoredProcedureListQuery()
        {
            return @"
                SELECT 
                    r.ROUTINE_NAME AS PROCEDURE_NAME,
                    r.ROUTINE_SCHEMA AS SCHEMA_NAME,
                    r.CREATED AS create_date,
                    r.LAST_ALTERED AS modify_date
                FROM information_schema.ROUTINES r
                WHERE r.ROUTINE_SCHEMA LIKE @SchemaPattern
                    AND r.ROUTINE_NAME LIKE @SearchPattern
                    AND r.ROUTINE_TYPE IN ('PROCEDURE', 'FUNCTION')
                ORDER BY r.ROUTINE_SCHEMA, r.ROUTINE_NAME";
        }

        public string GetStoredProcedureMetadataQuery()
        {
            return @"
                SELECT 
                    r.ROUTINE_NAME AS PROCEDURE_NAME,
                    r.ROUTINE_SCHEMA AS SCHEMA_NAME,
                    r.CREATED AS create_date,
                    r.LAST_ALTERED AS modify_date,
                    p.PARAMETER_NAME,
                    p.DATA_TYPE,
                    CASE WHEN p.PARAMETER_MODE = 'OUT' OR p.PARAMETER_MODE = 'INOUT' THEN 1 ELSE 0 END AS is_output,
                    0 AS has_default_value,
                    NULL AS default_value,
                    p.CHARACTER_MAXIMUM_LENGTH AS max_length
                FROM information_schema.ROUTINES r
                LEFT JOIN information_schema.PARAMETERS p
                    ON r.ROUTINE_NAME = p.SPECIFIC_NAME
                    AND r.ROUTINE_SCHEMA = p.SPECIFIC_SCHEMA
                WHERE r.ROUTINE_NAME = @ProcedureName
                    AND r.ROUTINE_SCHEMA = @SchemaName
                ORDER BY p.ORDINAL_POSITION";
        }

        public string GetTableExistsQuery()
        {
            return @"
                SELECT COUNT(*)
                FROM information_schema.TABLES
                WHERE TABLE_NAME = @TableName
                    AND TABLE_SCHEMA = @SchemaName";
        }

        public string BuildInsertReturning(string schemaName, string tableName, string columns, string values)
        {
            // MySQL does not support OUTPUT/RETURNING.
            // Insert then select the last inserted row by LAST_INSERT_ID().
            return $@"
                INSERT INTO `{schemaName}`.`{tableName}` ({columns})
                VALUES ({values});
                SELECT * FROM `{schemaName}`.`{tableName}` WHERE id = LAST_INSERT_ID()";
        }

        public string BuildUpdateReturning(string schemaName, string tableName, string setClause, string whereClause)
        {
            // MySQL does not support OUTPUT/RETURNING.
            // Update then select the modified rows.
            return $@"
                UPDATE `{schemaName}`.`{tableName}`
                SET {setClause}
                WHERE {whereClause};
                SELECT * FROM `{schemaName}`.`{tableName}` WHERE {whereClause}";
        }

        public string BuildCastToText(string tableAlias, string columnName)
        {
            return $"CAST({tableAlias}.`{columnName}` AS CHAR)";
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

                    SELECT COUNT(*) AS TotalCount FROM (
                        SELECT 1 AS dummy
                        FROM {fromClause}
                        {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                        {groupByClause}
                    ) AS grouped;";
            }
            else
            {
                // MySQL: use two separate queries (COUNT then paginated data)
                return $@"
                    SELECT COUNT(*) AS TotalCount
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
            return ex is MySqlException mysqlEx &&
                   (mysqlEx.Message.Contains("PROCEDURE") || mysqlEx.Message.Contains("does not exist"));
        }

        public string GetSpParameterMappingQuery()
        {
            return @"
                SELECT 
                    p.PARAMETER_NAME
                FROM information_schema.PARAMETERS p
                WHERE p.SPECIFIC_SCHEMA = @SchemaName
                    AND p.SPECIFIC_NAME = @ProcedureName
                    AND p.PARAMETER_NAME IS NOT NULL
                ORDER BY p.ORDINAL_POSITION";
        }
    }
}
