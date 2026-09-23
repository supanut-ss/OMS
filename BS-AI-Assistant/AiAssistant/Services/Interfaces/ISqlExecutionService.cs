namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Service for safely executing AI-generated SQL queries.
/// </summary>
public interface ISqlExecutionService
{
    /// <summary>
    /// Validates that the SQL query is safe to execute.
    /// For AI queries (allowCrud=false): SELECT only, no DDL/DML.
    /// For CRUD commands (allowCrud=true): INSERT/UPDATE/DELETE only.
    /// This is a keyword/pattern check only — does NOT connect to the database.
    /// </summary>
    /// <param name="sql">SQL query to validate.</param>
    /// <param name="allowCrud">If true, allows INSERT/UPDATE/DELETE for CRUD operations. If false, allows SELECT only.</param>
    /// <returns>True if safe, false if blocked.</returns>
    (bool isSafe, string? reason) ValidateSql(string sql, bool allowCrud = false);

    /// <summary>
    /// Validates SQL against the actual database schema using SET NOEXEC ON.
    /// Compiles the query (checks tables/columns/syntax) without executing it.
    /// Use this AFTER ValidateSql passes to catch schema-level errors.
    /// </summary>
    /// <returns>(true, null) if valid; (false, errorMessage) if invalid.</returns>
    Task<(bool isValid, string? errorMessage)> ValidateSqlSyntaxAsync(string sql);

    /// <summary>
    /// Executes a validated SQL query and returns results as a list of dictionaries.
    /// </summary>
    Task<IEnumerable<IDictionary<string, object>>> ExecuteSqlAsync(string sql);

    /// <summary>
    /// Executes a parameterized non-query SQL command (INSERT/UPDATE) and returns affected rows.
    /// </summary>
    Task<int> ExecuteCommandAsync(string sql, IDictionary<string, object?> parameters);
}
