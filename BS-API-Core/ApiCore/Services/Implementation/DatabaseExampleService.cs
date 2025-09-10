using Dapper;
using Microsoft.Data.SqlClient;
using ApiCore.Services.Interfaces;
using System.Data;

namespace ApiCore.Services.Implementation
{
    /// <summary>
    /// Example service demonstrating SqlConnectionFactory usage with different ORMs
    /// Supports ADO.NET, Entity Framework Core, and Dapper
    /// </summary>
    public class DatabaseExampleService
    {
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly ILogger<DatabaseExampleService> _logger;

        public DatabaseExampleService(
            ISqlConnectionFactory connectionFactory,
            ILogger<DatabaseExampleService> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        #region Dapper Examples

        /// <summary>
        /// Example: Query with Dapper
        /// </summary>
        public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? parameters = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<T>(sql, parameters);
        }

        /// <summary>
        /// Example: Execute command with Dapper
        /// </summary>
        public async Task<int> ExecuteAsync(string sql, object? parameters = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.ExecuteAsync(sql, parameters);
        }

        /// <summary>
        /// Example: Query single record with Dapper
        /// </summary>
        public async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? parameters = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<T>(sql, parameters);
        }

        /// <summary>
        /// Example: Query multiple result sets with Dapper
        /// </summary>
        public async Task<(IEnumerable<T1>, IEnumerable<T2>)> QueryMultipleAsync<T1, T2>(string sql, object? parameters = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            using var multi = await connection.QueryMultipleAsync(sql, parameters);

            var result1 = await multi.ReadAsync<T1>();
            var result2 = await multi.ReadAsync<T2>();

            return (result1, result2);
        }

        /// <summary>
        /// Example: Execute stored procedure with Dapper
        /// </summary>
        public async Task<IEnumerable<T>> ExecuteStoredProcedureAsync<T>(string procedureName, object? parameters = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<T>(
                procedureName,
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        #endregion

        #region ADO.NET Examples

        /// <summary>
        /// Example: Raw ADO.NET usage
        /// </summary>
        public async Task<DataTable> ExecuteAdoNetQueryAsync(string sql, Dictionary<string, object>? parameters = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            using var command = new SqlCommand(sql, connection);

            if (parameters != null)
            {
                foreach (var param in parameters)
                {
                    command.Parameters.AddWithValue($"@{param.Key}", param.Value ?? DBNull.Value);
                }
            }

            await connection.OpenAsync();
            using var adapter = new SqlDataAdapter(command);
            var dataTable = new DataTable();
            adapter.Fill(dataTable);

            return dataTable;
        }

        /// <summary>
        /// Example: Using SqlDataReader with ADO.NET
        /// </summary>
        public async Task<List<Dictionary<string, object>>> ExecuteReaderAsync(string sql, Dictionary<string, object>? parameters = null)
        {
            var results = new List<Dictionary<string, object>>();

            using var connection = _connectionFactory.CreateConnection();
            using var command = new SqlCommand(sql, connection);

            if (parameters != null)
            {
                foreach (var param in parameters)
                {
                    command.Parameters.AddWithValue($"@{param.Key}", param.Value ?? DBNull.Value);
                }
            }

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    row[fieldName] = value;
                }
                results.Add(row);
            }

            return results;
        }

        #endregion

        #region Transaction Examples

        /// <summary>
        /// Example: Transaction with Dapper
        /// </summary>
        public async Task<bool> ExecuteTransactionAsync(List<(string sql, object? parameters)> commands)
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.OpenAsync();

            using var transaction = await connection.BeginTransactionAsync();
            try
            {
                foreach (var (sql, parameters) in commands)
                {
                    await connection.ExecuteAsync(sql, parameters, transaction);
                }

                await transaction.CommitAsync();
                _logger.LogInformation("Transaction committed successfully");
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Transaction rolled back due to error");
                return false;
            }
        }

        /// <summary>
        /// Example: Transaction with ADO.NET
        /// </summary>
        public async Task<bool> ExecuteAdoNetTransactionAsync(List<(string sql, Dictionary<string, object>? parameters)> commands)
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.OpenAsync();

            using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();
            try
            {
                foreach (var (sql, parameters) in commands)
                {
                    using var command = new SqlCommand(sql, connection, transaction);

                    if (parameters != null)
                    {
                        foreach (var param in parameters)
                        {
                            command.Parameters.AddWithValue($"@{param.Key}", param.Value ?? DBNull.Value);
                        }
                    }

                    await command.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();
                _logger.LogInformation("ADO.NET transaction committed successfully");
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "ADO.NET transaction rolled back due to error");
                return false;
            }
        }

        #endregion

        #region Bulk Operations

        /// <summary>
        /// Example: Bulk insert with SqlBulkCopy (ADO.NET)
        /// </summary>
        public async Task<bool> BulkInsertAsync(DataTable dataTable, string tableName)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();
                await connection.OpenAsync();

                using var bulkCopy = new SqlBulkCopy(connection);
                bulkCopy.DestinationTableName = tableName;
                bulkCopy.BulkCopyTimeout = 300; // 5 minutes

                await bulkCopy.WriteToServerAsync(dataTable);
                _logger.LogInformation("Bulk insert completed for {RowCount} rows", dataTable.Rows.Count);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bulk insert failed");
                return false;
            }
        }

        #endregion

        #region Health Check

        /// <summary>
        /// Example: Database health check
        /// </summary>
        public async Task<bool> HealthCheckAsync()
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();
                var result = await connection.QueryFirstOrDefaultAsync<int>("SELECT 1");
                return result == 1;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database health check failed");
                return false;
            }
        }

        #endregion
    }
}

// Example usage models
namespace ApiCore.Models.Examples
{
    public class UserExample
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
    }

    public class ProductExample
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Stock { get; set; }
    }
}
