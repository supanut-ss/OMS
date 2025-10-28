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
                    ? string.Join(", ", request.SelectColumns.Select(c => $"[{c}]"))
                    : "*";

                // Build WHERE clause
                var whereClause = BuildDynamicWhereClause(request, metadata);

                // Debug logging for WHERE clause
                _logger.LogInformation("🏗️ Generated WHERE clause: {WhereClause}", whereClause);

                // Build ORDER BY clause
                var orderByClause = BuildDynamicOrderByClause(request.SortModel, metadata, request.CustomOrderBy);

                // Build final query
                var query = $@"
                    DECLARE @TotalCount INT;
                    
                    SELECT @TotalCount = COUNT(*)
                    FROM [{request.SchemaName ?? "dbo"}].[{request.TableName}]
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")};
                    
                    SELECT @TotalCount as TotalCount;
                    
                    SELECT {selectColumns}
                    FROM [{request.SchemaName ?? "dbo"}].[{request.TableName}]
                    {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}
                    {orderByClause}
                    OFFSET @Offset ROWS
                    FETCH NEXT @PageSize ROWS ONLY;";

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

            // Column filters
            foreach (var filter in request.FilterModel.Items)
            {
                var column = metadata.Columns.FirstOrDefault(c => c.ColumnName.Equals(filter.Field, StringComparison.OrdinalIgnoreCase));
                if (column == null) continue;

                var condition = filter.Operator.ToLower() switch
                {
                    "contains" => $"[{filter.Field}] LIKE @{filter.Field}_Filter",
                    "equals" => $"[{filter.Field}] = @{filter.Field}_Filter",
                    "startswith" => $"[{filter.Field}] LIKE @{filter.Field}_Filter",
                    "endswith" => $"[{filter.Field}] LIKE @{filter.Field}_Filter",
                    "isempty" => $"([{filter.Field}] IS NULL OR [{filter.Field}] = '')",
                    "isnotempty" => $"([{filter.Field}] IS NOT NULL AND [{filter.Field}] != '')",
                    ">" => $"[{filter.Field}] > @{filter.Field}_Filter",
                    ">=" => $"[{filter.Field}] >= @{filter.Field}_Filter",
                    "<" => $"[{filter.Field}] < @{filter.Field}_Filter",
                    "<=" => $"[{filter.Field}] <= @{filter.Field}_Filter",
                    "!=" => $"[{filter.Field}] != @{filter.Field}_Filter",
                    _ => $"[{filter.Field}] LIKE @{filter.Field}_Filter"
                };
                conditions.Add(condition);
            }

            // Quick filter - รองรับทั้ง QuickFilterValues (standard), QuickFilter ใน FilterModel และ QuickFilter ใน Request
            var quickFilterValue = !string.IsNullOrEmpty(request.FilterModel.QuickFilter)
                ? request.FilterModel.QuickFilter
                : !string.IsNullOrEmpty(request.FilterModel.QuickFilterValues)
                ? request.FilterModel.QuickFilterValues
                : request.QuickFilter;

            _logger.LogInformation("🔍 Quick Filter Debug: FilterModel.QuickFilter='{FilterModelQuickFilter}', FilterModel.QuickFilterValues='{QuickFilterValues}', Request.QuickFilter='{RequestQuickFilter}', Final='{FinalValue}'",
                request.FilterModel.QuickFilter,
                request.FilterModel.QuickFilterValues,
                request.QuickFilter,
                quickFilterValue);

            if (!string.IsNullOrEmpty(quickFilterValue))
            {
                var quickFilterConditions = new List<string>();
                foreach (var column in metadata.Columns.Where(c => IsSearchableColumn(c)))
                {
                    quickFilterConditions.Add($"CAST([{column.ColumnName}] AS NVARCHAR(MAX)) LIKE @QuickFilter");
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
            var quickFilterValue = !string.IsNullOrEmpty(request.FilterModel.QuickFilter)
                ? request.FilterModel.QuickFilter
                : !string.IsNullOrEmpty(request.FilterModel.QuickFilterValues)
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
                _logger.LogInformation("🎯 Using CustomOrderBy: {CustomOrderBy}", customOrderBy);
                return $"ORDER BY {customOrderBy}";
            }

            // Priority 2: Sort model from DataGrid
            if (sortModel != null && sortModel.Any())
            {
                var orderItems = sortModel
                    .Where(sort => metadata.Columns.Any(c => c.ColumnName.Equals(sort.Field, StringComparison.OrdinalIgnoreCase)))
                    .Select(sort => $"[{sort.Field}] {(sort.Sort.ToUpper() == "DESC" ? "DESC" : "ASC")}");

                if (orderItems.Any())
                {
                    return $"ORDER BY {string.Join(", ", orderItems)}";
                }
            }

            // Priority 3: Default sort by first primary key or first column
            var defaultColumn = metadata.PrimaryKeys.FirstOrDefault() ?? metadata.Columns.FirstOrDefault()?.ColumnName;
            return defaultColumn != null ? $"ORDER BY [{defaultColumn}] ASC" : "ORDER BY 1 ASC";
        }


        private bool IsSearchableColumn(DynamicColumnInfo column)
        {
            var searchableTypes = new[] { "varchar", "nvarchar", "char", "nchar", "text", "ntext" };
            return searchableTypes.Contains(column.DataType.ToLower());
        }

        public async Task<EnhancedStoredProcedureResponse> ExecuteEnhancedStoredProcedureAsync(EnhancedStoredProcedureRequest request)
        {
            ValidateSecurityConstraints("", request.SchemaName ?? "dbo");

            using var connection = _connectionFactory.CreateConnection(DatabaseType.Main);
            await connection.OpenAsync();

            var command = new SqlCommand($"[{request.SchemaName}].[{request.ProcedureName}]", connection)
            {
                CommandType = CommandType.StoredProcedure,
                CommandTimeout = 300 // 5 minutes
            };

            // Add operation parameter
            command.Parameters.Add(new SqlParameter("@Operation", SqlDbType.VarChar) { Value = request.Operation });

            // Add pagination parameters for SELECT operations
            if (request.Operation.Equals("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                if (request.Page.HasValue && request.PageSize.HasValue)
                {
                    command.Parameters.Add(new SqlParameter("@Page", SqlDbType.Int) { Value = request.Page.Value });
                    command.Parameters.Add(new SqlParameter("@PageSize", SqlDbType.Int) { Value = request.PageSize.Value });
                }

                // Add sorting parameters
                if (request.SortModel?.Any() == true)
                {
                    var orderBy = string.Join(", ", request.SortModel.Select(s => $"{s.Field} {s.Sort}"));
                    command.Parameters.Add(new SqlParameter("@OrderBy", SqlDbType.VarChar) { Value = orderBy });
                }

                // Add filter parameters
                if (request.FilterModel?.Items?.Any() == true)
                {
                    var filterJson = JsonSerializer.Serialize(request.FilterModel);
                    command.Parameters.Add(new SqlParameter("@FilterModel", SqlDbType.VarChar) { Value = filterJson });
                }
            }

            // Add user ID for audit operations
            if (!string.IsNullOrEmpty(request.UserId))
            {
                command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.VarChar) { Value = request.UserId });
            }

            // Add custom parameters
            if (request.Parameters?.Any() == true)
            {
                foreach (var param in request.Parameters)
                {
                    var sqlParam = new SqlParameter($"@{param.Key}", ConvertJsonElementValue(param.Value));
                    command.Parameters.Add(sqlParam);
                }
            }

            // Add output parameters for affected rows and messages
            var outputRowCount = new SqlParameter("@OutputRowCount", SqlDbType.Int) { Direction = ParameterDirection.Output };
            var outputMessage = new SqlParameter("@OutputMessage", SqlDbType.VarChar, 4000) { Direction = ParameterDirection.Output };
            command.Parameters.Add(outputRowCount);
            command.Parameters.Add(outputMessage);

            _logger.LogInformation("🚀 Executing Enhanced Stored Procedure: [{Schema}].[{Procedure}] with Operation: {Operation}",
                request.SchemaName, request.ProcedureName, request.Operation);

            var result = new EnhancedStoredProcedureResponse
            {
                Operation = request.Operation,
                ExecutedAt = DateTime.UtcNow
            };

            try
            {
                using var reader = await command.ExecuteReaderAsync();
                var data = new List<Dictionary<string, object>>();

                // Read result sets
                do
                {
                    while (await reader.ReadAsync())
                    {
                        var row = new Dictionary<string, object>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            var columnName = reader.GetName(i);
                            var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                            row[columnName] = value;
                        }
                        data.Add(row);
                    }
                } while (await reader.NextResultAsync());

                result.Data = data;
                result.Success = true;

                // Get output parameters after reader is closed
                await reader.CloseAsync();

                result.RowCount = outputRowCount.Value != DBNull.Value ? (int)outputRowCount.Value : data.Count;
                result.Message = outputMessage.Value?.ToString();

                // Collect output parameters
                result.OutputParameters = new Dictionary<string, object>();
                foreach (SqlParameter param in command.Parameters)
                {
                    if (param.Direction == ParameterDirection.Output || param.Direction == ParameterDirection.InputOutput)
                    {
                        result.OutputParameters[param.ParameterName] = param.Value ?? DBNull.Value;
                    }
                }

                _logger.LogInformation("✅ Enhanced Stored Procedure executed successfully. Operation: {Operation}, Rows: {RowCount}",
                    request.Operation, result.RowCount);

                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = ex.Message;

                _logger.LogError(ex, "❌ Enhanced Stored Procedure execution failed: [{Schema}].[{Procedure}]",
                    request.SchemaName, request.ProcedureName);

                throw;
            }
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

                // Find the result set with the most columns (likely the data)
                var dataResultSet = resultSets
                    .Where(rs => rs.Any()) // Must have data
                    .OrderByDescending(rs => rs.First().Keys.Count) // Most columns first
                    .FirstOrDefault();

                if (dataResultSet != null)
                {
                    results = dataResultSet;
                    _logger.LogInformation("Selected result set with {ColumnCount} columns and {RowCount} rows",
                        results.First().Keys.Count, results.Count);
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
                if (outputRowCountParam.Value != DBNull.Value)
                {
                    totalCount = (int)outputRowCountParam.Value;
                }

                if (outputMessageParam.Value != DBNull.Value)
                {
                    message = outputMessageParam.Value.ToString() ?? "Success";
                }

                // If no explicit total count, use result count
                if (totalCount == 0)
                {
                    totalCount = results.Count;
                }

                stopwatch.Stop();

                _logger.LogInformation("Enhanced Stored Procedure executed successfully in {ElapsedMs}ms. Returned {RowCount} rows",
                    stopwatch.ElapsedMilliseconds, results.Count);

                return new EnhancedStoredProcedureResponse
                {
                    Success = true,
                    Data = results,
                    RowCount = totalCount > 0 ? totalCount : results.Count,
                    Message = message,
                    Operation = operation,
                    ExecutionTime = stopwatch.ElapsedMilliseconds
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
