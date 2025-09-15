using Microsoft.Data.SqlClient;
using System.Data;

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
    /// Factory interface for creating SQL connections
    /// Supports multi-database architecture with ADO.NET, Entity Framework Core, and Dapper
    /// </summary>
    public interface ISqlConnectionFactory
    {
        /// <summary>
        /// Creates a new SQL connection for the main database
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <returns>A new SQL connection instance</returns>
        SqlConnection CreateConnection();

        /// <summary>
        /// Creates a new SQL connection for the specified database type
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>A new SQL connection instance</returns>
        SqlConnection CreateConnection(DatabaseType databaseType);

        /// <summary>
        /// Creates and opens a new SQL connection for the main database
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <returns>An opened SQL connection instance</returns>
        Task<SqlConnection> CreateAndOpenConnectionAsync();

        /// <summary>
        /// Creates and opens a new SQL connection for the specified database type
        /// Compatible with ADO.NET, EF Core, and Dapper
        /// </summary>
        /// <param name="databaseType">The database type to connect to</param>
        /// <returns>An opened SQL connection instance</returns>
        Task<SqlConnection> CreateAndOpenConnectionAsync(DatabaseType databaseType);

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
