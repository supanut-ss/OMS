using System.Text.RegularExpressions;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Executes AI-generated SQL queries with safety validation.
/// Only allows SELECT statements with row limits and timeouts.
/// </summary>
public class SqlExecutionService : ISqlExecutionService
{
    private readonly string _connectionString;
    private readonly ILogger<SqlExecutionService> _logger;
    private readonly int _maxRowLimit;
    private readonly int _queryTimeoutSeconds;
    private readonly string[] _blockedKeywords;

    public SqlExecutionService(IConfiguration configuration, ILogger<SqlExecutionService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _logger = logger;

        var safetyConfig = configuration.GetSection("AiSafety");
        _maxRowLimit = safetyConfig.GetValue("MaxRowLimit", 1000);
        _queryTimeoutSeconds = safetyConfig.GetValue("QueryTimeoutSeconds", 30);
        _blockedKeywords = safetyConfig.GetSection("BlockedKeywords").Get<string[]>()
            ?? new[] { "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "EXEC", "EXECUTE", "xp_", "sp_", "GRANT", "REVOKE", "DENY", "CREATE", "MERGE", "BULK" };
    }

    public (bool isSafe, string? reason) ValidateSql(string sql, bool allowCrud = false)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            return (false, "SQL query is empty.");
        }

        // Normalize: remove comments and extra whitespace
        var normalizedSql = RemoveSqlComments(sql).Trim();

        // Check allowed statement types
        if (allowCrud)
        {
            // For CRUD operations: allow INSERT, UPDATE, DELETE
            if (!Regex.IsMatch(normalizedSql, @"^\s*(INSERT|UPDATE|DELETE)\s", RegexOptions.IgnoreCase))
            {
                return (false, "Only INSERT, UPDATE, or DELETE statements are allowed for CRUD operations.");
            }
        }
        else
        {
            // For AI-generated queries: only SELECT
            if (!Regex.IsMatch(normalizedSql, @"^\s*(SELECT|WITH)\s", RegexOptions.IgnoreCase))
            {
                return (false, "Only SELECT queries are allowed. Query must start with SELECT or WITH.");
            }
        }

        // Check for blocked keywords (word-boundary match to avoid false positives)
        foreach (var keyword in _blockedKeywords)
        {
            var pattern = $@"\b{Regex.Escape(keyword)}\b";
            if (Regex.IsMatch(normalizedSql, pattern, RegexOptions.IgnoreCase))
            {
                return (false, $"Blocked keyword detected: '{keyword}'. Only SELECT queries are allowed.");
            }
        }

        // Check for multiple statements (semicolons followed by non-whitespace)
        var statements = normalizedSql.Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();

        if (statements.Count > 1)
        {
            return (false, "Multiple SQL statements are not allowed.");
        }

        return (true, null);
    }

    public async Task<(bool isValid, string? errorMessage)> ValidateSqlSyntaxAsync(string sql)
    {
        // Ensure TOP clause before compile-check so the query shape matches execution
        var sqlToCheck = EnsureTopClause(sql);

        // SET NOEXEC ON causes SQL Server to compile the query without executing it.
        // This catches: invalid table names, invalid column names, syntax errors, type mismatches.
        // SET NOEXEC OFF restores normal execution mode for subsequent commands.
        const string setNoExec = "SET NOEXEC ON;";
        const string setNoExecOff = "SET NOEXEC OFF;";

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            // Run SET NOEXEC ON
            await connection.ExecuteAsync(setNoExec);

            try
            {
                // This will compile but NOT execute the query
                await connection.ExecuteAsync(sqlToCheck, commandTimeout: 10);
                _logger.LogDebug("SQL syntax validation passed: {Sql}", sqlToCheck);
                return (true, null);
            }
            catch (SqlException ex)
            {
                // Collect all SQL Server error messages
                var errors = string.Join(" | ", ex.Errors.Cast<SqlError>().Select(e => $"[{e.Number}] {e.Message}"));
                _logger.LogWarning("SQL syntax validation failed: {Errors} | SQL: {Sql}", errors, sqlToCheck);
                return (false, errors);
            }
            finally
            {
                // Always restore NOEXEC to OFF so the connection stays usable
                try { await connection.ExecuteAsync(setNoExecOff); } catch { /* ignore */ }
            }
        }
        catch (Exception ex) when (ex is not SqlException)
        {
            _logger.LogError(ex, "Unexpected error during SQL syntax validation");
            return (false, $"Validation error: {ex.Message}");
        }
    }

    public async Task<IEnumerable<IDictionary<string, object>>> ExecuteSqlAsync(string sql)
    {
        // Validate first
        var (isSafe, reason) = ValidateSql(sql);
        if (!isSafe)
        {
            throw new InvalidOperationException($"SQL validation failed: {reason}");
        }

        // Inject TOP if not present
        var executeSql = EnsureTopClause(sql);

        _logger.LogInformation("Executing AI-generated SQL: {Sql}", executeSql);

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        var results = await connection.QueryAsync(
            executeSql,
            commandTimeout: _queryTimeoutSeconds
        );

        // Convert dynamic results to Dictionary<string, object>
        var resultList = results
            .Select(row => (IDictionary<string, object>)row)
            .ToList();

        _logger.LogInformation("SQL execution returned {Count} rows.", resultList.Count);

        return resultList;
    }

    public async Task<int> ExecuteCommandAsync(string sql, IDictionary<string, object?> parameters)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            throw new InvalidOperationException("SQL command is empty.");
        }

        // Validate CRUD statement (allowCrud=true)
        var (isSafe, reason) = ValidateSql(sql, allowCrud: true);
        if (!isSafe)
        {
            throw new InvalidOperationException($"SQL validation failed: {reason}");
        }

        // Check for blocked keywords even in CRUD
        var normalizedSql = RemoveSqlComments(sql).Trim();
        foreach (var keyword in _blockedKeywords)
        {
            var pattern = $@"\b{Regex.Escape(keyword)}\b";
            if (Regex.IsMatch(normalizedSql, pattern, RegexOptions.IgnoreCase))
            {
                throw new InvalidOperationException($"Blocked keyword detected: '{keyword}'.");
            }
        }

        _logger.LogInformation("Executing parameterized SQL command: {Sql}", sql);

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        var affectedRows = await connection.ExecuteAsync(
            sql,
            parameters,
            commandTimeout: _queryTimeoutSeconds
        );

        _logger.LogInformation("SQL command affected {Count} rows.", affectedRows);
        return affectedRows;
    }

    /// <summary>
    /// Ensures the SQL query has a TOP clause to limit results.
    /// </summary>
    private string EnsureTopClause(string sql)
    {
        // Check if TOP already exists
        if (Regex.IsMatch(sql, @"\bTOP\s+\d+", RegexOptions.IgnoreCase))
        {
            return sql;
        }

        // Insert TOP after SELECT (handle SELECT DISTINCT as well)
        var replaced = Regex.Replace(
            sql,
            @"\bSELECT\s+(DISTINCT\s+)?",
            $"SELECT $1TOP {_maxRowLimit} ",
            RegexOptions.IgnoreCase,
            TimeSpan.FromSeconds(1)
        );

        return replaced;
    }

    /// <summary>
    /// Removes SQL comments (both -- and /* */ style) for validation.
    /// </summary>
    private static string RemoveSqlComments(string sql)
    {
        // Remove block comments
        sql = Regex.Replace(sql, @"/\*.*?\*/", " ", RegexOptions.Singleline);
        // Remove line comments
        sql = Regex.Replace(sql, @"--.*$", " ", RegexOptions.Multiline);
        return sql;
    }
}
