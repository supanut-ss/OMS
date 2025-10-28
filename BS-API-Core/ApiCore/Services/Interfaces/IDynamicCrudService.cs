using ApiCore.Models.Dynamic;

namespace ApiCore.Services.Interfaces
{
    /// <summary>
    /// Dynamic CRUD service interface for auto-generated operations
    /// </summary>
    public interface IDynamicCrudService
    {
        /// <summary>
        /// Get table/view schema information
        /// </summary>
        Task<DynamicTableMetadata> GetTableMetadataAsync(string tableName, string schemaName = "dbo");

        /// <summary>
        /// Get all available tables, views, and stored procedures
        /// </summary>
        Task<DynamicSchemaResponse> GetSchemaAsync(DynamicSchemaRequest request);

        /// <summary>
        /// Get data from table/view with DataGrid support
        /// </summary>
        Task<DynamicDataGridResponse> GetDataGridAsync(DynamicDataGridRequest request);

        /// <summary>
        /// Get single record by primary key
        /// </summary>
        Task<DynamicResponse?> GetByIdAsync(string tableName, Dictionary<string, object> primaryKeyValues, string schemaName = "dbo");

        /// <summary>
        /// Create new record in table
        /// </summary>
        Task<DynamicResponse> CreateAsync(DynamicCreateRequest request);

        /// <summary>
        /// Update existing record in table
        /// </summary>
        Task<DynamicResponse> UpdateAsync(DynamicUpdateRequest request);

        /// <summary>
        /// Delete record from table
        /// </summary>
        Task<bool> DeleteAsync(DynamicDeleteRequest request);

        /// <summary>
        /// Execute stored procedure with parameters
        /// </summary>
        Task<DynamicDataGridResponse> ExecuteStoredProcedureAsync(string procedureName, Dictionary<string, object>? parameters = null, string schemaName = "dbo");

        /// <summary>
        /// Get stored procedure metadata
        /// </summary>
        Task<DynamicStoredProcedureInfo> GetStoredProcedureMetadataAsync(string procedureName, string schemaName = "dbo");

        /// <summary>
        /// Validate table/view exists
        /// </summary>
        Task<bool> TableExistsAsync(string tableName, string schemaName = "dbo");

        /// <summary>
        /// Execute custom SQL query (with security restrictions)
        /// </summary>
        Task<DynamicDataGridResponse> ExecuteQueryAsync(string sqlQuery, Dictionary<string, object>? parameters = null);

        /// <summary>
        /// Execute Enhanced Stored Procedure with full CRUD operations
        /// </summary>
        Task<EnhancedStoredProcedureResponse> ExecuteEnhancedStoredProcedureAsync(EnhancedStoredProcedureRequest request);
    }
}
