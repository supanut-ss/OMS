using System.Data;
using System.Data.Common;

namespace TokenManagement.Database
{
    /// <summary>
    /// Provider-agnostic database connection factory for Authentication services.
    /// Creates DbConnection, DbCommand, and DbParameter instances based on the configured provider.
    /// </summary>
    public interface IDbConnectionFactory
    {
        /// <summary>
        /// Current database provider (SqlServer or PostgreSql)
        /// </summary>
        DatabaseProvider CurrentProvider { get; }

        /// <summary>
        /// The default connection string
        /// </summary>
        string ConnectionString { get; }

        /// <summary>
        /// Create a new closed DbConnection using the default connection string
        /// </summary>
        DbConnection CreateConnection();

        /// <summary>
        /// Create a new DbCommand bound to the given connection
        /// </summary>
        DbCommand CreateCommand(string commandText, DbConnection connection);

        /// <summary>
        /// Create a DbParameter with name and value
        /// </summary>
        DbParameter CreateParameter(string name, object value);

        /// <summary>
        /// Create a typed output DbParameter
        /// </summary>
        DbParameter CreateOutputParameter(string name, DbType dbType, int size = 0);

        /// <summary>
        /// Create a DbCommand for calling a stored procedure or function.
        /// SQL Server: uses CommandType.StoredProcedure.
        /// PostgreSQL: wraps the function call as SELECT * FROM func(in_params) and maps
        /// OUT columns back to output parameter values after ExecuteNonQueryAsync.
        /// </summary>
        DbCommand CreateProcedureCommand(string procedureName, DbConnection connection);
    }
}
