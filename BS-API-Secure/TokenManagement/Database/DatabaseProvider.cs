namespace TokenManagement.Database
{
    /// <summary>
    /// Supported database providers
    /// </summary>
    public enum DatabaseProvider
    {
        SqlServer,
        PostgreSql,
        MySql
    }

    /// <summary>
    /// Helper for parsing DatabaseProvider from environment variable strings.
    /// Supports aliases so DB_PROVIDER=postgres / pgsql / pg all map to PostgreSql, etc.
    /// </summary>
    public static class DatabaseProviderParser
    {
        /// <summary>
        /// Parses a provider name string (from env var or config) to DatabaseProvider.
        /// Returns SqlServer as default when value is null or empty.
        /// </summary>
        public static DatabaseProvider Parse(string? providerName)
        {
            if (string.IsNullOrWhiteSpace(providerName))
                return DatabaseProvider.SqlServer;

            return providerName.Trim().ToLower() switch
            {
                "sqlserver" or "mssql" or "sql" => DatabaseProvider.SqlServer,
                "postgresql" or "postgres" or "pgsql" or "pg" => DatabaseProvider.PostgreSql,
                "mysql" or "mariadb" or "maria" => DatabaseProvider.MySql,
                _ => throw new ArgumentException(
                    $"Unsupported database provider: '{providerName}'. Supported values: SqlServer, PostgreSql, MySql")
            };
        }
    }
}
