using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ApiCore.Data;
using ApiCore.Models.Base;
using ApiCore.Models.Dynamic;
using ApiCore.Services.Interfaces;
using System.Data;
using System.Text;
using System.Text.Json;
using System.Diagnostics;
using System.Security;

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

            var query = @"
                SELECT 
                    c.COLUMN_NAME,
                    c.DATA_TYPE,
                    c.IS_NULLABLE,
                    c.CHARACTER_MAXIMUM_LENGTH,
                    c.NUMERIC_PRECISION,
                    c.NUMERIC_SCALE,
                    c.COLUMN_DEFAULT,
                    CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IS_PRIMARY_KEY,
                    COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS IS_IDENTITY
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN (
                    SELECT ku.TABLE_NAME, ku.COLUMN_NAME, ku.TABLE_SCHEMA
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                        AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
                    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                ) pk ON c.TABLE_NAME = pk.TABLE_NAME 
                    AND c.COLUMN_NAME = pk.COLUMN_NAME
                    AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
                WHERE c.TABLE_NAME = @TableName 
                    AND c.TABLE_SCHEMA = @SchemaName
                ORDER BY c.ORDINAL_POSITION";

            using var connection = _connectionFactory.CreateConnection(DatabaseType.Main);
            await connection.OpenAsync();

            var columns = new List<DynamicColumnInfo>();
            var primaryKeys = new List<string>();

            // Get column metadata
            using (var command = new SqlCommand(query, connection))
            {
                command.Parameters.Add(new SqlParameter("@TableName", tableName));
                command.Parameters.Add(new SqlParameter("@SchemaName", schemaName));

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
                        DefaultValue = reader.IsDBNull("COLUMN_DEFAULT") ? null : reader.GetString("COLUMN_DEFAULT")
                    };

                    columns.Add(columnInfo);

                    if (columnInfo.IsPrimaryKey)
                    {
                        primaryKeys.Add(columnInfo.ColumnName);
                    }
                }
            } // Reader is disposed here

            // Get row count with a new command after reader is closed
            var countQuery = $"SELECT COUNT(*) FROM [{schemaName}].[{tableName}]";
            using var countCommand = new SqlCommand(countQuery, connection);
            var totalRows = (int)await countCommand.ExecuteScalarAsync();

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

            var query = @"
                -- Tables
                SELECT 
                    t.TABLE_NAME,
                    t.TABLE_SCHEMA,
                    'Table' as TABLE_TYPE,
                    ISNULL(p.rows, 0) as ROW_COUNT,
                    o.create_date,
                    o.modify_date
                FROM INFORMATION_SCHEMA.TABLES t
                LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME AND st.schema_id = SCHEMA_ID(t.TABLE_SCHEMA)
                LEFT JOIN sys.partitions p ON st.object_id = p.object_id AND p.index_id IN (0,1)
                LEFT JOIN sys.objects o ON st.object_id = o.object_id
                WHERE t.TABLE_TYPE = 'BASE TABLE'
                    AND t.TABLE_SCHEMA LIKE @SchemaPattern
                    AND t.TABLE_NAME LIKE @SearchPattern
                    AND t.TABLE_SCHEMA IN ('dbo', 'app', 'data')
                    AND t.TABLE_NAME NOT IN ('sysdiagrams', '__EFMigrationsHistory')

                UNION ALL

                -- Views
                SELECT 
                    v.TABLE_NAME,
                    v.TABLE_SCHEMA,
                    'View' as TABLE_TYPE,
                    0 as ROW_COUNT,
                    o.create_date,
                    o.modify_date
                FROM INFORMATION_SCHEMA.VIEWS v
                LEFT JOIN sys.views sv ON sv.name = v.TABLE_NAME AND sv.schema_id = SCHEMA_ID(v.TABLE_SCHEMA)
                LEFT JOIN sys.objects o ON sv.object_id = o.object_id
                WHERE v.TABLE_SCHEMA LIKE @SchemaPattern
                    AND v.TABLE_NAME LIKE @SearchPattern
                    AND v.TABLE_SCHEMA IN ('dbo', 'app', 'data')

                ORDER BY TABLE_SCHEMA, TABLE_NAME";

            using var connection = _connectionFactory.CreateConnection();
            await connection.OpenAsync();

            var tables = new List<DynamicTableInfo>();
            var views = new List<DynamicTableInfo>();

            // Get tables and views first
            using (var command = new SqlCommand(query, connection))
            {
                command.Parameters.Add(new SqlParameter("@SchemaPattern", schemaPattern));
                command.Parameters.Add(new SqlParameter("@SearchPattern", searchPattern));

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
            var spQuery = @"
                SELECT 
                    p.name AS PROCEDURE_NAME,
                    s.name AS SCHEMA_NAME,
                    p.create_date,
                    p.modify_date
                FROM sys.procedures p
                INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
                WHERE s.name LIKE @SchemaPattern
                    AND p.name LIKE @SearchPattern
                    AND s.name IN ('dbo', 'app', 'data')
                ORDER BY s.name, p.name";

            using (var spCommand = new SqlCommand(spQuery, connection))
            {
                spCommand.Parameters.Add(new SqlParameter("@SchemaPattern", schemaPattern));
                spCommand.Parameters.Add(new SqlParameter("@SearchPattern", searchPattern));

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
                var selectColumns = request.SelectColumns?.Any() == true
                    ? string.Join(", ", request.SelectColumns.Select(c => $"t.[{c}]"))  // Add table alias to prevent ambiguous columns
                    : "*";

                // Build WHERE clause
                var whereClause = BuildDynamicWhereClause(request, metadata);

                // Debug logging for WHERE clause
                _logger.LogInformation("🏗️ Generated WHERE clause: {WhereClause}", whereClause);

                // Build ORDER BY clause
                var orderByClause = BuildDynamicOrderByClause(request.SortModel, metadata);
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
                        .Select(c => $"t.[{c.ColumnName}]")
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

                // Build final query
                var query = $@"
                    DECLARE @TotalCount INT;
                    
                    SELECT @TotalCount = COUNT(*)
                    FROM [{request.SchemaName ?? "dbo"}].[{request.TableName}] t
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")};
                    
                    SELECT @TotalCount as TotalCount;
                    
                    SELECT {fullSelectColumns}
                    FROM [{request.SchemaName ?? "dbo"}].[{request.TableName}] t
                    {userLookupJoin}
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                    {orderByClause}
                    OFFSET @Offset ROWS
                    FETCH NEXT @PageSize ROWS ONLY;";

                _logger.LogInformation("🔍 Generated SQL Query: {Query}", query);

                using var connection = _connectionFactory.CreateConnection();
                using var command = new SqlCommand(query, connection);

                // Add parameters
                command.Parameters.Add(new SqlParameter("@Offset", offset));
                command.Parameters.Add(new SqlParameter("@PageSize", pageSize));

                // Add filter parameters
                AddFilterParameters(command, request, metadata);

                await connection.OpenAsync();
                using var reader = await command.ExecuteReaderAsync();

                var response = new DynamicDataGridResponse();

                // Read total count
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
                    var rows = new List<DynamicResponse>();

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
            var parameters = new List<SqlParameter>();

            foreach (var pk in metadata.PrimaryKeys)
            {
                if (!primaryKeyValues.ContainsKey(pk))
                {
                    throw new ArgumentException($"Primary key value for '{pk}' is required");
                }

                whereConditions.Add($"[{pk}] = @{pk}");
                var convertedValue = ConvertJsonElementValue(primaryKeyValues[pk]);
                parameters.Add(new SqlParameter($"@{pk}", convertedValue));
            }

            var query = $@"
                SELECT *
                FROM [{schemaName}].[{tableName}]
                WHERE {string.Join(" AND ", whereConditions)}";

            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            using var command = new SqlCommand(query, connection);
            command.Parameters.AddRange(parameters.ToArray());

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

            // Filter out identity columns and timestamp columns from insert data
            var insertData = request.Data
                .Where(kvp => !metadata.Columns.Any(c => c.ColumnName == kvp.Key &&
                    (c.IsIdentity ||
                     c.DataType.ToLower() == "timestamp" ||
                     c.DataType.ToLower() == "rowversion")))
                .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

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

            var columns = string.Join(", ", insertData.Keys.Select(k => $"[{k}]"));
            var values = string.Join(", ", insertData.Keys.Select(k => $"@{k}"));

            var query = $@"
                INSERT INTO [{request.SchemaName ?? "dbo"}].[{request.TableName}] ({columns})
                OUTPUT INSERTED.*
                VALUES ({values})";

            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            using var command = new SqlCommand(query, connection);

            foreach (var kvp in insertData)
            {
                var convertedValue = ConvertJsonElementValue(kvp.Value);
                command.Parameters.Add(new SqlParameter($"@{kvp.Key}", convertedValue));
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

            var setClause = string.Join(", ", updateData.Keys.Select(k => $"[{k}] = @{k}"));
            var whereClause = string.Join(" AND ", request.WhereConditions.Keys.Select(k => $"[{k}] = @Where_{k}"));

            var query = $@"
                UPDATE [{request.SchemaName ?? "dbo"}].[{request.TableName}]
                SET {setClause}
                OUTPUT INSERTED.*
                WHERE {whereClause}";

            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            using var command = new SqlCommand(query, connection);

            // Add SET parameters
            foreach (var kvp in updateData)
            {
                var convertedValue = ConvertJsonElementValue(kvp.Value);
                command.Parameters.Add(new SqlParameter($"@{kvp.Key}", convertedValue));
            }

            // Add WHERE parameters
            foreach (var kvp in request.WhereConditions)
            {
                var convertedValue = ConvertJsonElementValue(kvp.Value);
                command.Parameters.Add(new SqlParameter($"@Where_{kvp.Key}", convertedValue));
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

            var whereClause = string.Join(" AND ", request.WhereConditions.Keys.Select(k => $"[{k}] = @{k}"));

            var query = $@"
                DELETE FROM [{request.SchemaName ?? "dbo"}].[{request.TableName}]
                WHERE {whereClause}";

            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            using var command = new SqlCommand(query, connection);

            foreach (var kvp in request.WhereConditions)
            {
                var convertedValue = ConvertJsonElementValue(kvp.Value);
                command.Parameters.Add(new SqlParameter($"@{kvp.Key}", convertedValue));
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
                using var connection = new SqlConnection(_context.Database.GetConnectionString());
                using var command = new SqlCommand($"[{schemaName}].[{procedureName}]", connection);
                command.CommandType = CommandType.StoredProcedure;

                if (parameters != null)
                {
                    foreach (var kvp in parameters)
                    {
                        var convertedValue = ConvertJsonElementValue(kvp.Value);
                        command.Parameters.Add(new SqlParameter($"@{kvp.Key}", convertedValue));
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

            var query = @"
                SELECT 
                    p.name AS PROCEDURE_NAME,
                    s.name AS SCHEMA_NAME,
                    p.create_date,
                    p.modify_date,
                    pr.name AS PARAMETER_NAME,
                    t.name AS DATA_TYPE,
                    pr.is_output,
                    pr.has_default_value,
                    pr.default_value,
                    pr.max_length
                FROM sys.procedures p
                INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
                LEFT JOIN sys.parameters pr ON p.object_id = pr.object_id
                LEFT JOIN sys.types t ON pr.user_type_id = t.user_type_id
                WHERE p.name = @ProcedureName 
                    AND s.name = @SchemaName
                ORDER BY pr.parameter_id";

            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            using var command = new SqlCommand(query, connection);
            command.Parameters.Add(new SqlParameter("@ProcedureName", procedureName));
            command.Parameters.Add(new SqlParameter("@SchemaName", schemaName));

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
            var query = @"
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = @TableName 
                    AND TABLE_SCHEMA = @SchemaName";

            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            using var command = new SqlCommand(query, connection);
            command.Parameters.Add(new SqlParameter("@TableName", tableName));
            command.Parameters.Add(new SqlParameter("@SchemaName", schemaName));

            await connection.OpenAsync();
            var count = (int)await command.ExecuteScalarAsync();

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
                using var connection = new SqlConnection(_context.Database.GetConnectionString());
                using var command = new SqlCommand(sqlQuery, connection);

                if (parameters != null)
                {
                    foreach (var kvp in parameters)
                    {
                        var convertedValue = ConvertJsonElementValue(kvp.Value);
                        command.Parameters.Add(new SqlParameter($"@{kvp.Key}", convertedValue));
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

            // Custom WHERE clause (from BSDataGrid ObjWh or ComboBox ObjWh)
            if (!string.IsNullOrEmpty(request.CustomWhere))
            {
                conditions.Add($"({request.CustomWhere})");
                _logger.LogInformation("🎯 Added CustomWhere condition: {CustomWhere}", request.CustomWhere);
            }

            // Column filters (null-safe check)
            if (request.FilterModel?.Items != null)
            {
                foreach (var filter in request.FilterModel.Items)
                {
                    var column = metadata.Columns.FirstOrDefault(c => c.ColumnName.Equals(filter.Field, StringComparison.OrdinalIgnoreCase));
                    if (column == null) continue;

                    // Use table alias 't.' to avoid ambiguous column name when using JOINs
                    var condition = filter.Operator.ToLower() switch
                    {
                        "contains" => $"t.[{filter.Field}] LIKE @{filter.Field}_Filter",
                        "equals" => $"t.[{filter.Field}] = @{filter.Field}_Filter",
                        "startswith" => $"t.[{filter.Field}] LIKE @{filter.Field}_Filter",
                        "endswith" => $"t.[{filter.Field}] LIKE @{filter.Field}_Filter",
                        "isempty" => $"(t.[{filter.Field}] IS NULL OR t.[{filter.Field}] = '')",
                        "isnotempty" => $"(t.[{filter.Field}] IS NOT NULL AND t.[{filter.Field}] != '')",
                        ">" => $"t.[{filter.Field}] > @{filter.Field}_Filter",
                        ">=" => $"t.[{filter.Field}] >= @{filter.Field}_Filter",
                        "<" => $"t.[{filter.Field}] < @{filter.Field}_Filter",
                        "<=" => $"t.[{filter.Field}] <= @{filter.Field}_Filter",
                        "!=" => $"t.[{filter.Field}] != @{filter.Field}_Filter",
                        _ => $"t.[{filter.Field}] LIKE @{filter.Field}_Filter"
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
                    quickFilterConditions.Add($"CAST(t.[{column.ColumnName}] AS NVARCHAR(MAX)) LIKE @QuickFilter");
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

        private void AddFilterParameters(SqlCommand command, DynamicDataGridRequest request, DynamicTableMetadata metadata)
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
                command.Parameters.Add(new SqlParameter($"@{filter.Field}_Filter", convertedValue));
            }

            // Quick filter parameter - รองรับทั้ง QuickFilterValues และ QuickFilter
            var quickFilterValue = !string.IsNullOrEmpty(request.FilterModel?.QuickFilter)
                ? request.FilterModel.QuickFilter
                : !string.IsNullOrEmpty(request.FilterModel?.QuickFilterValues)
                ? request.FilterModel.QuickFilterValues
                : request.QuickFilter;

            if (!string.IsNullOrEmpty(quickFilterValue))
            {
                command.Parameters.Add(new SqlParameter("@QuickFilter", $"%{quickFilterValue}%"));
                _logger.LogInformation("🔍 Quick Filter Parameter Added: @QuickFilter = '%{QuickFilterParam}'", $"%{quickFilterValue}%");
            }
        }

        private string BuildDynamicOrderByClause(List<DataGridSortModel> sortModel, DynamicTableMetadata metadata, string customOrderBy = null)
        {
            // Priority 1: Custom ORDER BY (from BSDataGrid ObjBy or ComboBox ObjBy)
            if (!string.IsNullOrEmpty(customOrderBy))
            {
                _logger.LogInformation("🏗️ No sorting specified, using default.");
                // Default sort by first primary key or first column
                var defaultColumn = metadata.PrimaryKeys.FirstOrDefault() ?? metadata.Columns.FirstOrDefault()?.ColumnName;
                return defaultColumn != null ? $"ORDER BY [{defaultColumn}] ASC" : "ORDER BY 1 ASC";
            }

            // var orderItems = sortModel
            //     .Where(sort => metadata.Columns.Any(c => c.ColumnName.Equals(sort.Field, StringComparison.OrdinalIgnoreCase)))
            //     .Select(sort => $"[{sort.Field}] {(sort.Sort.ToUpper() == "DESC" ? "DESC" : "ASC")}");

            // return orderItems.Any() ? $"ORDER BY {string.Join(", ", orderItems)}" : "ORDER BY 1 ASC";

            var orderByClauses = new List<string>();
            foreach (var sort in sortModel)
            {
                _logger.LogInformation("🏗️ Processing sort: {SortField} {SortDirection}", sort.Field, sort.Sort);
                // Validate field name against metadata
                var column = metadata.Columns.FirstOrDefault(c => c.ColumnName.Equals(sort.Field, StringComparison.OrdinalIgnoreCase));
                if (column != null)
                {
                    var direction = sort.Sort?.ToUpper() == "DESC" ? "DESC" : "ASC";
                    orderByClauses.Add($"[{sort.Field}] {direction}");
                    _logger.LogInformation("✅ Added ORDER BY clause: [{SortField}] {SortDirection}", sort.Field, direction);
                }
            }
            //return string.Join(", ", orderByClauses);
            return orderByClauses.Any() ? $"ORDER BY {string.Join(", ", orderByClauses)}" : "ORDER BY 1 ASC";
        }


        private bool IsSearchableColumn(DynamicColumnInfo column)
        {
            var searchableTypes = new[] { "varchar", "nvarchar", "char", "nchar", "text", "ntext" };
            return searchableTypes.Contains(column.DataType.ToLower());
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

            // JOIN for create_by (only if column exists)
            if (hasCreateBy)
            {
                joins.AppendLine($@"
                LEFT JOIN [{userSchema}].[{userTable}] AS creator 
                    ON {tableAlias}.[create_by] = creator.[{userIdField}]");
            }

            // JOIN for update_by (only if column exists)
            if (hasUpdateBy)
            {
                joins.AppendLine($@"
                LEFT JOIN [{userSchema}].[{userTable}] AS updater 
                    ON {tableAlias}.[update_by] = updater.[{userIdField}]");
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

            // Concatenate display fields for create_by (only if column exists)
            // Use COALESCE to fallback to user_id if JOIN returns NULL
            if (hasCreateBy)
            {
                var displayFields = userLookup.DisplayFields.Select(f => $"creator.[{f}]");
                var concatFields = string.Join($", '{separator}', ", displayFields);
                selects.Append($",\n    COALESCE(CONCAT({concatFields}), CAST({tableAlias}.[create_by] AS NVARCHAR(50))) AS create_by_display");
            }

            // Concatenate display fields for update_by (only if column exists)
            // Use COALESCE to fallback to user_id if JOIN returns NULL
            if (hasUpdateBy)
            {
                var updateFields = userLookup.DisplayFields.Select(f => $"updater.[{f}]");
                var concatFields = string.Join($", '{separator}', ", updateFields);
                selects.Append($",\n    COALESCE(CONCAT({concatFields}), CAST({tableAlias}.[update_by] AS NVARCHAR(50))) AS update_by_display");
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
                using var command = connection.CreateCommand();

                // Build stored procedure call
                var fullProcedureName = $"[{request.SchemaName}].[{request.ProcedureName}]";
                command.CommandText = fullProcedureName;
                command.CommandType = CommandType.StoredProcedure;
                command.CommandTimeout = 120; // 2 minutes timeout

                // Add standard parameters
                command.Parameters.Add(new SqlParameter("@Operation", request.Operation ?? "SELECT"));
                command.Parameters.Add(new SqlParameter("@Page", request.Page ?? 1));
                command.Parameters.Add(new SqlParameter("@PageSize", request.PageSize ?? 25));
                command.Parameters.Add(new SqlParameter("@UserId", request.UserId ?? "system"));

                // Add sort model as JSON
                if (request.SortModel != null && request.SortModel.Any())
                {
                    var sortJson = JsonSerializer.Serialize(request.SortModel);
                    command.Parameters.Add(new SqlParameter("@SortModel", sortJson));
                }

                // Add filter model as JSON
                if (request.FilterModel != null)
                {
                    var filterJson = JsonSerializer.Serialize(request.FilterModel);
                    command.Parameters.Add(new SqlParameter("@FilterModel", filterJson));
                }

                // Add custom parameters
                if (request.Parameters != null)
                {
                    foreach (var param in request.Parameters)
                    {
                        command.Parameters.Add(new SqlParameter($"@{param.Key}", ConvertJsonElementValue(param.Value)));
                    }
                }

                // Add data as JSON for INSERT/UPDATE operations
                if (request.Data != null)
                {
                    var dataJson = JsonSerializer.Serialize(request.Data);
                    command.Parameters.Add(new SqlParameter("@Data", dataJson));
                }

                // Add OUTPUT parameters that most Enhanced Stored Procedures expect
                var outputRowCountParam = new SqlParameter("@OutputRowCount", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
                command.Parameters.Add(outputRowCountParam);

                var outputMessageParam = new SqlParameter("@OutputMessage", SqlDbType.NVarChar, 4000)
                {
                    Direction = ParameterDirection.Output
                };
                command.Parameters.Add(outputMessageParam);

                var outputErrorCodeParam = new SqlParameter("@OutputErrorCode", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
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

                do
                {
                    var currentResultSet = new List<Dictionary<string, object>>();

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

                for (int i = 0; i < resultSets.Count; i++)
                {
                    var rs = resultSets[i];
                    if (rs.Any())
                    {
                        _logger.LogInformation("   - Result Set {Index}: {RowCount} rows, {ColumnCount} columns, Columns: [{Columns}]",
                            i, rs.Count, rs.First().Keys.Count, string.Join(", ", rs.First().Keys));
                    }
                    else
                    {
                        _logger.LogInformation("   - Result Set {Index}: EMPTY", i);
                    }
                }

                // Find the result set with actual data (not metadata, not single-column count)
                var dataResultSet = resultSets
                    .Where(rs => rs.Any()) // Must have data
                    .Where(rs => rs.First().Keys.Count > 1) // Must have more than 1 column (not just count)
                    .Where(rs => !rs.First().Keys.Contains("COLUMN_NAME", StringComparer.OrdinalIgnoreCase) &&
                                !rs.First().Keys.Contains("DATA_TYPE", StringComparer.OrdinalIgnoreCase)) // Not metadata
                    .FirstOrDefault(); // Take the FIRST result set that matches criteria

                if (dataResultSet != null)
                {
                    results = dataResultSet;
                    _logger.LogInformation("✅ SERVICE: Selected DATA result set with {ColumnCount} columns and {RowCount} rows (not metadata, not count)",
                        results.First().Keys.Count, results.Count);
                }
                else
                {
                    _logger.LogWarning("⚠️ SERVICE: NO DATA RESULT SET found from SP! Available result sets: {ResultSetInfo}",
                        string.Join(", ", resultSets.Select((rs, i) => $"Set{i}:{rs.Count}rows,{(rs.Any() ? rs.First().Keys.Count : 0)}cols")));
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
                    _logger.LogInformation("📤 OUTPUT PARAMETER: @OutputErrorCode = {ErrorCode}", outputErrorCode);
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

                        // Detect data type from value
                        string dataType = "nvarchar";
                        if (value != null)
                        {
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
                        _logger.LogDebug("📋 Column detected from data: {ColumnName} ({DataType})", columnName, dataType);
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
