using System.Data.Common;

namespace ApiCore.Services.Interfaces
{
    /// <summary>
    /// SQL dialect abstraction for provider-specific SQL generation.
    /// Each database provider (SQL Server, PostgreSQL, etc.) implements this interface
    /// to provide the correct SQL syntax for its platform.
    /// </summary>
    public interface ISqlDialect
    {
        /// <summary>
        /// The database provider this dialect supports
        /// </summary>
        DatabaseProvider Provider { get; }

        /// <summary>
        /// Creates a new DbConnection for the given connection string
        /// </summary>
        DbConnection CreateConnection(string connectionString);

        /// <summary>
        /// Creates a new DbParameter with the given name and value
        /// </summary>
        DbParameter CreateParameter(string name, object value);

        /// <summary>
        /// Creates a new DbCommand with the given query and connection
        /// </summary>
        DbCommand CreateCommand(string query, DbConnection connection);

        /// <summary>
        /// Quotes an identifier (table name, column name, schema name)
        /// SQL Server: [name], PostgreSQL: "name"
        /// </summary>
        string QuoteIdentifier(string identifier);

        /// <summary>
        /// Quotes a schema-qualified table name
        /// SQL Server: [schema].[table], PostgreSQL: "schema"."table"
        /// </summary>
        string QuoteTable(string schemaName, string tableName);

        /// <summary>
        /// Gets the parameter prefix character
        /// SQL Server: @, PostgreSQL: @  (Npgsql also supports @)
        /// </summary>
        string ParameterPrefix { get; }

        /// <summary>
        /// Generates a pagination clause
        /// SQL Server: OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
        /// PostgreSQL: LIMIT @PageSize OFFSET @Offset
        /// </summary>
        string BuildPaginationClause(string offsetParam, string pageSizeParam);

        /// <summary>
        /// Gets the SQL query for retrieving table column metadata
        /// </summary>
        string GetColumnMetadataQuery();

        /// <summary>
        /// Gets the SQL query for retrieving schema information (tables, views)
        /// </summary>
        string GetSchemaQuery();

        /// <summary>
        /// Gets the SQL query for retrieving stored procedure/function metadata (single SP by name)
        /// Parameters: @ProcedureName, @SchemaName
        /// </summary>
        string GetStoredProcedureMetadataQuery();

        /// <summary>
        /// Gets the SQL query for listing stored procedures in a schema (pattern-based)
        /// Parameters: @SchemaPattern (LIKE), @SearchPattern (LIKE)
        /// Result columns: PROCEDURE_NAME, SCHEMA_NAME, create_date, modify_date
        /// </summary>
        string GetStoredProcedureListQuery();

        /// <summary>
        /// Gets the SQL query to check if a table exists
        /// </summary>
        string GetTableExistsQuery();

        /// <summary>
        /// Builds an INSERT statement that returns the inserted row
        /// SQL Server: INSERT ... OUTPUT INSERTED.* VALUES ...
        /// PostgreSQL: INSERT ... VALUES ... RETURNING *
        /// </summary>
        string BuildInsertReturning(string schemaName, string tableName, string columns, string values);

        /// <summary>
        /// Builds an UPDATE statement that returns the updated row
        /// SQL Server: UPDATE ... SET ... OUTPUT INSERTED.* WHERE ...
        /// PostgreSQL: UPDATE ... SET ... WHERE ... RETURNING *
        /// </summary>
        string BuildUpdateReturning(string schemaName, string tableName, string setClause, string whereClause);

        /// <summary>
        /// Builds a CAST expression for quick-filter text search
        /// SQL Server: CAST(t.[col] AS NVARCHAR(MAX))
        /// PostgreSQL: t."col"::TEXT
        /// </summary>
        string BuildCastToText(string tableAlias, string columnName);

        /// <summary>
        /// Builds a DataGrid query with count + data (may use multiple result sets or CTEs)
        /// </summary>
        string BuildDataGridQuery(string selectColumns, string fromClause, string whereClause,
            string orderByClause, string? groupByClause = null);

        /// <summary>
        /// Gets the string concatenation syntax
        /// SQL Server: +, PostgreSQL: ||
        /// </summary>
        string StringConcatOperator { get; }

        /// <summary>
        /// Gets the ISNULL/COALESCE function name
        /// SQL Server: ISNULL, PostgreSQL: COALESCE
        /// </summary>
        string BuildCoalesce(string expression, string defaultValue);

        /// <summary>
        /// Checks if the exception is a "stored procedure not found" error
        /// </summary>
        bool IsStoredProcedureNotFoundError(Exception ex);

        /// <summary>
        /// Gets the SQL query for retrieving stored procedure parameter names for dynamic mapping.
        /// Used to map logical parameter names to the actual SP parameter names.
        /// Parameters required: @SchemaName, @ProcedureName
        /// Result column: PARAMETER_NAME
        /// </summary>
        string GetSpParameterMappingQuery();
    }
}
