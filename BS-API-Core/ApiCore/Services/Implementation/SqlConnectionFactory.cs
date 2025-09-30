using Microsoft.Data.SqlClient;
using ApiCore.Services.Interfaces;
using System.Data;
using System;

namespace ApiCore.Services.Implementation
{
    /// <summary>
    /// Factory implementation for creating SQL connections
    /// Supports multi-database architecture with ADO.NET, Entity Framework Core, and Dapper
    /// </summary>
    public class SqlConnectionFactory : ISqlConnectionFactory
    {
        private readonly Dictionary<DatabaseType, string> _connectionStrings;

        /// <summary>
        /// Gets the main database connection string (for backward compatibility)
        /// </summary>
        public string ConnectionString => _connectionStrings[DatabaseType.Main];

        public SqlConnectionFactory(IConfiguration configuration)
        {
            // Read connection string from environment variable SERVERDB
            var defaultConnection = Environment.GetEnvironmentVariable("SERVERDB")
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("SERVERDB", "Database connection string is required. Set SERVERDB environment variable or DefaultConnection in appsettings.");

            _connectionStrings = new Dictionary<DatabaseType, string>
            {
                [DatabaseType.Main] = defaultConnection,
                // Use the same connection for Security (backwards compatibility)
                [DatabaseType.Security] = defaultConnection
            };

            // Validate all connection strings
            foreach (var kvp in _connectionStrings)
            {
                if (string.IsNullOrWhiteSpace(kvp.Value))
                {
                    throw new ArgumentException($"Connection string for {kvp.Key} database cannot be empty");
                }
            }
        }

        /// <summary>
        /// Gets the connection string for the specified database type
        /// </summary>
        /// <param name="databaseType">The database type</param>
        /// <returns>The connection string</returns>
        public string GetConnectionString(DatabaseType databaseType)
        {
            if (!_connectionStrings.TryGetValue(databaseType, out var connectionString))
            {
                throw new ArgumentException($"No connection string configured for database type: {databaseType}");
            }
            return connectionString;
        }

        /// <summary>
        /// Creates a new SQL connection for the main database (not opened)
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <returns>A new SQL connection instance</returns>
        public SqlConnection CreateConnection()
        {
            return CreateConnection(DatabaseType.Main);
        }

        /// <summary>
        /// Creates a new SQL connection for the specified database type (not opened)
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>A new SQL connection instance</returns>
        public SqlConnection CreateConnection(DatabaseType databaseType)
        {
            var connectionString = GetConnectionString(databaseType);
            return new SqlConnection(connectionString);
        }

        /// <summary>
        /// Creates and opens a new SQL connection for the main database
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <returns>An opened SQL connection instance</returns>
        public async Task<SqlConnection> CreateAndOpenConnectionAsync()
        {
            return await CreateAndOpenConnectionAsync(DatabaseType.Main);
        }

        /// <summary>
        /// Creates and opens a new SQL connection for the specified database type
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>An opened SQL connection instance</returns>
        public async Task<SqlConnection> CreateAndOpenConnectionAsync(DatabaseType databaseType)
        {
            var connection = CreateConnection(databaseType);
            await connection.OpenAsync();
            return connection;
        }

        /// <summary>
        /// Creates a new connection as IDbConnection interface for the main database
        /// Useful for generic database operations and testing
        /// </summary>
        /// <returns>A new connection as IDbConnection</returns>
        public IDbConnection CreateDbConnection()
        {
            return CreateConnection(DatabaseType.Main);
        }

        /// <summary>
        /// Creates a new connection as IDbConnection interface for the specified database type
        /// Useful for generic database operations and testing
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>A new connection as IDbConnection</returns>
        public IDbConnection CreateDbConnection(DatabaseType databaseType)
        {
            return CreateConnection(databaseType);
        }

        /// <summary>
        /// Creates and opens a new connection as IDbConnection interface for the main database
        /// Useful for Dapper operations
        /// </summary>
        /// <returns>An opened connection as IDbConnection</returns>
        public async Task<IDbConnection> CreateAndOpenDbConnectionAsync()
        {
            return await CreateAndOpenConnectionAsync(DatabaseType.Main);
        }

        /// <summary>
        /// Creates and opens a new connection as IDbConnection interface for the specified database type
        /// Useful for Dapper operations
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>An opened connection as IDbConnection</returns>
        public async Task<IDbConnection> CreateAndOpenDbConnectionAsync(DatabaseType databaseType)
        {
            var connection = CreateConnection(databaseType);
            await connection.OpenAsync();
            return connection;
        }
    }
}
