using System.Data;
using System.Data.Common;

namespace ApiCore.Services.Interfaces
{
    /// <summary>
    /// Database type enumeration for multi-database architecture
    /// </summary>
    public enum DatabaseType
    {
        /// <summary>
        /// Main application database (WMS operations, inventory, etc.)
        /// </summary>
        Main,

        /// <summary>
        /// Security database (users, authentication, authorization, menus)
        /// </summary>
        Security
    }

    /// <summary>
    /// Factory interface for creating database connections.
    /// Provider-agnostic: supports SQL Server, PostgreSQL, and future providers.
    /// Compatible with ADO.NET, Entity Framework Core, and Dapper.
    /// </summary>
    public interface ISqlConnectionFactory
    {
        /// <summary>
        /// Gets the current database provider type
        /// </summary>
        DatabaseProvider CurrentProvider { get; }

        /// <summary>
        /// Gets the SQL dialect for the current provider.
        /// Use this to generate provider-specific SQL queries.
        /// </summary>
        ISqlDialect Dialect { get; }

        /// <summary>
        /// Creates a new database connection for the main database (not opened)
        /// Returns DbConnection which works with any provider
        /// </summary>
        /// <returns>A new DbConnection instance</returns>
        DbConnection CreateConnection();

        /// <summary>
        /// Creates a new database connection for the specified database type (not opened)
        /// Returns DbConnection which works with any provider
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>A new DbConnection instance</returns>
        DbConnection CreateConnection(DatabaseType databaseType);

        /// <summary>
        /// Creates and opens a new database connection for the main database
        /// </summary>
        /// <returns>An opened DbConnection instance</returns>
        Task<DbConnection> CreateAndOpenConnectionAsync();

        /// <summary>
        /// Creates and opens a new database connection for the specified database type
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>An opened DbConnection instance</returns>
        Task<DbConnection> CreateAndOpenConnectionAsync(DatabaseType databaseType);

        /// <summary>
        /// Creates a new connection as IDbConnection interface for the main database
        /// Useful for generic database operations and testing
        /// </summary>
        /// <returns>A new connection as IDbConnection</returns>
        IDbConnection CreateDbConnection();

        /// <summary>
        /// Creates a new connection as IDbConnection interface for the specified database type
        /// Useful for generic database operations and testing
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>A new connection as IDbConnection</returns>
        IDbConnection CreateDbConnection(DatabaseType databaseType);

        /// <summary>
        /// Creates and opens a new connection as IDbConnection interface for the main database
        /// Useful for Dapper operations
        /// </summary>
        /// <returns>An opened connection as IDbConnection</returns>
        Task<IDbConnection> CreateAndOpenDbConnectionAsync();

        /// <summary>
        /// Creates and opens a new connection as IDbConnection interface for the specified database type
        /// Useful for Dapper operations
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>An opened connection as IDbConnection</returns>
        Task<IDbConnection> CreateAndOpenDbConnectionAsync(DatabaseType databaseType);

        /// <summary>
        /// Creates a DbCommand using the current dialect
        /// </summary>
        DbCommand CreateCommand(string query, DbConnection connection);

        /// <summary>
        /// Creates a DbParameter using the current dialect
        /// </summary>
        DbParameter CreateParameter(string name, object value);

        /// <summary>
        /// Gets the connection string for the specified database type
        /// </summary>
        /// <param name="databaseType">The database type</param>
        /// <returns>The connection string</returns>
        string GetConnectionString(DatabaseType databaseType);

        /// <summary>
        /// Gets the main database connection string (for backward compatibility)
        /// </summary>
        string ConnectionString { get; }
    }
}
