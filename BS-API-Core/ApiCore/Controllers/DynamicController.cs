using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ApiCore.Models.Base;
using ApiCore.Models.Dynamic;
using ApiCore.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security;

namespace ApiCore.Controllers
{
    /// <summary>
    /// Dynamic CRUD Controller for auto-generated database operations
    /// Supports tables, views, and stored procedures with MUI X DataGrid integration
    /// Enhanced for BSDataGrid component support
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DynamicController : ControllerBase
    {
        private readonly IDynamicCrudService _dynamicService;
        private readonly ILogger<DynamicController> _logger;

        public DynamicController(IDynamicCrudService dynamicService, ILogger<DynamicController> logger)
        {
            _dynamicService = dynamicService;
            _logger = logger;
        }

        /// <summary>
        /// Get database schema information (tables, views, stored procedures)
        /// </summary>
        /// <param name="request">Schema exploration request</param>
        /// <returns>List of available database objects</returns>
        [HttpPost("schema")]
        [ProducesResponseType(typeof(DynamicSchemaResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicSchemaResponse>> GetSchemaAsync(
            [FromBody] DynamicSchemaRequest request)
        {
            try
            {
                var result = await _dynamicService.GetSchemaAsync(request);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving schema information");
                return BadRequest(new { message = $"Error retrieving schema: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get table/view metadata and structure information
        /// </summary>
        /// <param name="tableName">Name of the table or view</param>
        /// <param name="schemaName">Schema name (default: dbo)</param>
        /// <returns>Table metadata including columns, data types, and constraints</returns>
        [HttpGet("metadata/{tableName}")]
        [ProducesResponseType(typeof(DynamicTableMetadata), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicTableMetadata>> GetTableMetadataAsync(
            [Required] string tableName,
            [FromQuery] string schemaName = "dbo")
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(tableName, schemaName))
                {
                    return NotFound(new { message = $"Table '{schemaName}.{tableName}' not found" });
                }

                var metadata = await _dynamicService.GetTableMetadataAsync(tableName, schemaName);

                return Ok(metadata);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving table metadata for {TableName}", tableName);
                return BadRequest(new { message = $"Error retrieving metadata: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get data from table/view with DataGrid support for MUI X DataGrid
        /// Supports pagination, sorting, filtering, and searching
        /// </summary>
        /// <param name="request">DataGrid request with table name and grid parameters</param>
        /// <returns>Paginated data with metadata for DataGrid</returns>
        [HttpPost("datagrid")]
        [ProducesResponseType(typeof(DynamicDataGridResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicDataGridResponse>> GetDataGridAsync(
            [FromBody] DynamicDataGridRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return BadRequest(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var result = await _dynamicService.GetDataGridAsync(request);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving DataGrid data for {TableName}", request.TableName);
                return BadRequest(new { message = $"Error retrieving data: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get data from table/view with BSDataGrid support
        /// Enhanced for BS Platform with preObj, custom WHERE/ORDER BY, and column selection
        /// </summary>
        /// <param name="request">BSDataGrid request with BS Platform properties</param>
        /// <returns>Paginated data with metadata for BSDataGrid</returns>
        [HttpPost("bs-datagrid")]
        [ProducesResponseType(typeof(DynamicDataGridResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicDataGridResponse>> GetBSDataGridAsync(
            [FromBody] DynamicDataGridRequest request)
        {
            try
            {
                // Map BS Platform properties to standard DataGrid properties
                if (request.Page > 0 && request.PageSize > 0)
                {
                    request.Start = (request.Page - 1) * request.PageSize;
                    request.End = request.Page * request.PageSize;
                }

                // Parse custom column list
                if (!string.IsNullOrEmpty(request.Columns))
                {
                    request.SelectColumns = request.Columns.Split(',')
                        .Select(col => col.Trim())
                        .Where(col => !string.IsNullOrEmpty(col))
                        .ToList();
                }

                // Parse custom ORDER BY only if SortModel is not provided
                // Priority: SortModel (from UI) > CustomOrderBy (from config)
                if (request.SortModel == null || !request.SortModel.Any())
                {
                    if (!string.IsNullOrEmpty(request.CustomOrderBy))
                    {
                        request.SortModel = request.CustomOrderBy.Split(',')
                            .Select(orderPart =>
                            {
                                var parts = orderPart.Trim().Split(' ');
                                return new DataGridSortModel
                                {
                                    Field = parts[0],
                                    Sort = parts.Length > 1 && parts[1].ToLower() == "desc" ? "desc" : "asc"
                                };
                            })
                            .ToList();
                    }
                }

                // Add custom WHERE to filter model
                if (!string.IsNullOrEmpty(request.CustomWhere))
                {
                    request.FilterModel.Items.Add(new DataGridFilterItem
                    {
                        Field = "__custom_where__",
                        Operator = "custom",
                        Value = request.CustomWhere
                    });
                }

                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return BadRequest(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var result = await _dynamicService.GetDataGridAsync(request);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving BSDataGrid data for {TableName}", request.TableName);
                return BadRequest(new { message = $"Error retrieving data: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get single record by primary key values
        /// </summary>
        /// <param name="tableName">Name of the table</param>
        /// <param name="primaryKeyValues">Primary key values as JSON object</param>
        /// <param name="schemaName">Schema name (default: dbo)</param>
        /// <returns>Single record data</returns>
        [HttpPost("record/{tableName}")]
        [ProducesResponseType(typeof(DynamicResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicResponse>> GetByIdAsync(
            [Required] string tableName,
            [FromBody] Dictionary<string, object> primaryKeyValues,
            [FromQuery] string schemaName = "dbo")
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(tableName, schemaName))
                {
                    return NotFound(new { message = $"Table '{schemaName}.{tableName}' not found" });
                }

                var record = await _dynamicService.GetByIdAsync(tableName, primaryKeyValues, schemaName);

                if (record == null)
                {
                    return NotFound(new { message = "Record not found" });
                }

                return Ok(record);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving record from {TableName}", tableName);
                return BadRequest(new { message = $"Error retrieving record: {ex.Message}" });
            }
        }

        /// <summary>
        /// Create new record in table
        /// </summary>
        /// <param name="request">Create request with table name and data</param>
        /// <returns>Created record data</returns>
        [HttpPost("create")]
        [ProducesResponseType(typeof(DynamicResponse), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicResponse>> CreateAsync(
            [FromBody] DynamicCreateRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return BadRequest(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var result = await _dynamicService.CreateAsync(request);

                // Return 200 OK instead of CreatedAtAction to avoid routing issues
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating record in {TableName}", request.TableName);
                return BadRequest(new { message = $"Error creating record: {ex.Message}" });
            }
        }

        /// <summary>
        /// Update existing record in table
        /// </summary>
        /// <param name="request">Update request with table name, data, and where conditions</param>
        /// <returns>Updated record data</returns>
        [HttpPost("update")]
        [ProducesResponseType(typeof(DynamicResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicResponse>> UpdateAsync(
            [FromBody] DynamicUpdateRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return NotFound(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var result = await _dynamicService.UpdateAsync(request);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating record in {TableName}", request.TableName);
                return BadRequest(new { message = $"Error updating record: {ex.Message}" });
            }
        }

        /// <summary>
        /// Delete record from table
        /// </summary>
        /// <param name="request">Delete request with table name and where conditions</param>
        /// <returns>Success status</returns>
        [HttpPost("delete")]
        [ProducesResponseType(typeof(bool), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<bool>> DeleteAsync(
            [FromBody] DynamicDeleteRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return NotFound(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var result = await _dynamicService.DeleteAsync(request);

                if (!result)
                {
                    return NotFound(new { message = "Record not found or could not be deleted" });
                }

                return Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting record from {TableName}", request.TableName);
                return BadRequest(new { message = $"Error deleting record: {ex.Message}" });
            }
        }

        /// <summary>
        /// Bulk create multiple records in table (for BSDataGrid bulk add)
        /// </summary>
        /// <param name="request">Bulk create request with array of data</param>
        /// <returns>Created records count and details</returns>
        [HttpPost("bulk-create")]
        [ProducesResponseType(typeof(object), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult> BulkCreateAsync(
            [FromBody] DynamicBulkCreateRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return BadRequest(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var results = new List<DynamicResponse>();
                var errors = new List<string>();

                foreach (var data in request.DataItems)
                {
                    try
                    {
                        var createRequest = new DynamicCreateRequest
                        {
                            TableName = request.TableName,
                            SchemaName = request.SchemaName,
                            Data = data,
                            CreateBy = request.CreateBy
                        };

                        var result = await _dynamicService.CreateAsync(createRequest);
                        results.Add(result);
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Failed to create record: {ex.Message}");
                    }
                }

                return Created("", new
                {
                    message = $"Bulk create completed: {results.Count} successful, {errors.Count} failed",
                    successful = results.Count,
                    failed = errors.Count,
                    results = results,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk creating records in {TableName}", request.TableName);
                return BadRequest(new { message = $"Error bulk creating records: {ex.Message}" });
            }
        }

        /// <summary>
        /// Bulk update multiple records in table (for BSDataGrid bulk edit)
        /// </summary>
        /// <param name="request">Bulk update request with array of data and conditions</param>
        /// <returns>Updated records count and details</returns>
        [HttpPost("bulk-update")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<ActionResult> BulkUpdateAsync(
            [FromBody] DynamicBulkUpdateRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return NotFound(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var results = new List<DynamicResponse>();
                var errors = new List<string>();

                foreach (var updateItem in request.UpdateItems)
                {
                    try
                    {
                        var updateRequest = new DynamicUpdateRequest
                        {
                            TableName = request.TableName,
                            SchemaName = request.SchemaName,
                            Data = updateItem.Data,
                            WhereConditions = updateItem.WhereConditions,
                            UpdateBy = request.UpdateBy
                        };

                        var result = await _dynamicService.UpdateAsync(updateRequest);
                        results.Add(result);
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Failed to update record: {ex.Message}");
                    }
                }

                return Ok(new
                {
                    message = $"Bulk update completed: {results.Count} successful, {errors.Count} failed",
                    successful = results.Count,
                    failed = errors.Count,
                    results = results,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk updating records in {TableName}", request.TableName);
                return BadRequest(new { message = $"Error bulk updating records: {ex.Message}" });
            }
        }

        /// <summary>
        /// Bulk delete multiple records from table (for BSDataGrid bulk delete)
        /// </summary>
        /// <param name="request">Bulk delete request with array of conditions</param>
        /// <returns>Deleted records count and details</returns>
        [HttpPost("bulk-delete")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<ActionResult> BulkDeleteAsync(
            [FromBody] DynamicBulkDeleteRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return NotFound(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                var results = new List<bool>();
                var errors = new List<string>();

                foreach (var whereCondition in request.WhereConditions)
                {
                    try
                    {
                        var deleteRequest = new DynamicDeleteRequest
                        {
                            TableName = request.TableName,
                            SchemaName = request.SchemaName,
                            WhereConditions = whereCondition
                        };

                        var result = await _dynamicService.DeleteAsync(deleteRequest);
                        results.Add(result);
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Failed to delete record: {ex.Message}");
                        results.Add(false);
                    }
                }

                var successCount = results.Count(r => r);

                return Ok(new
                {
                    message = $"Bulk delete completed: {successCount} successful, {errors.Count} failed",
                    successful = successCount,
                    failed = errors.Count,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk deleting records from {TableName}", request.TableName);
                return BadRequest(new { message = $"Error bulk deleting records: {ex.Message}" });
            }
        }

        /// <summary>
        /// Execute stored procedure with parameters
        /// </summary>
        /// <param name="procedureName">Name of the stored procedure</param>
        /// <param name="parameters">Parameters for the stored procedure</param>
        /// <param name="schemaName">Schema name (default: dbo)</param>
        /// <returns>Stored procedure result data</returns>
        [HttpPost("procedure/{procedureName}")]
        [ProducesResponseType(typeof(DynamicDataGridResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicDataGridResponse>> ExecuteStoredProcedureAsync(
            [Required] string procedureName,
            [FromBody] Dictionary<string, object>? parameters = null,
            [FromQuery] string schemaName = "dbo")
        {
            try
            {
                var result = await _dynamicService.ExecuteStoredProcedureAsync(procedureName, parameters, schemaName);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing stored procedure {ProcedureName}", procedureName);
                return BadRequest(new { message = $"Error executing stored procedure: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get stored procedure metadata and parameter information
        /// </summary>
        /// <param name="procedureName">Name of the stored procedure</param>
        /// <param name="schemaName">Schema name (default: dbo)</param>
        /// <returns>Stored procedure metadata</returns>
        [HttpGet("procedure-metadata/{procedureName}")]
        [ProducesResponseType(typeof(DynamicStoredProcedureInfo), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicStoredProcedureInfo>> GetStoredProcedureMetadataAsync(
            [Required] string procedureName,
            [FromQuery] string schemaName = "dbo")
        {
            try
            {
                var metadata = await _dynamicService.GetStoredProcedureMetadataAsync(procedureName, schemaName);

                if (string.IsNullOrEmpty(metadata.ProcedureName))
                {
                    return NotFound(new { message = $"Stored procedure '{schemaName}.{procedureName}' not found" });
                }

                return Ok(metadata);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving stored procedure metadata for {ProcedureName}", procedureName);
                return BadRequest(new { message = $"Error retrieving metadata: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get ComboBox data for BSDataGrid columns
        /// Supports BS Platform preObj, custom WHERE/ORDER BY for dropdown options
        /// </summary>
        /// <param name="request">ComboBox data request</param>
        /// <returns>ComboBox options with value and display fields</returns>
        [HttpPost("combobox")]
        [ProducesResponseType(typeof(List<Dictionary<string, object>>), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<List<Dictionary<string, object>>>> GetComboBoxDataAsync(
            [FromBody] DynamicComboBoxRequest request)
        {
            try
            {
                if (!await _dynamicService.TableExistsAsync(request.TableName, request.SchemaName ?? "dbo"))
                {
                    return BadRequest(new { message = $"Table '{request.SchemaName ?? "dbo"}.{request.TableName}' not found" });
                }

                // Parse display fields (supports comma-separated for multiple fields)
                var displayFields = request.DisplayField
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(f => f.Trim())
                    .ToArray();

                // Build columns list including all display fields
                var allColumns = new List<string> { request.ValueField };
                allColumns.AddRange(displayFields);

                // Build DataGrid request for ComboBox data
                var dataGridRequest = new DynamicDataGridRequest
                {
                    TableName = request.TableName,
                    SchemaName = request.SchemaName,
                    PreObj = request.PreObj,
                    Columns = string.Join(",", allColumns.Distinct()),
                    CustomWhere = request.CustomWhere,
                    CustomOrderBy = request.CustomOrderBy ?? $"{displayFields[0]} asc",
                    GroupBy = request.GroupBy, // Pass GROUP BY clause
                    Page = 1,
                    PageSize = request.MaxItems ?? 1000, // Default limit for dropdown
                    Start = 0,
                    End = request.MaxItems ?? 1000
                };

                var result = await _dynamicService.GetDataGridAsync(dataGridRequest);

                // Transform data to ComboBox format with support for multiple display fields
                var comboBoxData = result.Rows.Select(row =>
                {
                    var data = row.Data ?? new Dictionary<string, object>();

                    // Concatenate multiple display fields with space
                    var displayValue = string.Join(" ", displayFields
                        .Where(f => data.ContainsKey(f) && data[f] != null)
                        .Select(f => data[f]?.ToString() ?? "")
                        .Where(v => !string.IsNullOrWhiteSpace(v)));

                    return new Dictionary<string, object>
                    {
                        ["value"] = data.ContainsKey(request.ValueField) ? data[request.ValueField] : null,
                        ["display"] = displayValue,
                        ["data"] = data // Include full row data for reference
                    };
                }).ToList();

                // Add default option if specified
                if (!string.IsNullOrEmpty(request.DefaultOption))
                {
                    comboBoxData.Insert(0, new Dictionary<string, object>
                    {
                        ["value"] = "",
                        ["display"] = request.DefaultOption,
                        ["data"] = new Dictionary<string, object>()
                    });
                }

                return Ok(comboBoxData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving ComboBox data for {TableName}", request.TableName);
                return BadRequest(new { message = $"Error retrieving ComboBox data: {ex.Message}" });
            }
        }

        /// <summary>
        /// Execute custom SQL query (SELECT only for security)
        /// </summary>
        /// <param name="sqlQuery">SQL SELECT query</param>
        /// <param name="parameters">Query parameters</param>
        /// <returns>Query result data</returns>
        [HttpPost("query")]
        [ProducesResponseType(typeof(DynamicDataGridResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DynamicDataGridResponse>> ExecuteQueryAsync(
            [FromBody] string sqlQuery,
            [FromQuery] Dictionary<string, object>? parameters = null)
        {
            try
            {
                var result = await _dynamicService.ExecuteQueryAsync(sqlQuery, parameters);

                return Ok(result);
            }
            catch (SecurityException ex)
            {
                _logger.LogWarning(ex, "Security violation in custom query execution");
                return BadRequest(new { message = $"Security error: {ex.Message}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing custom query");
                return BadRequest(new { message = $"Error executing query: {ex.Message}" });
            }
        }

        /// <summary>
        /// Check if table/view exists
        /// </summary>
        /// <param name="tableName">Name of the table or view</param>
        /// <param name="schemaName">Schema name (default: dbo)</param>
        /// <returns>Existence status</returns>
        [HttpGet("exists/{tableName}")]
        [ProducesResponseType(typeof(bool), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<bool>> TableExistsAsync(
            [Required] string tableName,
            [FromQuery] string schemaName = "dbo")
        {
            try
            {
                var exists = await _dynamicService.TableExistsAsync(tableName, schemaName);

                return Ok(exists);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking table existence for {TableName}", tableName);
                return BadRequest(new { message = $"Error checking table existence: {ex.Message}" });
            }
        }

        /// <summary>
        /// Execute Enhanced Stored Procedure with full CRUD operations
        /// Supports SELECT, INSERT, UPDATE, DELETE operations in a single stored procedure
        /// </summary>
        /// <param name="request">Enhanced stored procedure request with operation type and parameters</param>
        /// <returns>Enhanced stored procedure result with data and metadata</returns>
        [HttpPost("enhanced-procedure")]
        [ProducesResponseType(typeof(EnhancedStoredProcedureResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<EnhancedStoredProcedureResponse>> ExecuteEnhancedStoredProcedureAsync(
            [FromBody] EnhancedStoredProcedureRequest request)
        {
            try
            {
                _logger.LogInformation("🔵 CONTROLLER: Executing Enhanced SP: {ProcedureName}.{SchemaName}, Operation: {Operation}",
                    request.ProcedureName, request.SchemaName, request.Operation);

                var result = await _dynamicService.ExecuteEnhancedStoredProcedureAsync(request);

                // 🔍 DEBUG: Log response details
                _logger.LogInformation("✅ CONTROLLER: Enhanced SP executed - Success: {Success}, RowCount: {RowCount}, HasMetadata: {HasMetadata}",
                    result.Success, result.RowCount, result.Metadata != null);

                if (result.Metadata != null)
                {
                    _logger.LogInformation("📋 CONTROLLER: Metadata included - Columns: {ColumnCount}, Primary Keys: [{PrimaryKeys}]",
                        result.Metadata.Columns?.Count ?? 0,
                        result.Metadata.PrimaryKeys != null ? string.Join(", ", result.Metadata.PrimaryKeys) : "NONE");
                }
                else
                {
                    _logger.LogWarning("⚠️ CONTROLLER: NO METADATA in response!");
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ CONTROLLER ERROR: Enhanced stored procedure {ProcedureName} failed", request.ProcedureName);
                return BadRequest(new { message = $"Error executing enhanced stored procedure: {ex.Message}" });
            }
        }
    }
}
