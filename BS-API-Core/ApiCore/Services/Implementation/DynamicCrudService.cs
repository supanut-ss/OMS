using Microsoft.EntityFrameworkCore;
using ApiCore.Data;
using ApiCore.Models.Base;
using ApiCore.Models.Dynamic;
using ApiCore.Services.Interfaces;
using System.Data;
using System.Data.Common;
using System.Text;
using System.Text.Json;
using System.Diagnostics;
using System.Security;
using System.Text.RegularExpressions;

namespace ApiCore.Services.Implementation
{
    /// <summary>
    /// Dynamic CRUD service for auto-generated database operations
    /// </summary>
    public class DynamicCrudService : IDynamicCrudService
    {
        private readonly ApplicationDbContext _context;
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly ILogger<DynamicCrudService> _logger;
        private readonly IConfiguration _configuration;

        // Security: Allowed schemas and forbidden tables (loaded from configuration)
        private readonly HashSet<string> _allowedSchemas;
        private readonly HashSet<string> _forbiddenTables;
        private static readonly HashSet<string> GlobalFilterExcludedColumns =
            new(new[] { "create_by", "update_by" }, StringComparer.OrdinalIgnoreCase);

        public DynamicCrudService(
            ApplicationDbContext context,
            ISqlConnectionFactory connectionFactory,
            ILogger<DynamicCrudService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _connectionFactory = connectionFactory;
            _logger = logger;
            _configuration = configuration;

            // Load allowed schemas from configuration, with fallback defaults
            var configSchemas = _configuration.GetSection("DynamicCrud:AllowedSchemas").Get<string[]>();
            _allowedSchemas = configSchemas != null && configSchemas.Length > 0
                ? new HashSet<string>(configSchemas, StringComparer.OrdinalIgnoreCase)
                : new HashSet<string>(new[] { "dbo", "sec", "tmt", "imp", "ams" }, StringComparer.OrdinalIgnoreCase);

            // Load forbidden tables from configuration, with fallback defaults
            var configForbidden = _configuration.GetSection("DynamicCrud:ForbiddenTables").Get<string[]>();
            _forbiddenTables = configForbidden != null && configForbidden.Length > 0
                ? new HashSet<string>(configForbidden, StringComparer.OrdinalIgnoreCase)
                : new HashSet<string>(new[] { "sysdiagrams", "__efmigrationshistory", "aspnetusers", "aspnetuserroles" }, StringComparer.OrdinalIgnoreCase);

            _logger.LogInformation("🔒 DynamicCrud Security Configuration:");
            _logger.LogInformation("   ✅ Allowed Schemas: {AllowedSchemas}", string.Join(", ", _allowedSchemas));
            _logger.LogInformation("   ❌ Forbidden Tables: {ForbiddenTables}", string.Join(", ", _forbiddenTables));
        }

        public async Task<DynamicTableMetadata> GetTableMetadataAsync(string tableName, string schemaName = "dbo")
        {
            ValidateSecurityConstraints(tableName, schemaName);

            var dialect = _connectionFactory.Dialect;
            var query = dialect.GetColumnMetadataQuery();

            using var connection = _connectionFactory.CreateConnection();
            await connection.OpenAsync();

            var columns = new List<DynamicColumnInfo>();
            var primaryKeys = new List<string>();

            // Get column metadata
            using (var command = _connectionFactory.CreateCommand(query, connection))
            {
                command.Parameters.Add(_connectionFactory.CreateParameter("@TableName", tableName));
                command.Parameters.Add(_connectionFactory.CreateParameter("@SchemaName", schemaName));

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var columnInfo = new DynamicColumnInfo
                    {
                        ColumnName = reader.GetString("COLUMN_NAME"),
                        DataType = reader.GetString("DATA_TYPE"),
                        IsNullable = reader.GetString("IS_NULLABLE") == "YES",
                        IsPrimaryKey = reader.GetInt32("IS_PRIMARY_KEY") == 1,
                        IsIdentity = reader.GetInt32("IS_IDENTITY") == 1,
                        MaxLength = reader.IsDBNull("CHARACTER_MAXIMUM_LENGTH") ? null : reader.GetInt32("CHARACTER_MAXIMUM_LENGTH"),
                        Precision = reader.IsDBNull("NUMERIC_PRECISION") ? null : Convert.ToInt32(reader.GetByte("NUMERIC_PRECISION")),
                        Scale = reader.IsDBNull("NUMERIC_SCALE") ? null : Convert.ToInt32(reader.GetInt32("NUMERIC_SCALE")),
                        DefaultValue = reader.IsDBNull("COLUMN_DEFAULT") ? null : reader.GetString("COLUMN_DEFAULT"),
                        Description = reader.IsDBNull("COLUMN_DESCRIPTION") ? null : reader.GetValue("COLUMN_DESCRIPTION")?.ToString()
                    };

                    columns.Add(columnInfo);

                    if (columnInfo.IsPrimaryKey)
                    {
                        primaryKeys.Add(columnInfo.ColumnName);
                    }
                }
            } // Reader is disposed here

            // Get row count with a new command after reader is closed
            var countQuery = $"SELECT COUNT(*) FROM {dialect.QuoteTable(schemaName, tableName)}";
            using var countCommand = _connectionFactory.CreateCommand(countQuery, connection);
            var totalRows = Convert.ToInt32(await countCommand.ExecuteScalarAsync());

            return new DynamicTableMetadata
            {
                TableName = tableName,
                SchemaName = schemaName,
                TableType = DynamicTableType.Table,
                Columns = columns,
                PrimaryKeys = primaryKeys,
                TotalRows = totalRows,
                FetchedAt = DateTime.UtcNow
            };
        }

        public async Task<DynamicSchemaResponse> GetSchemaAsync(DynamicSchemaRequest request)
        {
            var schemaPattern = string.IsNullOrEmpty(request.SchemaName) ? "%" : request.SchemaName;
            var searchPattern = string.IsNullOrEmpty(request.SearchPattern) ? "%" : $"%{request.SearchPattern}%";

            var dialect = _connectionFactory.Dialect;
            var query = dialect.GetSchemaQuery();

            using var connection = _connectionFactory.CreateConnection();
            await connection.OpenAsync();

            var tables = new List<DynamicTableInfo>();
            var views = new List<DynamicTableInfo>();

            // Get tables and views first
            using (var command = _connectionFactory.CreateCommand(query, connection))
            {
                command.Parameters.Add(_connectionFactory.CreateParameter("@SchemaPattern", schemaPattern));
                command.Parameters.Add(_connectionFactory.CreateParameter("@SearchPattern", searchPattern));

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var tableInfo = new DynamicTableInfo
                    {
                        TableName = reader.GetString("TABLE_NAME"),
                        SchemaName = reader.GetString("TABLE_SCHEMA"),
                        TableType = reader.GetString("TABLE_TYPE") == "Table" ? DynamicTableType.Table : DynamicTableType.View,
                        RowCount = reader.GetInt32("ROW_COUNT"),
                        CreateDate = reader.IsDBNull("create_date") ? null : reader.GetDateTime("create_date"),
                        ModifyDate = reader.IsDBNull("modify_date") ? null : reader.GetDateTime("modify_date")
                    };

                    if (tableInfo.TableType == DynamicTableType.Table)
                        tables.Add(tableInfo);
                    else
                        views.Add(tableInfo);
                }
            } // First reader is disposed here

            // Get stored procedures with a new command
            var spQuery = dialect.GetStoredProcedureListQuery();

            using (var spCommand = _connectionFactory.CreateCommand(spQuery, connection))
            {
                spCommand.Parameters.Add(_connectionFactory.CreateParameter("@SchemaPattern", schemaPattern));
                spCommand.Parameters.Add(_connectionFactory.CreateParameter("@SearchPattern", searchPattern));

                using var spReader = await spCommand.ExecuteReaderAsync();
                var storedProcedures = new List<DynamicStoredProcedureInfo>();

                while (await spReader.ReadAsync())
                {
                    storedProcedures.Add(new DynamicStoredProcedureInfo
                    {
                        ProcedureName = spReader.GetString("PROCEDURE_NAME"),
                        SchemaName = spReader.GetString("SCHEMA_NAME"),
                        CreateDate = spReader.IsDBNull("create_date") ? null : spReader.GetDateTime("create_date"),
                        ModifyDate = spReader.IsDBNull("modify_date") ? null : spReader.GetDateTime("modify_date")
                    });
                }

                return new DynamicSchemaResponse
                {
                    Tables = tables,
                    Views = views,
                    StoredProcedures = storedProcedures
                };
            } // Second reader is disposed here
        }

        public async Task<DynamicDataGridResponse> GetDataGridAsync(DynamicDataGridRequest request)
        {
            var stopwatch = Stopwatch.StartNew();

            try
            {
                ValidateSecurityConstraints(request.TableName, request.SchemaName ?? "dbo");

                // Debug logging for Quick Filter
                _logger.LogInformation("🔍 Processing DataGrid request: {TableName}, Request.QuickFilter: {QuickFilter}, FilterModel.QuickFilterValues: {QuickFilterValues}, FilterModel.QuickFilter: {FilterModelQuickFilter}",
                    request.TableName,
                    request.QuickFilter,
                    request.FilterModel?.QuickFilterValues,
                    request.FilterModel?.QuickFilter);

                var metadata = await GetTableMetadataAsync(request.TableName, request.SchemaName ?? "dbo");

                var pageSize = request.End - request.Start;
                var offset = request.Start;

                // Build SELECT clause
                var dialect = _connectionFactory.Dialect;
                var selectColumns = request.SelectColumns?.Any() == true
                    ? string.Join(", ", request.SelectColumns.Select(c => $"t.{dialect.QuoteIdentifier(c)}"))
                    : "*";

                // Build WHERE clause
                var whereClause = BuildDynamicWhereClause(request, metadata);

                // Debug logging for WHERE clause
                _logger.LogInformation("🏗️ Generated WHERE clause: {WhereClause}", whereClause);

                // Build ORDER BY clause
                var orderByClause = BuildDynamicOrderByClause(request.SortModel, metadata, request.CustomOrderBy);
                _logger.LogInformation("🏗️ Generated ORDER BY clause: {OrderByClause}", orderByClause);

                // Build User Lookup JOIN and SELECT (pass metadata for column existence check)
                // If not configured, use default configuration to always show user names
                var userLookup = request.UserLookup ?? new UserLookupConfig
                {
                    Table = "sec.t_com_user",
                    IdField = "user_id",
                    DisplayFields = new List<string> { "first_name", "last_name" },
                    Separator = " "
                };

                var userLookupJoin = BuildUserLookupJoin(userLookup, "t", metadata);
                var userLookupSelect = BuildUserLookupSelect(userLookup, metadata, "t");

                // Build SELECT clause with user lookup fields
                // Always use explicit column list with table alias to avoid ambiguous column names when joining
                string fullSelectColumns;
                if (selectColumns == "*")
                {
                    // Generate explicit column list with table alias to prevent ambiguous columns
                    var explicitColumns = metadata.Columns
                        .Select(c => $"t.{dialect.QuoteIdentifier(c.ColumnName)}")
                        .ToList();
                    fullSelectColumns = string.Join(", ", explicitColumns);
                }
                else
                {
                    // selectColumns already has table alias from above
                    fullSelectColumns = selectColumns;
                }

                if (!string.IsNullOrEmpty(userLookupSelect))
                {
                    fullSelectColumns += userLookupSelect;
                }

                // Build GROUP BY clause if specified
                var groupByClause = "";
                if (!string.IsNullOrEmpty(request.GroupBy))
                {
                    // Validate GROUP BY columns against metadata
                    var groupByColumns = request.GroupBy.Split(',')
                        .Select(c => c.Trim())
                        .Where(c => metadata.Columns.Any(col => col.ColumnName.Equals(c, StringComparison.OrdinalIgnoreCase)))
                        .ToList();

                    if (groupByColumns.Any())
                    {
                        groupByClause = $"GROUP BY {string.Join(", ", groupByColumns.Select(c => $"t.{dialect.QuoteIdentifier(c)}"))}";
                        // When GROUP BY is used, we need to adjust SELECT columns to only include grouped columns
                        fullSelectColumns = string.Join(", ", groupByColumns.Select(c => $"t.{dialect.QuoteIdentifier(c)}"));
                    }
                }

                // Build final query using dialect
                var schemaName = request.SchemaName ?? "dbo";
                var fromClause = $"{dialect.QuoteTable(schemaName, request.TableName)} t {userLookupJoin}";
                var query = dialect.BuildDataGridQuery(fullSelectColumns, fromClause, whereClause, orderByClause, string.IsNullOrEmpty(groupByClause) ? null : groupByClause);

                _logger.LogInformation("🔍 Generated SQL Query: {Query}", query);

                using var connection = _connectionFactory.CreateConnection();
                using var command = _connectionFactory.CreateCommand(query, connection);

                // Add parameters
                command.Parameters.Add(_connectionFactory.CreateParameter("@Offset", offset));
                command.Parameters.Add(_connectionFactory.CreateParameter("@PageSize", pageSize));

                // Add filter parameters
                AddFilterParameters(command, request, metadata);

                await connection.OpenAsync();
                using var reader = await command.ExecuteReaderAsync();

                var response = new DynamicDataGridResponse();
                var rows = new List<DynamicResponse>();

                if (!string.IsNullOrEmpty(groupByClause))
                {
                    // GROUP BY query: SELECT data first, then SELECT COUNT
                    _logger.LogInformation("📊 Reading GROUP BY query results (data first, then count)");

                    // Read data first
                    while (await reader.ReadAsync())
                    {
                        var data = new Dictionary<string, object>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            var fieldName = reader.GetName(i);
                            var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                            data[fieldName] = value;
                        }
                        rows.Add(new DynamicResponse
                        {
                            Data = data,
                            Metadata = metadata
                        });
                    }
                    response.Rows = rows;
                    _logger.LogInformation("✅ Read {RowCount} grouped rows", rows.Count);

                    // Read total count from second result set
                    if (await reader.NextResultAsync() && await reader.ReadAsync())
                    {
                        response.RowCount = reader.GetInt32(0);
                        _logger.LogInformation("✅ GROUP BY total count: {TotalCount}", response.RowCount);
                    }
                    else
                    {
                        response.RowCount = rows.Count;
                    }
                }
                else
                {
                    // Standard query: SELECT COUNT first, then SELECT data
                    if (await reader.ReadAsync())
                    {
                        response.RowCount = reader.GetInt32("TotalCount");
                        _logger.LogInformation("✅ Total count retrieved: {TotalCount}", response.RowCount);
                    }
                    else
                    {
                        _logger.LogWarning("⚠️ No TotalCount result set returned from query - using 0 as default");
                        response.RowCount = 0;
                    }

                    // Read data
                    if (await reader.NextResultAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            var data = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                var fieldName = reader.GetName(i);
                                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                                data[fieldName] = value;
                            }
                            rows.Add(new DynamicResponse
                            {
                                Data = data,
                                Metadata = metadata
                            });
                        }
                        response.Rows = rows;
                    }
                }

                stopwatch.Stop();

                response.TableMetadata = metadata;
                response.ColumnDefinitions = metadata.Columns;
                response.Metadata = new DataGridMetadata
                {
                    Start = request.Start,
                    End = request.End,
                    PageSize = pageSize,
                    CurrentPage = (offset / pageSize) + 1,
                    TotalPages = (int)Math.Ceiling((double)response.RowCount / pageSize),
                    AppliedSort = request.SortModel,
                    AppliedFilters = request.FilterModel.Items,
                    QueryExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                    FetchedAt = DateTime.UtcNow
                };

                return response;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Error retrieving dynamic DataGrid data for table {TableName}", request.TableName);
                throw new Exception($"Error retrieving data: {ex.Message}", ex);
            }
        }

        public async Task<DynamicResponse?> GetByIdAsync(string tableName, Dictionary<string, object> primaryKeyValues, string schemaName = "dbo")
        {
            ValidateSecurityConstraints(tableName, schemaName);

            var metadata = await GetTableMetadataAsync(tableName, schemaName);

            if (!metadata.PrimaryKeys.Any())
            {
                throw new InvalidOperationException($"Table {tableName} does not have a primary key defined");
            }

            var whereConditions = new List<string>();
            var parameters = new List<DbParameter>();

            foreach (var pk in metadata.PrimaryKeys)
            {
                if (!primaryKeyValues.ContainsKey(pk))
                {
                    throw new ArgumentException($"Primary key value for '{pk}' is required");
                }

                whereConditions.Add($"{_connectionFactory.Dialect.QuoteIdentifier(pk)} = @{pk}");
                var convertedValue = ConvertJsonElementValue(primaryKeyValues[pk]);
                parameters.Add(_connectionFactory.CreateParameter($"@{pk}", convertedValue));
            }

            var query = $@"
                SELECT *
                FROM {_connectionFactory.Dialect.QuoteTable(schemaName, tableName)}
                WHERE {string.Join(" AND ", whereConditions)}";

            using var connection = _connectionFactory.CreateConnection();
            using var command = _connectionFactory.CreateCommand(query, connection);
            foreach (var p in parameters) command.Parameters.Add(p);

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                var data = new Dictionary<string, object>();

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    data[fieldName] = value;
                }

                return new DynamicResponse
                {
                    Data = data,
                    Metadata = metadata
                };
            }

            return null;
        }

        public async Task<DynamicResponse> CreateAsync(DynamicCreateRequest request)
        {
            ValidateSecurityConstraints(request.TableName, request.SchemaName ?? "dbo");

            var metadata = await GetTableMetadataAsync(request.TableName, request.SchemaName ?? "dbo");

            // Filter out identity columns and timestamp columns from insert data.
            // Also strip any "DEFAULT" sentinel values — sequence columns are handled
            // separately below; other default-only columns are simply omitted so the
            // database applies their DEFAULT constraint automatically.
            var insertData = request.Data
                .Where(kvp => !metadata.Columns.Any(c => c.ColumnName == kvp.Key &&
                    (c.IsIdentity ||
                     c.DataType.ToLower() == "timestamp" ||
                     c.DataType.ToLower() == "rowversion")))
                .Where(kvp => !IsDefaultValueSentinel(kvp.Value))
                .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            // Detect sequence-based PK columns (NEXT VALUE FOR ...) and build raw SQL
            // expressions for them so they are injected directly into VALUES, not as params.
            var sequenceExpressions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var col in metadata.Columns)
            {
                var defaultStr = col.DefaultValue?.ToString();
                if (string.IsNullOrEmpty(defaultStr)) continue;
                var match = Regex.Match(defaultStr,
                    @"NEXT\s+VALUE\s+FOR\s+([\[\w\]\.]+)",
                    RegexOptions.IgnoreCase);
                if (!match.Success) continue;
                var seqExpr = $"NEXT VALUE FOR {match.Groups[1].Value}";
                // Remove brackets from group to re-quote cleanly, or keep as-is
                sequenceExpressions[col.ColumnName] = seqExpr;
                // Ensure the column is not in the parameterized insertData
                insertData.Remove(col.ColumnName);
            }

            // Add audit fields if they exist
            if (metadata.Columns.Any(c => c.ColumnName == "create_date"))
                insertData["create_date"] = DateTime.Now;
            if (metadata.Columns.Any(c => c.ColumnName == "update_date"))
                insertData["update_date"] = DateTime.Now;

            // Add create_by field if it exists and not already provided
            if (metadata.Columns.Any(c => c.ColumnName == "create_by") && !insertData.ContainsKey("create_by"))
            {
                // Get user_id from request context or use default value
                var userId = request.UserId ?? request.Data.GetValueOrDefault("user_id")?.ToString() ?? "system";
                insertData["create_by"] = userId;
            }

            // Add update_by field if it exists and not already provided
            if (metadata.Columns.Any(c => c.ColumnName == "update_by") && !insertData.ContainsKey("update_by"))
            {
                var userId = request.UserId ?? request.Data.GetValueOrDefault("user_id")?.ToString() ?? "system";
                insertData["update_by"] = userId;
            }

            var dialect = _connectionFactory.Dialect;

            // Combine parameterized columns + raw sequence expression columns
            var allColumnNames = insertData.Keys.Concat(sequenceExpressions.Keys).ToList();
            var columns = string.Join(", ", allColumnNames.Select(k => dialect.QuoteIdentifier(k)));
            var values = string.Join(", ",
                insertData.Keys.Select(k => $"@{k}")
                .Concat(sequenceExpressions.Values));

            var schemaName = request.SchemaName ?? "dbo";
            var query = dialect.BuildInsertReturning(schemaName, request.TableName, columns, values);

            using var connection = _connectionFactory.CreateConnection();
            using var command = _connectionFactory.CreateCommand(query, connection);

            foreach (var kvp in insertData)
            {
                var convertedValue = ConvertCrudDataValue(kvp.Value);
                command.Parameters.Add(_connectionFactory.CreateParameter($"@{kvp.Key}", convertedValue));
            }

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                var data = new Dictionary<string, object>();

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    data[fieldName] = value;
                }

                return new DynamicResponse
                {
                    Data = data,
                    Metadata = metadata
                };
            }

            throw new Exception("Failed to create record");
        }

        public async Task<DynamicResponse> UpdateAsync(DynamicUpdateRequest request)
        {
            ValidateSecurityConstraints(request.TableName, request.SchemaName ?? "dbo");

            var metadata = await GetTableMetadataAsync(request.TableName, request.SchemaName ?? "dbo");

            // Filter out identity columns, primary keys, and timestamp columns from update data
            var updateData = request.Data
                .Where(kvp => !metadata.Columns.Any(c => c.ColumnName == kvp.Key &&
                    (c.IsIdentity || c.IsPrimaryKey ||
                     c.DataType.ToLower() == "timestamp" ||
                     c.DataType.ToLower() == "rowversion")))
                .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            // Add audit fields if they exist
            if (metadata.Columns.Any(c => c.ColumnName == "update_date"))
                updateData["update_date"] = DateTime.Now;

            // Add update_by field if it exists and not already provided
            if (metadata.Columns.Any(c => c.ColumnName == "update_by") && !updateData.ContainsKey("update_by"))
            {
                var userId = request.UserId ?? request.Data.GetValueOrDefault("user_id")?.ToString() ?? "system";
                updateData["update_by"] = userId;
            }

            var dialect = _connectionFactory.Dialect;
            var setClause = string.Join(", ", updateData.Keys.Select(k => $"{dialect.QuoteIdentifier(k)} = @{k}"));
            var whereClause = string.Join(" AND ", request.WhereConditions.Keys.Select(k => $"{dialect.QuoteIdentifier(k)} = @Where_{k}"));

            var schemaName = request.SchemaName ?? "dbo";
            var query = dialect.BuildUpdateReturning(schemaName, request.TableName, setClause, whereClause);

            using var connection = _connectionFactory.CreateConnection();
            using var command = _connectionFactory.CreateCommand(query, connection);

            // Add SET parameters
            foreach (var kvp in updateData)
            {
                var convertedValue = ConvertCrudDataValue(kvp.Value);
                command.Parameters.Add(_connectionFactory.CreateParameter($"@{kvp.Key}", convertedValue));
            }

            // Add WHERE parameters
            foreach (var kvp in request.WhereConditions)
            {
                var convertedValue = ConvertJsonElementValue(kvp.Value);
                command.Parameters.Add(_connectionFactory.CreateParameter($"@Where_{kvp.Key}", convertedValue));
            }

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                var data = new Dictionary<string, object>();

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    data[fieldName] = value;
                }

                return new DynamicResponse
                {
                    Data = data,
                    Metadata = metadata
                };
            }

            throw new Exception("Failed to update record - record not found");
        }

        public async Task<bool> DeleteAsync(DynamicDeleteRequest request)
        {
            ValidateSecurityConstraints(request.TableName, request.SchemaName ?? "dbo");

            var dialect = _connectionFactory.Dialect;
            var whereClause = string.Join(" AND ", request.WhereConditions.Keys.Select(k => $"{dialect.QuoteIdentifier(k)} = @{k}"));

            var query = $@"
                DELETE FROM {dialect.QuoteTable(request.SchemaName ?? "dbo", request.TableName)}
                WHERE {whereClause}";

            using var connection = _connectionFactory.CreateConnection();
            using var command = _connectionFactory.CreateCommand(query, connection);

            foreach (var kvp in request.WhereConditions)
            {
                var convertedValue = ConvertJsonElementValue(kvp.Value);
                command.Parameters.Add(_connectionFactory.CreateParameter($"@{kvp.Key}", convertedValue));
            }

            await connection.OpenAsync();
            var affectedRows = await command.ExecuteNonQueryAsync();

            return affectedRows > 0;
        }

        public async Task<DynamicDataGridResponse> ExecuteStoredProcedureAsync(string procedureName, Dictionary<string, object>? parameters = null, string schemaName = "dbo")
        {
            ValidateSecurityConstraints(procedureName, schemaName);

            var stopwatch = Stopwatch.StartNew();

            try
            {
                var dialect = _connectionFactory.Dialect;
                using var connection = _connectionFactory.CreateConnection();
                using var command = _connectionFactory.CreateCommand($"{dialect.QuoteTable(schemaName, procedureName)}", connection);
                command.CommandType = CommandType.StoredProcedure;

                if (parameters != null)
                {
                    foreach (var kvp in parameters)
                    {
                        var convertedValue = ConvertJsonElementValue(kvp.Value);
                        command.Parameters.Add(_connectionFactory.CreateParameter($"@{kvp.Key}", convertedValue));
                    }
                }

                await connection.OpenAsync();
                using var reader = await command.ExecuteReaderAsync();

                // Enhanced SP returns multiple result sets: metadata, count, data
                var metadata = new List<DynamicColumnInfo>();
                var rows = new List<DynamicResponse>();
                var totalCount = 0;
                var tableMetadata = new DynamicTableMetadata();

                // First result set: Column metadata (from usf_get_column_metadata)
                if (reader.HasRows)
                {
                    while (await reader.ReadAsync())
                    {
                        var columnInfo = new DynamicColumnInfo
                        {
                            ColumnName = reader["COLUMN_NAME"]?.ToString() ?? "",
                            DataType = reader["DATA_TYPE"]?.ToString() ?? "",
                            IsNullable = reader["IS_NULLABLE"]?.ToString() == "YES",
                            MaxLength = reader["CHARACTER_MAXIMUM_LENGTH"] as int?,
                            Precision = reader["NUMERIC_PRECISION"] as byte?,
                            Scale = reader["NUMERIC_SCALE"] as int?,
                            DefaultValue = reader["COLUMN_DEFAULT"]?.ToString(),
                            IsPrimaryKey = Convert.ToBoolean(reader["IS_PRIMARY_KEY"] ?? false),
                            IsIdentity = Convert.ToBoolean(reader["IS_IDENTITY"] ?? false),
                            OrdinalPosition = Convert.ToInt32(reader["ORDINAL_POSITION"] ?? 0)
                        };
                        metadata.Add(columnInfo);

                        // Build table metadata for primary keys
                        if (columnInfo.IsPrimaryKey)
                        {
                            tableMetadata.PrimaryKeys.Add(columnInfo.ColumnName);
                        }
                    }
                }

                // Second result set: Total count
                if (await reader.NextResultAsync() && reader.HasRows)
                {
                    if (await reader.ReadAsync())
                    {
                        totalCount = Convert.ToInt32(reader["TotalCount"] ?? 0);
                    }
                }

                // Third result set: Actual data
                if (await reader.NextResultAsync() && reader.HasRows)
                {
                    // Get column information from data result set for fallback
                    var dataColumns = new List<DynamicColumnInfo>();
                    if (reader.FieldCount > 0)
                    {
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            dataColumns.Add(new DynamicColumnInfo
                            {
                                ColumnName = reader.GetName(i),
                                DataType = reader.GetFieldType(i).Name
                            });
                        }
                    }

                    while (await reader.ReadAsync())
                    {
                        var data = new Dictionary<string, object>();

                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            var fieldName = reader.GetName(i);
                            var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                            data[fieldName] = value;
                        }

                        rows.Add(new DynamicResponse
                        {
                            Data = data
                        });
                    }

                    // Use data columns as fallback if no metadata
                    if (!metadata.Any())
                    {
                        metadata = dataColumns;
                    }
                }

                stopwatch.Stop();

                return new DynamicDataGridResponse
                {
                    Rows = rows,
                    RowCount = totalCount,
                    ColumnDefinitions = metadata,
                    TableMetadata = tableMetadata,
                    Metadata = new DataGridMetadata
                    {
                        QueryExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                        FetchedAt = DateTime.UtcNow
                    }
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Error executing stored procedure {ProcedureName}", procedureName);
                throw new Exception($"Error executing stored procedure: {ex.Message}", ex);
            }
        }

        public async Task<DynamicStoredProcedureInfo> GetStoredProcedureMetadataAsync(string procedureName, string schemaName = "dbo")
        {
            ValidateSecurityConstraints(procedureName, schemaName);

            var query = _connectionFactory.Dialect.GetStoredProcedureMetadataQuery();

            using var connection = _connectionFactory.CreateConnection();
            using var command = _connectionFactory.CreateCommand(query, connection);
            command.Parameters.Add(_connectionFactory.CreateParameter("@ProcedureName", procedureName));
            command.Parameters.Add(_connectionFactory.CreateParameter("@SchemaName", schemaName));

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();

            var procedureInfo = new DynamicStoredProcedureInfo();
            var parameters = new List<DynamicParameterInfo>();

            while (await reader.ReadAsync())
            {
                if (string.IsNullOrEmpty(procedureInfo.ProcedureName))
                {
                    procedureInfo.ProcedureName = reader.GetString("PROCEDURE_NAME");
                    procedureInfo.SchemaName = reader.GetString("SCHEMA_NAME");
                    procedureInfo.CreateDate = reader.IsDBNull("create_date") ? null : reader.GetDateTime("create_date");
                    procedureInfo.ModifyDate = reader.IsDBNull("modify_date") ? null : reader.GetDateTime("modify_date");
                }

                if (!reader.IsDBNull("PARAMETER_NAME"))
                {
                    parameters.Add(new DynamicParameterInfo
                    {
                        ParameterName = reader.GetString("PARAMETER_NAME"),
                        DataType = reader.GetString("DATA_TYPE"),
                        IsOutput = reader.GetBoolean("is_output"),
                        HasDefault = reader.GetBoolean("has_default_value"),
                        DefaultValue = reader.IsDBNull("default_value") ? null : reader.GetValue("default_value"),
                        MaxLength = reader.IsDBNull("max_length") ? null : reader.GetInt16("max_length")
                    });
                }
            }

            procedureInfo.Parameters = parameters;
            return procedureInfo;
        }

        public async Task<bool> TableExistsAsync(string tableName, string schemaName = "dbo")
        {
            var query = _connectionFactory.Dialect.GetTableExistsQuery();

            using var connection = _connectionFactory.CreateConnection();
            using var command = _connectionFactory.CreateCommand(query, connection);
            command.Parameters.Add(_connectionFactory.CreateParameter("@TableName", tableName));
            command.Parameters.Add(_connectionFactory.CreateParameter("@SchemaName", schemaName));

            await connection.OpenAsync();
            var count = Convert.ToInt32(await command.ExecuteScalarAsync());

            return count > 0;
        }

        public async Task<DynamicDataGridResponse> ExecuteQueryAsync(string sqlQuery, Dictionary<string, object>? parameters = null)
        {
            // Security: Only allow SELECT statements
            var trimmedQuery = sqlQuery.Trim();
            if (!trimmedQuery.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                throw new SecurityException("Only SELECT statements are allowed");
            }

            // Additional security checks
            var forbiddenKeywords = new[] { "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "EXEC", "EXECUTE" };
            var upperQuery = trimmedQuery.ToUpper();

            foreach (var keyword in forbiddenKeywords)
            {
                if (upperQuery.Contains(keyword))
                {
                    throw new SecurityException($"Query contains forbidden keyword: {keyword}");
                }
            }

            var stopwatch = Stopwatch.StartNew();

            try
            {
                using var connection = _connectionFactory.CreateConnection();
                using var command = _connectionFactory.CreateCommand(sqlQuery, connection);

                if (parameters != null)
                {
                    foreach (var kvp in parameters)
                    {
                        var convertedValue = ConvertJsonElementValue(kvp.Value);
                        command.Parameters.Add(_connectionFactory.CreateParameter($"@{kvp.Key}", convertedValue));
                    }
                }

                await connection.OpenAsync();
                using var reader = await command.ExecuteReaderAsync();

                var rows = new List<DynamicResponse>();
                var columns = new List<DynamicColumnInfo>();

                // Get column information
                if (reader.FieldCount > 0)
                {
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        columns.Add(new DynamicColumnInfo
                        {
                            ColumnName = reader.GetName(i),
                            DataType = reader.GetFieldType(i).Name
                        });
                    }
                }

                while (await reader.ReadAsync())
                {
                    var data = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        var fieldName = reader.GetName(i);
                        var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        data[fieldName] = value ?? DBNull.Value;
                    }

                    rows.Add(new DynamicResponse
                    {
                        Data = data
                    });
                }

                stopwatch.Stop();

                return new DynamicDataGridResponse
                {
                    Rows = rows,
                    RowCount = rows.Count,
                    ColumnDefinitions = columns,
                    Metadata = new DataGridMetadata
                    {
                        QueryExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                        FetchedAt = DateTime.UtcNow
                    }
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Error executing custom query");
                throw new Exception($"Error executing query: {ex.Message}", ex);
            }
        }

        #region Private Helper Methods

        private void ValidateSecurityConstraints(string tableName, string schemaName)
        {
            if (!_allowedSchemas.Contains(schemaName.ToLower()))
            {
                throw new SecurityException($"Schema '{schemaName}' is not allowed");
            }

            if (_forbiddenTables.Contains(tableName.ToLower()))
            {
                throw new SecurityException($"Table '{tableName}' is forbidden");
            }

            // Additional SQL injection protection
            if (tableName.Contains("'") || tableName.Contains(";") || tableName.Contains("--") ||
                schemaName.Contains("'") || schemaName.Contains(";") || schemaName.Contains("--"))
            {
                throw new SecurityException("Invalid characters detected in table or schema name");
            }
        }

        private string BuildDynamicWhereClause(DynamicDataGridRequest request, DynamicTableMetadata metadata)
        {
            var conditions = new List<string>();
            var dialect = _connectionFactory.Dialect;

            // Custom WHERE clause (from BSDataGrid ObjWh or ComboBox ObjWh)
            if (!string.IsNullOrEmpty(request.CustomWhere))
            {
                // Add table alias to column names in CustomWhere to prevent ambiguous column errors when using JOINs
                var aliasedCustomWhere = AddTableAliasToWhereClause(request.CustomWhere, metadata, "t");
                conditions.Add($"({aliasedCustomWhere})");
                _logger.LogInformation("🎯 Added CustomWhere condition: Original='{CustomWhere}', Aliased='{AliasedCustomWhere}'", request.CustomWhere, aliasedCustomWhere);
            }

            // Column filters (null-safe check)
            if (request.FilterModel?.Items != null)
            {
                foreach (var filter in request.FilterModel.Items)
                {
                    var column = metadata.Columns.FirstOrDefault(c => c.ColumnName.Equals(filter.Field, StringComparison.OrdinalIgnoreCase));
                    if (column == null) continue;

                    // Use table alias 't.' to avoid ambiguous column name when using JOINs
                    var qf = $"t.{dialect.QuoteIdentifier(filter.Field)}";
                    var condition = filter.Operator.ToLower() switch
                    {
                        "contains"    => $"{qf} LIKE @{filter.Field}_Filter",
                        "equals"      => $"{qf} = @{filter.Field}_Filter",
                        "startswith"  => $"{qf} LIKE @{filter.Field}_Filter",
                        "endswith"    => $"{qf} LIKE @{filter.Field}_Filter",
                        "isempty"     => $"({qf} IS NULL OR {qf} = '')",
                        "isnotempty"  => $"({qf} IS NOT NULL AND {qf} != '')",
                        ">"  => $"{qf} > @{filter.Field}_Filter",
                        ">=" => $"{qf} >= @{filter.Field}_Filter",
                        "<"  => $"{qf} < @{filter.Field}_Filter",
                        "<=" => $"{qf} <= @{filter.Field}_Filter",
                        "!=" => $"{qf} != @{filter.Field}_Filter",
                        _    => $"{qf} LIKE @{filter.Field}_Filter"
                    };
                    conditions.Add(condition);
                }
            }

            // Quick filter - รองรับทั้ง QuickFilterValues (standard), QuickFilter ใน FilterModel และ QuickFilter ใน Request
            var quickFilterValue = !string.IsNullOrEmpty(request.FilterModel?.QuickFilter)
                ? request.FilterModel.QuickFilter
                : !string.IsNullOrEmpty(request.FilterModel?.QuickFilterValues)
                ? request.FilterModel.QuickFilterValues
                : request.QuickFilter;

            _logger.LogInformation("🔍 Quick Filter Debug: FilterModel.QuickFilter='{FilterModelQuickFilter}', FilterModel.QuickFilterValues='{QuickFilterValues}', Request.QuickFilter='{RequestQuickFilter}', Final='{FinalValue}'",
                request.FilterModel?.QuickFilter,
                request.FilterModel?.QuickFilterValues,
                request.QuickFilter,
                quickFilterValue);

            if (!string.IsNullOrEmpty(quickFilterValue))
            {
                var quickFilterConditions = new List<string>();
                foreach (var column in metadata.Columns.Where(c => IsSearchableColumn(c)))
                {
                    // Use table alias 't.' to avoid ambiguous column name when using JOINs (e.g., User Lookup)
                    quickFilterConditions.Add($"{dialect.BuildCastToText("t", column.ColumnName)} LIKE @QuickFilter");
                }

                if (quickFilterConditions.Any())
                {
                    conditions.Add($"({string.Join(" OR ", quickFilterConditions)})");
                    _logger.LogInformation("🔍 Quick Filter SQL: {QuickFilterSQL} with value '{QuickFilterValue}'",
                        string.Join(" OR ", quickFilterConditions), quickFilterValue);
                }
            }

            var logicOperator = request.FilterModel.LogicOperator.ToUpper() == "OR" ? " OR " : " AND ";
            return conditions.Count > 0 ? string.Join(logicOperator, conditions) : "";
        }

        private void AddFilterParameters(DbCommand command, DynamicDataGridRequest request, DynamicTableMetadata metadata)
        {
            if (request.FilterModel?.Items == null)
            {
                _logger.LogDebug("⚠️ FilterModel.Items is null, skipping filter parameters");
                return;
            }

            // Column filter parameters
            foreach (var filter in request.FilterModel.Items)
            {
                var column = metadata.Columns.FirstOrDefault(c => c.ColumnName.Equals(filter.Field, StringComparison.OrdinalIgnoreCase));
                if (column == null) continue;

                var paramValue = filter.Operator.ToLower() switch
                {
                    "contains" => $"%{filter.Value}%",
                    "startswith" => $"{filter.Value}%",
                    "endswith" => $"%{filter.Value}",
                    _ => filter.Value
                };

                var convertedValue = ConvertJsonElementValue(paramValue);
                command.Parameters.Add(_connectionFactory.CreateParameter($"@{filter.Field}_Filter", convertedValue));
            }

            // Quick filter parameter - รองรับทั้ง QuickFilterValues และ QuickFilter
            var quickFilterValue = !string.IsNullOrEmpty(request.FilterModel?.QuickFilter)
                ? request.FilterModel.QuickFilter
                : !string.IsNullOrEmpty(request.FilterModel?.QuickFilterValues)
                ? request.FilterModel.QuickFilterValues
                : request.QuickFilter;

            if (!string.IsNullOrEmpty(quickFilterValue))
            {
                command.Parameters.Add(_connectionFactory.CreateParameter("@QuickFilter", $"%{quickFilterValue}%"));
                _logger.LogInformation("🔍 Quick Filter Parameter Added: @QuickFilter = '%{QuickFilterParam}'", $"%{quickFilterValue}%");
            }
        }

        private string BuildDynamicOrderByClause(List<DataGridSortModel> sortModel, DynamicTableMetadata metadata, string customOrderBy = null)
        {
            var dialect = _connectionFactory.Dialect;

            // Priority 1: Custom ORDER BY (from BSDataGrid ObjBy or ComboBox ObjBy)
            if (!string.IsNullOrEmpty(customOrderBy))
            {
                _logger.LogInformation("🏗️ Using custom ORDER BY: {CustomOrderBy}", customOrderBy);
                return $"ORDER BY {customOrderBy}";
            }

            // Priority 2: SortModel from DataGrid UI
            if (sortModel != null && sortModel.Any())
            {
                var orderByClauses = new List<string>();
                foreach (var sort in sortModel)
                {
                    _logger.LogInformation("🏗️ Processing sort: {SortField} {SortDirection}", sort.Field, sort.Sort);
                    var column = metadata.Columns.FirstOrDefault(c => c.ColumnName.Equals(sort.Field, StringComparison.OrdinalIgnoreCase));
                    if (column != null)
                    {
                        var direction = sort.Sort?.ToUpper() == "DESC" ? "DESC" : "ASC";
                        orderByClauses.Add($"{dialect.QuoteIdentifier(sort.Field)} {direction}");
                        _logger.LogInformation("✅ Added ORDER BY clause: {SortField} {SortDirection}", sort.Field, direction);
                    }
                }
                if (orderByClauses.Any())
                {
                    return $"ORDER BY {string.Join(", ", orderByClauses)}";
                }
            }

            // Priority 3: Default sort by primary key or first column
            _logger.LogInformation("🏗️ No sorting specified, using default.");
            var defaultColumn = metadata.PrimaryKeys.FirstOrDefault() ?? metadata.Columns.FirstOrDefault()?.ColumnName;
            return defaultColumn != null ? $"ORDER BY {dialect.QuoteIdentifier(defaultColumn)} ASC" : "ORDER BY 1 ASC";
        }


        private bool IsSearchableColumn(DynamicColumnInfo column)
        {
            var searchableTypes = new[] { "varchar", "nvarchar", "char", "nchar", "text", "ntext" };
            return !GlobalFilterExcludedColumns.Contains(column.ColumnName)
                && searchableTypes.Contains(column.DataType.ToLower());
        }

        /// <summary>
        /// Add table alias to column names in WHERE clause to prevent ambiguous column errors
        /// Handles patterns like: column_name='value', column_name = 'value', column_name IN (...), etc.
        /// </summary>
        private string AddTableAliasToWhereClause(string whereClause, DynamicTableMetadata metadata, string tableAlias = "t")
        {
            if (string.IsNullOrEmpty(whereClause))
                return whereClause;

            var dialect = _connectionFactory.Dialect;
            // Derive quote characters from dialect (e.g. "[" and "]" for SQL Server, '"' for PostgreSQL)
            var sampleQuoted = dialect.QuoteIdentifier("x");
            var openQuote  = sampleQuoted[0].ToString();
            var closeQuote = sampleQuoted[^1].ToString();

            var result = whereClause;

            // Get all column names from metadata
            foreach (var column in metadata.Columns)
            {
                var columnName = column.ColumnName;

                // Skip if column already has alias (contains '.')
                // Use regex patterns to match column names that are not already aliased
                var patterns = new[]
                {
                    // Match column_name followed by operator
                    $@"(?<![\w.])({System.Text.RegularExpressions.Regex.Escape(columnName)})(?=\s*[=<>!]|\s+(?:LIKE|IN|IS|BETWEEN|NOT)\b)",
                    // Match column_name followed by space/parenthesis
                    $@"(?<![\w.])({System.Text.RegularExpressions.Regex.Escape(columnName)})(?=\s*[=<>!('""\[])" 
                };

                foreach (var pattern in patterns)
                {
                    result = System.Text.RegularExpressions.Regex.Replace(
                        result,
                        pattern,
                        $"{tableAlias}.{openQuote}$1{closeQuote}",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase
                    );
                }
            }

            return result;
        }

        /// <summary>
        /// Build User Lookup JOIN clause for audit fields (create_by, update_by)
        /// </summary>
        private string BuildUserLookupJoin(UserLookupConfig? userLookup, string tableAlias = "t", DynamicTableMetadata? metadata = null)
        {
            if (userLookup == null || string.IsNullOrEmpty(userLookup.Table))
                return string.Empty;

            var parts = userLookup.Table.Split('.');
            var userSchema = parts.Length > 1 ? parts[0] : "dbo";
            var userTable = parts.Length > 1 ? parts[1] : parts[0];
            var userIdField = userLookup.IdField ?? "user_id";

            var joins = new StringBuilder();

            // Check if create_by column exists in metadata
            var hasCreateBy = metadata?.Columns?.Any(c =>
                c.ColumnName.Equals("create_by", StringComparison.OrdinalIgnoreCase)) ?? true;

            // Check if update_by column exists in metadata
            var hasUpdateBy = metadata?.Columns?.Any(c =>
                c.ColumnName.Equals("update_by", StringComparison.OrdinalIgnoreCase)) ?? true;

            var dialect = _connectionFactory.Dialect;
            var quotedUserTable = dialect.QuoteTable(userSchema, userTable);

            // JOIN for create_by (only if column exists)
            if (hasCreateBy)
            {
                joins.AppendLine($@"
                LEFT JOIN {quotedUserTable} AS creator 
                    ON {tableAlias}.{dialect.QuoteIdentifier("create_by")} = creator.{dialect.QuoteIdentifier(userIdField)}");
            }

            // JOIN for update_by (only if column exists)
            if (hasUpdateBy)
            {
                joins.AppendLine($@"
                LEFT JOIN {quotedUserTable} AS updater 
                    ON {tableAlias}.{dialect.QuoteIdentifier("update_by")} = updater.{dialect.QuoteIdentifier(userIdField)}");
            }

            _logger.LogInformation("🔗 User Lookup JOIN: hasCreateBy={HasCreateBy}, hasUpdateBy={HasUpdateBy}", hasCreateBy, hasUpdateBy);

            return joins.ToString();
        }

        /// <summary>
        /// Build User Lookup SELECT clause for display fields
        /// </summary>
        private string BuildUserLookupSelect(UserLookupConfig? userLookup, DynamicTableMetadata? metadata = null, string tableAlias = "t")
        {
            if (userLookup == null || userLookup.DisplayFields == null || !userLookup.DisplayFields.Any())
                return string.Empty;

            var separator = userLookup.Separator ?? " ";

            var selects = new StringBuilder();

            // Check if create_by column exists in metadata
            var hasCreateBy = metadata?.Columns?.Any(c =>
                c.ColumnName.Equals("create_by", StringComparison.OrdinalIgnoreCase)) ?? true;

            // Check if update_by column exists in metadata
            var hasUpdateBy = metadata?.Columns?.Any(c =>
                c.ColumnName.Equals("update_by", StringComparison.OrdinalIgnoreCase)) ?? true;

            var dialect = _connectionFactory.Dialect;

            // Concatenate display fields for create_by (only if column exists)
            // Use COALESCE to fallback to user_id if JOIN returns NULL
            if (hasCreateBy)
            {
                var displayFields = userLookup.DisplayFields.Select(f => $"creator.{dialect.QuoteIdentifier(f)}");
                var concatFields = string.Join($", '{separator}', ", displayFields);
                var fallback = dialect.BuildCastToText(tableAlias, "create_by");
                selects.Append($",\n    {dialect.BuildCoalesce($"CONCAT({concatFields})", fallback)} AS create_by_display");
            }

            // Concatenate display fields for update_by (only if column exists)
            // Use COALESCE to fallback to user_id if JOIN returns NULL
            if (hasUpdateBy)
            {
                var updateFields = userLookup.DisplayFields.Select(f => $"updater.{dialect.QuoteIdentifier(f)}");
                var concatFields = string.Join($", '{separator}', ", updateFields);
                var fallback = dialect.BuildCastToText(tableAlias, "update_by");
                selects.Append($",\n    {dialect.BuildCoalesce($"CONCAT({concatFields})", fallback)} AS update_by_display");
            }

            _logger.LogInformation("📝 User Lookup SELECT: hasCreateBy={HasCreateBy}, hasUpdateBy={HasUpdateBy}", hasCreateBy, hasUpdateBy);

            return selects.ToString();
        }


        /// <summary>
        /// Converts JsonElement values to proper .NET types for SQL parameters
        /// </summary>
        /// <param name="value">The value to convert</param>
        /// <returns>Converted value suitable for SQL parameters</returns>
        private object ConvertJsonElementValue(object? value)
        {
            if (value is JsonElement jsonElement)
            {
                return jsonElement.ValueKind switch
                {
                    JsonValueKind.String => jsonElement.GetString() ?? string.Empty,
                    JsonValueKind.Number => jsonElement.TryGetInt32(out int intVal) ? intVal :
                                          jsonElement.TryGetInt64(out long longVal) ? longVal :
                                          jsonElement.TryGetDecimal(out decimal decVal) ? decVal :
                                          jsonElement.GetDouble(),
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Null => DBNull.Value,
                    JsonValueKind.Undefined => DBNull.Value,
                    _ => jsonElement.ToString()
                };
            }

            return value ?? DBNull.Value;
        }

        private object ConvertCrudDataValue(object? value)
        {
            var convertedValue = ConvertJsonElementValue(value);
            return convertedValue is string stringValue ? stringValue.Trim() : convertedValue;
        }

        private static bool IsDefaultValueSentinel(object? value)
        {
            if (value is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.String)
            {
                return string.Equals(jsonElement.GetString()?.Trim(), "DEFAULT", StringComparison.OrdinalIgnoreCase);
            }

            return value is string stringValue &&
                string.Equals(stringValue.Trim(), "DEFAULT", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Get stored procedure parameter names from database for dynamic mapping
        /// </summary>
        private async Task<Dictionary<string, string>> GetSpParameterMappingAsync(DbConnection connection, string schemaName, string procedureName)
        {
            var mapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            var query = _connectionFactory.Dialect.GetSpParameterMappingQuery();

            using var command = _connectionFactory.CreateCommand(query, connection);
            command.Parameters.Add(_connectionFactory.CreateParameter("@SchemaName", schemaName));
            command.Parameters.Add(_connectionFactory.CreateParameter("@ProcedureName", procedureName));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var spParamName = reader.GetString(0); // e.g., "@in_vchTaskStatus"

                // Extract the logical name by removing prefix pattern: @in_xxx, @out_xxx
                // Pattern: @in_vchTaskStatus -> TaskStatus, @in_intProjectId -> ProjectId
                var logicalName = ExtractLogicalParameterName(spParamName);

                if (!string.IsNullOrEmpty(logicalName) && !mapping.ContainsKey(logicalName))
                {
                    mapping[logicalName] = spParamName;
                }
            }

            _logger.LogDebug("📋 Dynamic parameter mapping for [{Schema}].[{Procedure}]: {Count} parameters",
                schemaName, procedureName, mapping.Count);

            return mapping;
        }

        /// <summary>
        /// Extract logical parameter name from SP parameter name
        /// Examples: @in_vchTaskStatus -> TaskStatus, @in_intProjectId -> ProjectId, @out_intRowCount -> RowCount
        /// </summary>
        private string ExtractLogicalParameterName(string spParamName)
        {
            if (string.IsNullOrEmpty(spParamName))
                return null;

            // Remove @ prefix
            var name = spParamName.TrimStart('@');

            // Pattern: prefix_typePrefix_LogicalName
            // Examples: in_vchTaskStatus, out_intRowCount, in_intPage
            // Type prefixes: int, vch, nch, ch, dt, flt, rea, dec, bit, bn, vbn, img, tbl

            // Check for @in_ or @out_ prefix
            string[] directionPrefixes = { "in_", "out_", "v_" };
            foreach (var prefix in directionPrefixes)
            {
                if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    name = name.Substring(prefix.Length);
                    break;
                }
            }

            // Type prefixes to remove (order matters - longer prefixes first)
            string[] typePrefixes = { "vch", "nch", "int", "dec", "flt", "rea", "bit", "vbn", "img", "tbl", "bn", "ch", "dt" };
            foreach (var typePrefix in typePrefixes)
            {
                if (name.StartsWith(typePrefix, StringComparison.OrdinalIgnoreCase) && name.Length > typePrefix.Length)
                {
                    // Check if next char is uppercase (indicates start of logical name)
                    var nextChar = name[typePrefix.Length];
                    if (char.IsUpper(nextChar))
                    {
                        return name.Substring(typePrefix.Length); // Return the logical name
                    }
                }
            }

            // If no type prefix found, return original name (without direction prefix)
            return name;
        }

        /// <summary>
        /// Execute Enhanced Stored Procedure with full CRUD operations
        /// </summary>
        public async Task<EnhancedStoredProcedureResponse> ExecuteEnhancedStoredProcedureAsync(EnhancedStoredProcedureRequest request)
        {
            try
            {
                _logger.LogInformation("Executing Enhanced Stored Procedure: {ProcedureName}.{SchemaName} with operation: {Operation}",
                    request.ProcedureName, request.SchemaName, request.Operation);

                _logger.LogInformation("📊 SERVICE: Request details - Page: {Page}, PageSize: {PageSize}, HasParameters: {HasParams}, HasData: {HasData}",
                    request.Page, request.PageSize, request.Parameters?.Count ?? 0, request.Data != null);

                using var connection = _connectionFactory.CreateConnection();
                await connection.OpenAsync();

                // Get dynamic parameter mapping from SP metadata
                var parameterMapping = await GetSpParameterMappingAsync(connection, request.SchemaName, request.ProcedureName);
                _logger.LogDebug("🔄 Loaded {Count} parameter mappings for {Schema}.{Procedure}",
                    parameterMapping.Count, request.SchemaName, request.ProcedureName);

                using var command = connection.CreateCommand();

                // Build stored procedure call
                var dialect = _connectionFactory.Dialect;
                var fullProcedureName = $"{dialect.QuoteTable(request.SchemaName, request.ProcedureName)}";
                command.CommandText = fullProcedureName;
                command.CommandType = CommandType.StoredProcedure;
                command.CommandTimeout = 120; // 2 minutes timeout

                // Helper function to find SP parameter name
                string FindSpParamName(string logicalName, string fallback)
                {
                    return parameterMapping.TryGetValue(logicalName, out var spName) ? spName : fallback;
                }

                // Add standard parameters - dynamically mapped
                command.Parameters.Add(_connectionFactory.CreateParameter(FindSpParamName("Operation", "@in_vchOperation"), request.Operation ?? "SELECT"));
                command.Parameters.Add(_connectionFactory.CreateParameter(FindSpParamName("Page", "@in_intPage"), request.Page ?? 1));
                command.Parameters.Add(_connectionFactory.CreateParameter(FindSpParamName("PageSize", "@in_intPageSize"), request.PageSize ?? 25));

                // Only add UserId if not already provided in custom parameters
                // Check all possible key formats: UserId, userId, User_Id, in_vchUserId
                bool hasUserIdInParams = request.Parameters?.ContainsKey("UserId") == true ||
                                         request.Parameters?.ContainsKey("userId") == true ||
                                         request.Parameters?.ContainsKey("User_Id") == true ||
                                         request.Parameters?.ContainsKey("in_vchUserId") == true;
                if (!hasUserIdInParams)
                {
                    command.Parameters.Add(_connectionFactory.CreateParameter(FindSpParamName("UserId", "@in_vchUserId"), request.UserId ?? "system"));
                }

                // Add sort model as JSON if SP has SortModel parameter
                if (request.SortModel != null && request.SortModel.Any())
                {
                    var sortParamName = FindSpParamName("SortModel", "@in_vchSortModel");
                    if (parameterMapping.ContainsKey("SortModel") || !parameterMapping.Any())
                    {
                        var sortJson = JsonSerializer.Serialize(request.SortModel);
                        command.Parameters.Add(_connectionFactory.CreateParameter(sortParamName, sortJson));
                    }
                }

                // Add filter model as JSON if SP has FilterModel parameter
                if (request.FilterModel != null)
                {
                    var filterParamName = FindSpParamName("FilterModel", "@in_vchFilterModel");
                    if (parameterMapping.ContainsKey("FilterModel") || !parameterMapping.Any())
                    {
                        var filterJson = JsonSerializer.Serialize(request.FilterModel);
                        command.Parameters.Add(_connectionFactory.CreateParameter(filterParamName, filterJson));
                    }
                }

                // Add custom parameters with dynamic name mapping
                if (request.Parameters != null)
                {
                    foreach (var param in request.Parameters)
                    {
                        // Find SP parameter name from dynamic mapping
                        var spParamName = parameterMapping.TryGetValue(param.Key, out var mappedName)
                            ? mappedName
                            : $"@{param.Key}"; // Fallback to original name if not found

                        // Skip if already added as standard parameter
                        if (command.Parameters.Contains(spParamName))
                        {
                            _logger.LogDebug("Skipping duplicate parameter: {ParamKey} -> {SpParamName}", param.Key, spParamName);
                            continue;
                        }

                        command.Parameters.Add(_connectionFactory.CreateParameter(spParamName, ConvertJsonElementValue(param.Value)));
                        _logger.LogDebug("Added parameter: {ParamKey} -> {SpParamName} (dynamic)", param.Key, spParamName);
                    }
                }

                // Add data as JSON for INSERT/UPDATE operations
                if (request.Data != null)
                {
                    var dataJson = JsonSerializer.Serialize(request.Data);
                    command.Parameters.Add(_connectionFactory.CreateParameter("@Data", dataJson));
                }

                // Add OUTPUT parameters that most Enhanced Stored Procedures expect
                var outputRowCountParam = _connectionFactory.CreateParameter("@out_intRowCount", DBNull.Value);
                outputRowCountParam.DbType = DbType.Int32;
                outputRowCountParam.Direction = ParameterDirection.Output;
                command.Parameters.Add(outputRowCountParam);

                var outputMessageParam = _connectionFactory.CreateParameter("@out_vchMessage", DBNull.Value);
                outputMessageParam.DbType = DbType.String;
                outputMessageParam.Size = 4000;
                outputMessageParam.Direction = ParameterDirection.Output;
                command.Parameters.Add(outputMessageParam);

                var outputErrorCodeParam = _connectionFactory.CreateParameter("@out_intErrorCode", DBNull.Value);
                outputErrorCodeParam.DbType = DbType.Int32;
                outputErrorCodeParam.Direction = ParameterDirection.Output;
                command.Parameters.Add(outputErrorCodeParam);

                // Execute stored procedure
                var stopwatch = Stopwatch.StartNew();
                var results = new List<Dictionary<string, object>>();
                var totalCount = 0;
                var message = "";
                var operation = request.Operation ?? "SELECT";

                using var reader = await command.ExecuteReaderAsync();

                // Read all result sets to find the one with actual data
                var resultSets = new List<List<Dictionary<string, object>>>();
                var resultSetSchemas = new List<List<string>>(); // Store column names for each result set
                var resultSetFieldTypes = new List<Dictionary<string, Type>>(); // 🆕 Store field types for each result set

                do
                {
                    var currentResultSet = new List<Dictionary<string, object>>();

                    // Capture column schema BEFORE reading rows (works even when no rows)
                    var columnNames = new List<string>();
                    var fieldTypes = new Dictionary<string, Type>(); // 🆕 Capture field types from schema
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        var columnName = reader.GetName(i);
                        columnNames.Add(columnName);
                        fieldTypes[columnName] = reader.GetFieldType(i); // 🆕 Get type from schema, not value
                    }
                    resultSetSchemas.Add(columnNames);
                    resultSetFieldTypes.Add(fieldTypes); // 🆕 Store field types

                    while (await reader.ReadAsync())
                    {
                        var row = new Dictionary<string, object>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            var fieldName = reader.GetName(i);
                            var value = reader.GetValue(i);
                            row[fieldName] = value == DBNull.Value ? null : value;
                        }
                        currentResultSet.Add(row);
                    }

                    resultSets.Add(currentResultSet);

                } while (await reader.NextResultAsync());

                _logger.LogInformation("📦 SERVICE: Read {ResultSetCount} result sets from SP", resultSets.Count);

                // Log all result sets with their schema (including empty ones)
                for (int i = 0; i < resultSets.Count; i++)
                {
                    var rs = resultSets[i];
                    var schema = resultSetSchemas[i];
                    _logger.LogInformation("   - Result Set {Index}: {RowCount} rows, {ColumnCount} columns (schema), Columns: [{Columns}]",
                        i, rs.Count, schema.Count, string.Join(", ", schema));
                }

                // Find the result set with more than 4 columns (data, not pagination output)
                // Pagination result sets have only 4 columns: TotalRows, CurrentPage, PageSize, TotalPages
                // Data result sets have many columns (e.g., 21 columns for task data)
                int dataResultSetIndex = -1;
                List<Dictionary<string, object>> dataResultSet = null;
                List<string> dataResultSetSchema = null;
                Dictionary<string, Type> dataResultSetFieldTypes = null; // 🆕 Store field types for data result set

                for (int i = 0; i < resultSetSchemas.Count; i++)
                {
                    var schema = resultSetSchemas[i];
                    // Must have more than 4 columns (not pagination), not single count, not metadata
                    if (schema.Count > 4 &&
                        !schema.Contains("COLUMN_NAME", StringComparer.OrdinalIgnoreCase) &&
                        !schema.Contains("DATA_TYPE", StringComparer.OrdinalIgnoreCase))
                    {
                        dataResultSetIndex = i;
                        dataResultSet = resultSets[i];
                        dataResultSetSchema = schema;
                        dataResultSetFieldTypes = resultSetFieldTypes[i]; // 🆕 Get field types for this result set
                        break;
                    }
                }

                // Store the data schema for metadata generation (even if empty)
                List<string> dataColumnSchema = null;
                Dictionary<string, Type> dataColumnFieldTypes = null; // 🆕 Store field types for metadata generation

                if (dataResultSetIndex >= 0)
                {
                    results = dataResultSet;
                    dataColumnSchema = dataResultSetSchema; // Store schema for metadata generation
                    dataColumnFieldTypes = dataResultSetFieldTypes; // 🆕 Store field types for metadata generation
                    _logger.LogInformation("✅ SERVICE: Selected DATA result set #{Index} with {ColumnCount} columns and {RowCount} rows",
                        dataResultSetIndex, dataResultSetSchema.Count, results.Count);

                    // If data is empty, log it but DON'T add placeholder row - keep data empty, use schema for metadata
                    if (results.Count == 0 && dataResultSetSchema.Count > 0)
                    {
                        _logger.LogInformation("📋 SERVICE: Data result set is empty but has {ColumnCount} columns in schema. Will use schema for metadata.",
                            dataResultSetSchema.Count);
                    }
                }
                else
                {
                    _logger.LogWarning("⚠️ SERVICE: NO DATA RESULT SET found from SP! Available result sets: {ResultSetInfo}",
                        string.Join(", ", resultSetSchemas.Select((schema, i) => $"Set{i}:{resultSets[i].Count}rows,{schema.Count}cols[{string.Join(",", schema.Take(3))}...]")));
                }

                // Try to find total count from any single-value result set
                foreach (var rs in resultSets.Where(rs => rs.Any() && rs.First().Keys.Count == 1))
                {
                    var firstRow = rs.First();
                    var key = firstRow.Keys.First();
                    if (key.ToLower().Contains("count") || key.ToLower().Contains("total"))
                    {
                        totalCount = Convert.ToInt32(firstRow[key]);
                        break;
                    }
                }

                // Close reader to access output parameters
                reader.Close();

                // Get output parameters
                var outputErrorCode = 0;
                if (outputRowCountParam.Value != DBNull.Value)
                {
                    totalCount = (int)outputRowCountParam.Value;
                }

                if (outputMessageParam.Value != DBNull.Value)
                {
                    message = outputMessageParam.Value.ToString() ?? "Success";
                }

                if (outputErrorCodeParam.Value != DBNull.Value)
                {
                    outputErrorCode = (int)outputErrorCodeParam.Value;
                    _logger.LogInformation("📤 OUTPUT PARAMETER: @out_intErrorCode = {ErrorCode}", outputErrorCode);
                }

                // Determine success based on ErrorCode
                var isSuccess = outputErrorCode == 0;

                // If no explicit total count, use result count
                if (totalCount == 0)
                {
                    totalCount = results.Count;
                }

                stopwatch.Stop();

                _logger.LogInformation("Enhanced Stored Procedure executed successfully in {ElapsedMs}ms. Returned {RowCount} rows",
                    stopwatch.ElapsedMilliseconds, results.Count);

                // 🔍 DEBUG: Enhanced metadata detection from SP result sets
                DynamicTableMetadata? metadata = null;

                _logger.LogInformation("🔍 ENHANCED METADATA DETECTION - Starting for Enhanced SP: {ProcedureName}", request.ProcedureName);

                // Look for metadata in Result Set 0 (columns with COLUMN_NAME, DATA_TYPE, etc.)
                var metadataResultSet = resultSets.FirstOrDefault(rs =>
                    rs.Any() && rs.First().Keys.Contains("COLUMN_NAME", StringComparer.OrdinalIgnoreCase));

                if (metadataResultSet != null)
                {
                    _logger.LogInformation("� METADATA RESULT SET FOUND: {RowCount} columns defined", metadataResultSet.Count);
                    var columns = new List<DynamicColumnInfo>();
                    var detectedPrimaryKeys = new List<string>();

                    foreach (var metaRow in metadataResultSet)
                    {
                        var columnName = metaRow.GetValueOrDefault("COLUMN_NAME")?.ToString() ?? "";
                        var dataType = metaRow.GetValueOrDefault("DATA_TYPE")?.ToString() ?? "nvarchar";
                        var isNullableStr = metaRow.GetValueOrDefault("IS_NULLABLE")?.ToString() ?? "YES";
                        var isPrimaryKeyObj = metaRow.GetValueOrDefault("IS_PRIMARY_KEY");
                        var isIdentityObj = metaRow.GetValueOrDefault("IS_IDENTITY");
                        var maxLengthObj = metaRow.GetValueOrDefault("CHARACTER_MAXIMUM_LENGTH");
                        var columnDefaultObj = metaRow.GetValueOrDefault("COLUMN_DEFAULT");
                        var ordinalPositionObj = metaRow.GetValueOrDefault("ORDINAL_POSITION");

                        // Parse nullable
                        bool isNullable = isNullableStr.Equals("YES", StringComparison.OrdinalIgnoreCase);

                        // Parse primary key
                        bool isPrimaryKey = false;
                        if (isPrimaryKeyObj != null)
                        {
                            if (isPrimaryKeyObj is bool boolVal)
                                isPrimaryKey = boolVal;
                            else if (int.TryParse(isPrimaryKeyObj.ToString(), out int intVal))
                                isPrimaryKey = intVal == 1;
                            else if (isPrimaryKeyObj.ToString().Equals("1", StringComparison.OrdinalIgnoreCase) ||
                                     isPrimaryKeyObj.ToString().Equals("true", StringComparison.OrdinalIgnoreCase))
                                isPrimaryKey = true;
                        }

                        // Parse identity
                        bool isIdentity = false;
                        if (isIdentityObj != null)
                        {
                            if (isIdentityObj is bool boolVal)
                                isIdentity = boolVal;
                            else if (int.TryParse(isIdentityObj.ToString(), out int intVal))
                                isIdentity = intVal == 1;
                            else if (isIdentityObj.ToString().Equals("1", StringComparison.OrdinalIgnoreCase) ||
                                     isIdentityObj.ToString().Equals("true", StringComparison.OrdinalIgnoreCase))
                                isIdentity = true;
                        }

                        // Parse max length
                        int? maxLength = null;
                        if (maxLengthObj != null && int.TryParse(maxLengthObj.ToString(), out int maxLenVal))
                            maxLength = maxLenVal;

                        // Parse ordinal position
                        int ordinalPosition = 0;
                        if (ordinalPositionObj != null && int.TryParse(ordinalPositionObj.ToString(), out int ordVal))
                            ordinalPosition = ordVal;

                        var columnInfo = new DynamicColumnInfo
                        {
                            ColumnName = columnName,
                            DataType = dataType,
                            IsNullable = isNullable,
                            IsPrimaryKey = isPrimaryKey,
                            IsIdentity = isIdentity,
                            MaxLength = maxLength,
                            DefaultValue = columnDefaultObj?.ToString(),
                            OrdinalPosition = ordinalPosition
                        };

                        columns.Add(columnInfo);

                        if (isPrimaryKey)
                        {
                            detectedPrimaryKeys.Add(columnName);
                            _logger.LogInformation("🔑 PRIMARY KEY DETECTED FROM METADATA: {ColumnName}", columnName);
                        }

                        _logger.LogDebug("📋 Column from metadata: {ColumnName} ({DataType}) - PK: {IsPK}, Identity: {IsIdentity}, Nullable: {IsNullable}",
                            columnName, dataType, isPrimaryKey, isIdentity, isNullable);
                    }

                    metadata = new DynamicTableMetadata
                    {
                        TableName = request.ProcedureName,
                        SchemaName = request.SchemaName,
                        TableType = DynamicTableType.StoredProcedure,
                        Columns = columns.OrderBy(c => c.OrdinalPosition).ToList(),
                        PrimaryKeys = detectedPrimaryKeys,
                        TotalRows = results.Count,
                        FetchedAt = DateTime.UtcNow
                    };

                    _logger.LogInformation("✅ ENHANCED METADATA CREATED from SP metadata: {TableName}.{SchemaName} with {ColumnCount} columns, Primary Keys: [{PrimaryKeys}]",
                        metadata.TableName, metadata.SchemaName, metadata.Columns.Count, string.Join(", ", metadata.PrimaryKeys));
                }
                else if (results.Any())
                {
                    // Fallback: Detect metadata from data result set (old method)
                    _logger.LogInformation("⚠️ No metadata result set found, falling back to data-based detection");

                    var firstRow = results.First();
                    var columns = new List<DynamicColumnInfo>();
                    var detectedPrimaryKeys = new List<string>();

                    // Build column metadata from result set
                    foreach (var kvp in firstRow)
                    {
                        var columnName = kvp.Key;
                        var value = kvp.Value;

                        // 🆕 FIXED: Use field type from schema instead of value.GetType()
                        // This correctly handles NULL values with proper schema type
                        string dataType = "nvarchar";

                        // Try to get type from captured field types first (most accurate)
                        if (dataColumnFieldTypes != null && dataColumnFieldTypes.TryGetValue(columnName, out var schemaType))
                        {
                            dataType = schemaType.Name switch
                            {
                                "Int32" => "int",
                                "Int64" => "bigint",
                                "Decimal" => "decimal",
                                "Double" => "float",
                                "Boolean" => "bit",
                                "DateTime" => "datetime",
                                "String" => "nvarchar",
                                _ => "nvarchar"
                            };
                            _logger.LogDebug("📋 Column type from SCHEMA: {ColumnName} ({SchemaType}) -> {DataType}", columnName, schemaType.Name, dataType);
                        }
                        else if (value != null)
                        {
                            // Fallback to value-based detection (legacy behavior)
                            var type = value.GetType();
                            dataType = type.Name switch
                            {
                                "Int32" => "int",
                                "Int64" => "bigint",
                                "Decimal" => "decimal",
                                "Double" => "float",
                                "Boolean" => "bit",
                                "DateTime" => "datetime",
                                "String" => "nvarchar",
                                _ => "nvarchar"
                            };
                            _logger.LogDebug("📋 Column type from VALUE: {ColumnName} ({ValueType}) -> {DataType}", columnName, type.Name, dataType);
                        }
                        else
                        {
                            _logger.LogDebug("📋 Column type defaulted to nvarchar: {ColumnName} (NULL value, no schema)", columnName);
                        }

                        var columnInfo = new DynamicColumnInfo
                        {
                            ColumnName = columnName,
                            DataType = dataType,
                            IsNullable = true,
                            IsPrimaryKey = false,
                            IsIdentity = false
                        };

                        columns.Add(columnInfo);
                    }
                    // 🔑 Detect primary key from column names (fallback method)
                    var primaryKeyPatterns = new[]
                    {
                        "id", "ID", "Id",
                        "_id", "_ID", "_Id",
                        "part_id", "PartId", "PartID",
                        "customer_id", "CustomerId", "CustomerID"
                    };

                    foreach (var pattern in primaryKeyPatterns)
                    {
                        var matchedColumn = columns.FirstOrDefault(c =>
                            c.ColumnName.Equals(pattern, StringComparison.OrdinalIgnoreCase) ||
                            c.ColumnName.EndsWith(pattern, StringComparison.OrdinalIgnoreCase));

                        if (matchedColumn != null)
                        {
                            matchedColumn.IsPrimaryKey = true;
                            detectedPrimaryKeys.Add(matchedColumn.ColumnName);
                            _logger.LogInformation("🔑 PRIMARY KEY DETECTED from pattern: {ColumnName} (pattern: {Pattern})",
                                matchedColumn.ColumnName, pattern);
                            break; // Use first match
                        }
                    }

                    if (!detectedPrimaryKeys.Any())
                    {
                        _logger.LogWarning("⚠️ NO PRIMARY KEY DETECTED in Enhanced SP result. Available columns: {Columns}",
                            string.Join(", ", columns.Select(c => c.ColumnName)));
                    }

                    metadata = new DynamicTableMetadata
                    {
                        TableName = request.ProcedureName,
                        SchemaName = request.SchemaName,
                        TableType = DynamicTableType.StoredProcedure,
                        Columns = columns,
                        PrimaryKeys = detectedPrimaryKeys,
                        TotalRows = results.Count,
                        FetchedAt = DateTime.UtcNow
                    };

                    _logger.LogInformation("✅ FALLBACK METADATA CREATED: {TableName}.{SchemaName} with {ColumnCount} columns, Primary Keys: [{PrimaryKeys}]",
                        metadata.TableName, metadata.SchemaName, metadata.Columns.Count, string.Join(", ", metadata.PrimaryKeys));
                }
                else if (dataColumnSchema != null && dataColumnSchema.Count > 0)
                {
                    // 🆕 NEW: Use captured column schema when data is empty
                    _logger.LogInformation("📋 No data returned, using captured column schema ({ColumnCount} columns) for metadata", dataColumnSchema.Count);

                    var columns = new List<DynamicColumnInfo>();
                    var detectedPrimaryKeys = new List<string>();

                    foreach (var columnName in dataColumnSchema)
                    {
                        // 🆕 FIXED: Use field type from schema instead of defaulting to nvarchar
                        string dataType = "nvarchar";
                        if (dataColumnFieldTypes != null && dataColumnFieldTypes.TryGetValue(columnName, out var schemaType))
                        {
                            dataType = schemaType.Name switch
                            {
                                "Int32" => "int",
                                "Int64" => "bigint",
                                "Decimal" => "decimal",
                                "Double" => "float",
                                "Boolean" => "bit",
                                "DateTime" => "datetime",
                                "String" => "nvarchar",
                                _ => "nvarchar"
                            };
                            _logger.LogDebug("📋 Empty result column type from SCHEMA: {ColumnName} ({SchemaType}) -> {DataType}", columnName, schemaType.Name, dataType);
                        }

                        var columnInfo = new DynamicColumnInfo
                        {
                            ColumnName = columnName,
                            DataType = dataType, // 🆕 Use schema type instead of hardcoded nvarchar
                            IsNullable = true,
                            IsPrimaryKey = false,
                            IsIdentity = false
                        };

                        columns.Add(columnInfo);
                    }

                    // 🔑 Detect primary key from column names
                    var primaryKeyPatterns = new[] { "_id", "Id", "ID" };
                    foreach (var pattern in primaryKeyPatterns)
                    {
                        var matchedColumn = columns.FirstOrDefault(c =>
                            c.ColumnName.EndsWith(pattern, StringComparison.OrdinalIgnoreCase));

                        if (matchedColumn != null)
                        {
                            matchedColumn.IsPrimaryKey = true;
                            detectedPrimaryKeys.Add(matchedColumn.ColumnName);
                            _logger.LogInformation("🔑 PRIMARY KEY DETECTED from schema: {ColumnName}", matchedColumn.ColumnName);
                            break;
                        }
                    }

                    metadata = new DynamicTableMetadata
                    {
                        TableName = request.ProcedureName,
                        SchemaName = request.SchemaName,
                        TableType = DynamicTableType.StoredProcedure,
                        Columns = columns,
                        PrimaryKeys = detectedPrimaryKeys,
                        TotalRows = 0, // No data
                        FetchedAt = DateTime.UtcNow
                    };

                    _logger.LogInformation("✅ SCHEMA-BASED METADATA CREATED: {TableName}.{SchemaName} with {ColumnCount} columns, Primary Keys: [{PrimaryKeys}]",
                        metadata.TableName, metadata.SchemaName, metadata.Columns.Count, string.Join(", ", metadata.PrimaryKeys));
                }
                else
                {
                    _logger.LogWarning("⚠️ NO DATA returned from Enhanced SP - cannot detect metadata");
                }

                _logger.LogInformation("🎁 RESPONSE SUMMARY: Success={Success}, ErrorCode={ErrorCode}, RowCount={RowCount}, HasMetadata={HasMetadata}, MetadataColumns={MetadataColumnCount}",
                    isSuccess, outputErrorCode, totalCount > 0 ? totalCount : results.Count, metadata != null, metadata?.Columns.Count ?? 0);

                return new EnhancedStoredProcedureResponse
                {
                    Success = isSuccess,
                    Data = results,
                    RowCount = totalCount > 0 ? totalCount : results.Count,
                    Message = message,
                    Operation = operation,
                    ExecutionTime = stopwatch.ElapsedMilliseconds,
                    Metadata = metadata // 🎯 ส่ง metadata กลับไปให้ frontend
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing enhanced stored procedure: {ProcedureName}", request.ProcedureName);

                return new EnhancedStoredProcedureResponse
                {
                    Success = false,
                    Data = new List<Dictionary<string, object>>(),
                    RowCount = 0,
                    Message = ex.Message,
                    Operation = request.Operation ?? "SELECT",
                    ExecutionTime = 0
                };
            }
        }

        #endregion
    }
}
