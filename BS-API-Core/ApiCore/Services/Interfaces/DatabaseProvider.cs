namespace ApiCore.Services.Interfaces
{
    /// <summary>
    /// Supported database providers
    /// </summary>
    public enum DatabaseProvider
    {
        /// <summary>
        /// Microsoft SQL Server
        /// </summary>
        SqlServer,

        /// <summary>
        /// PostgreSQL
        /// </summary>
        PostgreSql,

        /// <summary>
        /// MySQL / MariaDB
        /// </summary>
        MySql

        // Future providers can be added here:
        // Oracle,
        // Sqlite
    }

    /// <summary>
    /// Database configuration settings
    /// Read from environment variables or appsettings.json
    /// </summary>
    public class DatabaseSettings
    {
        /// <summary>
        /// The database provider to use (SqlServer, PostgreSql, etc.)
        /// Default: SqlServer (backward compatible)
        /// </summary>
        public DatabaseProvider Provider { get; set; } = DatabaseProvider.SqlServer;

        /// <summary>
        /// Connection strings keyed by DatabaseType
        /// </summary>
        public Dictionary<DatabaseType, string> ConnectionStrings { get; set; } = new();

        /// <summary>
        /// Parses the provider string from environment variable or config
        /// </summary>
        public static DatabaseProvider ParseProvider(string? providerName)
        {
            if (string.IsNullOrWhiteSpace(providerName))
                return DatabaseProvider.SqlServer;

            return providerName.Trim().ToLower() switch
            {
                "sqlserver" or "mssql" or "sql" => DatabaseProvider.SqlServer,
                "postgresql" or "postgres" or "pgsql" or "pg" => DatabaseProvider.PostgreSql,
                "mysql" or "mariadb" or "maria" => DatabaseProvider.MySql,
                _ => throw new ArgumentException($"Unsupported database provider: '{providerName}'. Supported: SqlServer, PostgreSql, MySql")
            };
        }
    }
}
