using System.Data;
using System.Data.Common;
using Microsoft.Data.SqlClient;

namespace TokenManagement.Database
{
    /// <summary>
    /// Provider-agnostic connection factory that creates DbConnection, DbCommand, and DbParameter
    /// based on the configured DatabaseProvider (SqlServer or PostgreSql).
    /// </summary>
    public class DbConnectionFactory : IDbConnectionFactory
    {
        private readonly string _connectionString;

        public DatabaseProvider CurrentProvider { get; }
        public string ConnectionString => _connectionString;

        public DbConnectionFactory(string connectionString, DatabaseProvider provider = DatabaseProvider.SqlServer)
        {
            _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
            CurrentProvider = provider;
        }

        public DbConnection CreateConnection()
        {
            return CurrentProvider switch
            {
                DatabaseProvider.SqlServer => new SqlConnection(_connectionString),
                DatabaseProvider.PostgreSql => CreateNpgsqlConnection(_connectionString),
                DatabaseProvider.MySql => CreateMySqlConnection(_connectionString),
                _ => throw new NotSupportedException($"Database provider '{CurrentProvider}' is not supported.")
            };
        }

        public DbCommand CreateCommand(string commandText, DbConnection connection)
        {
            var cmd = connection.CreateCommand();
            cmd.CommandText = commandText;
            return cmd;
        }

        /// <summary>
        /// Normalize parameter name based on provider:
        /// SQL Server keeps the @ prefix.
        /// PostgreSQL/MySQL: strip @ and lowercase (PG stores unquoted identifiers as lowercase).
        /// </summary>
        private string NormalizeParameterName(string name)
        {
            if (CurrentProvider == DatabaseProvider.SqlServer)
                return name.StartsWith('@') ? name : "@" + name;

            // PostgreSQL and MySQL: strip leading @ and lowercase (PG folds unquoted identifiers to lowercase)
            return name.TrimStart('@').ToLowerInvariant();
        }

        public DbParameter CreateParameter(string name, object value)
        {
            var normalizedName = NormalizeParameterName(name);
            return CurrentProvider switch
            {
                DatabaseProvider.SqlServer => new SqlParameter(normalizedName, value ?? DBNull.Value),
                DatabaseProvider.PostgreSql => CreateNpgsqlParameter(normalizedName, value),
                DatabaseProvider.MySql => CreateMySqlParameter(normalizedName, value),
                _ => throw new NotSupportedException($"Database provider '{CurrentProvider}' is not supported.")
            };
        }

        public DbParameter CreateOutputParameter(string name, DbType dbType, int size = 0)
        {
            var normalizedName = NormalizeParameterName(name);
            DbParameter p;
            if (CurrentProvider == DatabaseProvider.SqlServer)
            {
                p = new SqlParameter();
            }
            else if (CurrentProvider == DatabaseProvider.PostgreSql)
            {
                p = CreateNpgsqlOutputParam();
            }
            else if (CurrentProvider == DatabaseProvider.MySql)
            {
                p = CreateMySqlOutputParam();
            }
            else
            {
                throw new NotSupportedException($"Database provider '{CurrentProvider}' is not supported.");
            }

            p.ParameterName = normalizedName;
            p.DbType = dbType;
            if (size > 0) p.Size = size;
            p.Direction = ParameterDirection.Output;
            return p;
        }

        #region PostgreSQL helpers (reflection-based to avoid hard compile dependency)

        private static DbConnection CreateNpgsqlConnection(string connectionString)
        {
            var type = Type.GetType("Npgsql.NpgsqlConnection, Npgsql")
                ?? throw new InvalidOperationException("Npgsql is not available. Add the Npgsql NuGet package.");
            return (DbConnection)Activator.CreateInstance(type, connectionString)!;
        }

        private static DbParameter CreateNpgsqlParameter(string name, object? value)
        {
            var type = Type.GetType("Npgsql.NpgsqlParameter, Npgsql")
                ?? throw new InvalidOperationException("Npgsql is not available. Add the Npgsql NuGet package.");
            return (DbParameter)Activator.CreateInstance(type, name, value ?? DBNull.Value)!;
        }

        private static DbParameter CreateNpgsqlOutputParam()
        {
            var type = Type.GetType("Npgsql.NpgsqlParameter, Npgsql")
                ?? throw new InvalidOperationException("Npgsql is not available. Add the Npgsql NuGet package.");
            return (DbParameter)Activator.CreateInstance(type)!;
        }

        #endregion

        #region MySQL helpers (reflection-based to avoid hard compile dependency)

        private static DbConnection CreateMySqlConnection(string connectionString)
        {
            var type = Type.GetType("MySqlConnector.MySqlConnection, MySqlConnector")
                ?? throw new InvalidOperationException("MySqlConnector is not available. Add the MySqlConnector NuGet package.");
            return (DbConnection)Activator.CreateInstance(type, connectionString)!;
        }

        private static DbParameter CreateMySqlParameter(string name, object? value)
        {
            var type = Type.GetType("MySqlConnector.MySqlParameter, MySqlConnector")
                ?? throw new InvalidOperationException("MySqlConnector is not available. Add the MySqlConnector NuGet package.");
            return (DbParameter)Activator.CreateInstance(type, name, value ?? DBNull.Value)!;
        }

        private static DbParameter CreateMySqlOutputParam()
        {
            var type = Type.GetType("MySqlConnector.MySqlParameter, MySqlConnector")
                ?? throw new InvalidOperationException("MySqlConnector is not available. Add the MySqlConnector NuGet package.");
            return (DbParameter)Activator.CreateInstance(type)!;
        }

        #endregion

        /// <summary>
        /// Create a DbCommand for calling a stored procedure.
        /// SQL Server and PostgreSQL: uses CommandType.StoredProcedure.
        /// Npgsql 6+ generates CALL for procedures (CREATE PROCEDURE) automatically.
        /// Parameter names must be lowercase for PostgreSQL — handled by NormalizeParameterName.
        /// </summary>
        public DbCommand CreateProcedureCommand(string procedureName, DbConnection connection)
        {
            var cmd = connection.CreateCommand();
            cmd.CommandText = procedureName;
            cmd.CommandType = CommandType.StoredProcedure;
            return cmd;
        }

        // ─────────────────────────────────────────────────────────────────────
        // PostgreSQL function command wrapper
        // Npgsql 6+ uses CALL for CommandType.StoredProcedure, but PostgreSQL
        // FUNCTIONS (CREATE FUNCTION) must be invoked via SELECT * FROM func(...).
        // This wrapper translates a stored-procedure-style call into the correct
        // SELECT form and maps OUT result columns back to output DbParameters.
        // ─────────────────────────────────────────────────────────────────────
        private sealed class PostgreSqlFunctionCommand : DbCommand
        {
            private readonly DbConnection _connection;
            private string _commandText;
            private CommandType _commandType = CommandType.Text;
            private readonly SimpleParameterCollection _parameters = new();

            public PostgreSqlFunctionCommand(string functionName, DbConnection connection)
            {
                _commandText = functionName;
                _connection = connection;
            }

            public override string CommandText { get => _commandText; set => _commandText = value; }
            public override int CommandTimeout { get; set; } = 30;
            public override CommandType CommandType { get => _commandType; set => _commandType = value; }
            public override bool DesignTimeVisible { get; set; } = true;
            public override UpdateRowSource UpdatedRowSource { get; set; } = UpdateRowSource.None;
            protected override DbConnection? DbConnection { get => _connection; set { } }
            protected override DbParameterCollection DbParameterCollection => _parameters;
            protected override DbTransaction? DbTransaction { get; set; }

            public override void Cancel() { }
            public override void Prepare() { }
            protected override DbParameter CreateDbParameter() => _connection.CreateCommand().CreateParameter();

            // ── ExecuteNonQuery ──────────────────────────────────────────────
            public override int ExecuteNonQuery()
                => ExecuteNonQueryAsync(CancellationToken.None).GetAwaiter().GetResult();

            public override async Task<int> ExecuteNonQueryAsync(CancellationToken cancellationToken)
            {
                if (_commandType == CommandType.StoredProcedure)
                {
                    var (sql, inParams) = BuildFunctionSql();
                    using var innerCmd = _connection.CreateCommand();
                    innerCmd.CommandText = sql;
                    innerCmd.CommandType = CommandType.Text;
                    AddInputParameters(innerCmd, inParams);

                    using var reader = await innerCmd.ExecuteReaderAsync(cancellationToken);
                    if (await reader.ReadAsync(cancellationToken))
                        MapOutColumns(reader);
                    return 0;
                }
                else
                {
                    using var innerCmd = _connection.CreateCommand();
                    innerCmd.CommandText = _commandText;
                    innerCmd.CommandType = _commandType;
                    foreach (DbParameter p in _parameters)
                    {
                        var np = innerCmd.CreateParameter();
                        np.ParameterName = p.ParameterName.TrimStart('@');
                        np.Value = p.Value ?? DBNull.Value;
                        np.DbType = p.DbType;
                        np.Direction = p.Direction;
                        innerCmd.Parameters.Add(np);
                    }
                    return await innerCmd.ExecuteNonQueryAsync(cancellationToken);
                }
            }

            // ── ExecuteScalar ────────────────────────────────────────────────
            public override object? ExecuteScalar()
                => ExecuteScalarAsync(CancellationToken.None).GetAwaiter().GetResult();

            public override async Task<object?> ExecuteScalarAsync(CancellationToken cancellationToken)
            {
                var (sql, inParams) = BuildFunctionSql();
                using var innerCmd = _connection.CreateCommand();
                innerCmd.CommandText = sql;
                AddInputParameters(innerCmd, inParams);
                return await innerCmd.ExecuteScalarAsync(cancellationToken);
            }

            // ── ExecuteReader ────────────────────────────────────────────────
            protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
                => ExecuteDbDataReaderAsync(behavior, CancellationToken.None).GetAwaiter().GetResult();

            protected override async Task<DbDataReader> ExecuteDbDataReaderAsync(CommandBehavior behavior, CancellationToken cancellationToken)
            {
                var (sql, inParams) = BuildFunctionSql();
                using var innerCmd = _connection.CreateCommand();
                innerCmd.CommandText = sql;
                AddInputParameters(innerCmd, inParams);
                return await innerCmd.ExecuteReaderAsync(behavior, cancellationToken);
            }

            // ── Helpers ──────────────────────────────────────────────────────
            private (string sql, List<(string name, object? value)> inParams) BuildFunctionSql()
            {
                var inParams = new List<(string name, object? value)>();
                var paramRefs = new List<string>();

                foreach (DbParameter p in _parameters)
                {
                    if (p.Direction == ParameterDirection.Input)
                    {
                        var name = p.ParameterName.TrimStart('@');
                        inParams.Add((name, p.Value == DBNull.Value ? null : p.Value));
                        // Use named-argument syntax: param_name => @param_name
                        paramRefs.Add($"{name} => @{name}");
                    }
                }

                return ($"SELECT * FROM {_commandText}({string.Join(", ", paramRefs)})", inParams);
            }

            private static void AddInputParameters(DbCommand cmd, List<(string name, object? value)> inParams)
            {
                foreach (var (name, value) in inParams)
                {
                    var p = cmd.CreateParameter();
                    p.ParameterName = name;
                    p.Value = value ?? DBNull.Value;
                    cmd.Parameters.Add(p);
                }
            }

            private void MapOutColumns(DbDataReader reader)
            {
                foreach (DbParameter outParam in _parameters)
                {
                    if (outParam.Direction != ParameterDirection.Output) continue;
                    var col = outParam.ParameterName.TrimStart('@');
                    try
                    {
                        var ordinal = reader.GetOrdinal(col);
                        outParam.Value = reader.IsDBNull(ordinal) ? DBNull.Value : reader.GetValue(ordinal);
                    }
                    catch (IndexOutOfRangeException) { /* column not present — leave Value as-is */ }
                }
            }
        }

        // Simple DbParameterCollection backed by a List<DbParameter>
        private sealed class SimpleParameterCollection : DbParameterCollection
        {
            private readonly List<DbParameter> _list = new();

            public override int Count => _list.Count;
            public override object SyncRoot => ((System.Collections.ICollection)_list).SyncRoot;

            public override int Add(object value) { _list.Add((DbParameter)value); return _list.Count - 1; }
            public override void AddRange(Array values) { foreach (DbParameter p in values) _list.Add(p); }
            public override void Clear() => _list.Clear();
            public override bool Contains(object value) => _list.Contains((DbParameter)value);
            public override bool Contains(string value) => _list.Any(p => p.ParameterName.TrimStart('@') == value.TrimStart('@'));
            public override void CopyTo(Array array, int index) => ((System.Collections.ICollection)_list).CopyTo(array, index);
            public override System.Collections.IEnumerator GetEnumerator() => _list.GetEnumerator();
            public override int IndexOf(object value) => _list.IndexOf((DbParameter)value);
            public override int IndexOf(string parameterName) => _list.FindIndex(p => p.ParameterName.TrimStart('@') == parameterName.TrimStart('@'));
            public override void Insert(int index, object value) => _list.Insert(index, (DbParameter)value);
            public override void Remove(object value) => _list.Remove((DbParameter)value);
            public override void RemoveAt(int index) => _list.RemoveAt(index);
            public override void RemoveAt(string parameterName) => _list.RemoveAll(p => p.ParameterName.TrimStart('@') == parameterName.TrimStart('@'));
            protected override DbParameter GetParameter(int index) => _list[index];
            protected override DbParameter GetParameter(string parameterName) =>
                _list.First(p => p.ParameterName.TrimStart('@') == parameterName.TrimStart('@'));
            protected override void SetParameter(int index, DbParameter value) => _list[index] = value;
            protected override void SetParameter(string parameterName, DbParameter value)
            {
                var idx = IndexOf(parameterName);
                if (idx >= 0) _list[idx] = value;
            }
        }
    }
}
