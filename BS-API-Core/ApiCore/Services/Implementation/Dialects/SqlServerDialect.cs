using System.Data.Common;
using Microsoft.Data.SqlClient;
using ApiCore.Services.Interfaces;

namespace ApiCore.Services.Implementation.Dialects
{
    /// <summary>
    /// SQL Server dialect implementation.
    /// Provides SQL Server-specific SQL syntax and connection handling.
    /// </summary>
    public class SqlServerDialect : ISqlDialect
    {
        public DatabaseProvider Provider => DatabaseProvider.SqlServer;

        public string ParameterPrefix => "@";

        public string StringConcatOperator => "+";

        public DbConnection CreateConnection(string connectionString)
        {
            return new SqlConnection(connectionString);
        }

        public DbParameter CreateParameter(string name, object value)
        {
            return new SqlParameter(name, value ?? DBNull.Value);
        }

        public DbCommand CreateCommand(string query, DbConnection connection)
        {
            var command = new SqlCommand(query, (SqlConnection)connection);
            return command;
        }

        public string QuoteIdentifier(string identifier)
        {
            return $"[{identifier}]";
        }

        public string QuoteTable(string schemaName, string tableName)
        {
            return $"[{schemaName}].[{tableName}]";
        }

        public string BuildPaginationClause(string offsetParam, string pageSizeParam)
        {
            return $"OFFSET {offsetParam} ROWS FETCH NEXT {pageSizeParam} ROWS ONLY";
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
                    CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IS_PRIMARY_KEY,
                    COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS IS_IDENTITY,
                    ep.value AS COLUMN_DESCRIPTION
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN (
                    SELECT ku.TABLE_NAME, ku.COLUMN_NAME, ku.TABLE_SCHEMA
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                        AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
                    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                ) pk ON c.TABLE_NAME = pk.TABLE_NAME 
                    AND c.COLUMN_NAME = pk.COLUMN_NAME
                    AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
                LEFT JOIN sys.extended_properties ep 
                    ON ep.major_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME)
                    AND ep.minor_id = (
                        SELECT column_id 
                        FROM sys.columns 
                        WHERE object_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME) 
                        AND name = c.COLUMN_NAME
                    )
                    AND ep.name = 'MS_Description'
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
                    'Table' as TABLE_TYPE,
                    ISNULL(p.rows, 0) as ROW_COUNT,
                    o.create_date,
                    o.modify_date
                FROM INFORMATION_SCHEMA.TABLES t
                LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME AND st.schema_id = SCHEMA_ID(t.TABLE_SCHEMA)
                LEFT JOIN sys.partitions p ON st.object_id = p.object_id AND p.index_id IN (0,1)
                LEFT JOIN sys.objects o ON st.object_id = o.object_id
                WHERE t.TABLE_TYPE = 'BASE TABLE'
                    AND t.TABLE_SCHEMA LIKE @SchemaPattern
                    AND t.TABLE_NAME LIKE @SearchPattern
                    AND t.TABLE_SCHEMA IN ('dbo', 'app', 'data')
                    AND t.TABLE_NAME NOT IN ('sysdiagrams', '__EFMigrationsHistory')

                UNION ALL

                -- Views
                SELECT 
                    v.TABLE_NAME,
                    v.TABLE_SCHEMA,
                    'View' as TABLE_TYPE,
                    0 as ROW_COUNT,
                    o.create_date,
                    o.modify_date
                FROM INFORMATION_SCHEMA.VIEWS v
                LEFT JOIN sys.views sv ON sv.name = v.TABLE_NAME AND sv.schema_id = SCHEMA_ID(v.TABLE_SCHEMA)
                LEFT JOIN sys.objects o ON sv.object_id = o.object_id
                WHERE v.TABLE_SCHEMA LIKE @SchemaPattern
                    AND v.TABLE_NAME LIKE @SearchPattern
                    AND v.TABLE_SCHEMA IN ('dbo', 'app', 'data')

                ORDER BY TABLE_SCHEMA, TABLE_NAME";
        }

        public string GetStoredProcedureListQuery()
        {
            return @"
                SELECT 
                    p.name AS PROCEDURE_NAME,
                    s.name AS SCHEMA_NAME,
                    p.create_date,
                    p.modify_date
                FROM sys.procedures p
                INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
                WHERE s.name LIKE @SchemaPattern
                    AND p.name LIKE @SearchPattern
                    AND s.name IN ('dbo', 'app', 'data')
                ORDER BY s.name, p.name";
        }

        public string GetStoredProcedureMetadataQuery()
        {
            return @"
                SELECT 
                    p.name AS PROCEDURE_NAME,
                    s.name AS SCHEMA_NAME,
                    p.create_date,
                    p.modify_date,
                    pr.name AS PARAMETER_NAME,
                    t.name AS DATA_TYPE,
                    pr.is_output,
                    pr.has_default_value,
                    pr.default_value,
                    pr.max_length
                FROM sys.procedures p
                INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
                LEFT JOIN sys.parameters pr ON p.object_id = pr.object_id
                LEFT JOIN sys.types t ON pr.user_type_id = t.user_type_id
                WHERE p.name = @ProcedureName 
                    AND s.name = @SchemaName
                ORDER BY pr.parameter_id";
        }

        public string GetTableExistsQuery()
        {
            return @"
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = @TableName 
                    AND TABLE_SCHEMA = @SchemaName";
        }

        public string BuildInsertReturning(string schemaName, string tableName, string columns, string values)
        {
            return $@"
                INSERT INTO [{schemaName}].[{tableName}] ({columns})
                OUTPUT INSERTED.*
                VALUES ({values})";
        }

        public string BuildUpdateReturning(string schemaName, string tableName, string setClause, string whereClause)
        {
            return $@"
                UPDATE [{schemaName}].[{tableName}]
                SET {setClause}
                OUTPUT INSERTED.*
                WHERE {whereClause}";
        }

        public string BuildCastToText(string tableAlias, string columnName)
        {
            return $"CAST({tableAlias}.[{columnName}] AS NVARCHAR(MAX))";
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
                    
                    SELECT COUNT(*) as TotalCount FROM (
                        SELECT 1 as dummy
                        FROM {fromClause}
                        {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                        {groupByClause}
                    ) as grouped;";
            }
            else
            {
                return $@"
                    DECLARE @TotalCount INT;
                    
                    SELECT @TotalCount = COUNT(*)
                    FROM {fromClause}
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")};
                    
                    SELECT @TotalCount as TotalCount;
                    
                    SELECT {selectColumns}
                    FROM {fromClause}
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                    {orderByClause}
                    OFFSET @Offset ROWS
                    FETCH NEXT @PageSize ROWS ONLY;";
            }
        }

        public string BuildCoalesce(string expression, string defaultValue)
        {
            return $"ISNULL({expression}, {defaultValue})";
        }

        public bool IsStoredProcedureNotFoundError(Exception ex)
        {
            return ex is SqlException sqlEx && sqlEx.Message.Contains("Could not find stored procedure");
        }

        public string GetSpParameterMappingQuery()
        {
            return @"
                SELECT 
                    p.name AS PARAMETER_NAME
                FROM sys.parameters p
                INNER JOIN sys.procedures sp ON p.object_id = sp.object_id
                INNER JOIN sys.schemas s ON sp.schema_id = s.schema_id
                WHERE s.name = @SchemaName 
                    AND sp.name = @ProcedureName
                    AND p.name IS NOT NULL
                ORDER BY p.parameter_id";
        }
    }
}
