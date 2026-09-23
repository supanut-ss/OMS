using ApiCore.Services.Interfaces;
using System.Data;
using System.Data.Common;

namespace ApiCore.Services.Implementation
{
    /// <summary>
    /// Provider-agnostic factory for creating database connections.
    /// Supports SQL Server, PostgreSQL, and future providers via ISqlDialect.
    /// Compatible with ADO.NET, Entity Framework Core, and Dapper.
    /// </summary>
    public class SqlConnectionFactory : ISqlConnectionFactory
    {
        private readonly Dictionary<DatabaseType, string> _connectionStrings;
        private readonly ISqlDialect _dialect;

        /// <summary>
        /// Gets the current database provider type
        /// </summary>
        public DatabaseProvider CurrentProvider => _dialect.Provider;

        /// <summary>
        /// Gets the SQL dialect for the current provider
        /// </summary>
        public ISqlDialect Dialect => _dialect;

        /// <summary>
        /// Gets the main database connection string (for backward compatibility)
        /// </summary>
        public string ConnectionString => _connectionStrings[DatabaseType.Main];

        public SqlConnectionFactory(IConfiguration configuration, ISqlDialect dialect)
        {
            _dialect = dialect ?? throw new ArgumentNullException(nameof(dialect));

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
        public string GetConnectionString(DatabaseType databaseType)
        {
            if (!_connectionStrings.TryGetValue(databaseType, out var connectionString))
            {
                throw new ArgumentException($"No connection string configured for database type: {databaseType}");
            }
            return connectionString;
        }

        /// <summary>
        /// Creates a new database connection for the main database (not opened)
        /// </summary>
        public DbConnection CreateConnection()
        {
            return CreateConnection(DatabaseType.Main);
        }

        /// <summary>
        /// Creates a new database connection for the specified database type (not opened)
        /// </summary>
        public DbConnection CreateConnection(DatabaseType databaseType)
        {
            var connectionString = GetConnectionString(databaseType);
            return _dialect.CreateConnection(connectionString);
        }

        /// <summary>
        /// Creates and opens a new database connection for the main database
        /// </summary>
        public async Task<DbConnection> CreateAndOpenConnectionAsync()
        {
            return await CreateAndOpenConnectionAsync(DatabaseType.Main);
        }

        /// <summary>
        /// Creates and opens a new database connection for the specified database type
        /// </summary>
        public async Task<DbConnection> CreateAndOpenConnectionAsync(DatabaseType databaseType)
        {
            var connection = CreateConnection(databaseType);
            await connection.OpenAsync();
            return connection;
        }

        /// <summary>
        /// Creates a new connection as IDbConnection interface for the main database
        /// </summary>
        public IDbConnection CreateDbConnection()
        {
            return CreateConnection(DatabaseType.Main);
        }

        /// <summary>
        /// Creates a new connection as IDbConnection interface for the specified database type
        /// </summary>
        public IDbConnection CreateDbConnection(DatabaseType databaseType)
        {
            return CreateConnection(databaseType);
        }

        /// <summary>
        /// Creates and opens a new connection as IDbConnection interface for the main database
        /// </summary>
        public async Task<IDbConnection> CreateAndOpenDbConnectionAsync()
        {
            return await CreateAndOpenConnectionAsync(DatabaseType.Main);
        }

        /// <summary>
        /// Creates and opens a new connection as IDbConnection interface for the specified database type
        /// </summary>
        public async Task<IDbConnection> CreateAndOpenDbConnectionAsync(DatabaseType databaseType)
        {
            var connection = CreateConnection(databaseType);
            await connection.OpenAsync();
            return connection;
        }

        /// <summary>
        /// Creates a DbCommand using the current dialect
        /// </summary>
        public DbCommand CreateCommand(string query, DbConnection connection)
        {
            return _dialect.CreateCommand(query, connection);
        }

        /// <summary>
        /// Creates a DbParameter using the current dialect
        /// </summary>
        public DbParameter CreateParameter(string name, object value)
        {
            return _dialect.CreateParameter(name, value);
        }
    }
}
