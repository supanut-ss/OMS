using ApiCore.Models.Base;
using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Dynamic
{
    /// <summary>
    /// Dynamic table/view request for auto-generated CRUD operations
    /// </summary>
    public class DynamicTableRequest : BaseRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        public DynamicTableType TableType { get; set; } = DynamicTableType.Table;

        public string? StoredProcedureName { get; set; }

        public Dictionary<string, object>? Parameters { get; set; }
    }

    /// <summary>
    /// Enhanced Stored Procedure request supporting SELECT, UPDATE, DELETE operations
    /// </summary>
    public class EnhancedStoredProcedureRequest : BaseRequest
    {
        [Required]
        public string ProcedureName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        [Required]
        public string Operation { get; set; } = "SELECT"; // "SELECT", "INSERT", "UPDATE", "DELETE"

        public Dictionary<string, object>? Parameters { get; set; } = new();

        /// <summary>
        /// Pagination support for SELECT operations
        /// </summary>
        public int? Page { get; set; }
        public int? PageSize { get; set; }

        /// <summary>
        /// Sorting support for SELECT operations
        /// </summary>
        public List<DataGridSortModel>? SortModel { get; set; }

        /// <summary>
        /// Filtering support for SELECT operations
        /// </summary>
        public DataGridFilterModel? FilterModel { get; set; }

        /// <summary>
        /// User ID for audit operations
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// Data for INSERT/UPDATE operations
        /// </summary>
        public Dictionary<string, object>? Data { get; set; }

        /// <summary>
        /// User lookup configuration for audit fields (create_by, update_by)
        /// </summary>
        public UserLookupConfig? UserLookup { get; set; }
    }

    /// <summary>
    /// Enhanced Stored Procedure response
    /// </summary>
    public class EnhancedStoredProcedureResponse
    {
        public List<Dictionary<string, object>> Data { get; set; } = new();
        public int RowCount { get; set; }
        public string Operation { get; set; } = string.Empty;
        public bool Success { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, object>? OutputParameters { get; set; }
        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
        public long ExecutionTime { get; set; }

        /// <summary>
        /// Table metadata detected from result set (columns, primary keys, etc.)
        /// </summary>
        public DynamicTableMetadata? Metadata { get; set; }
    }

    /// <summary>
    /// Dynamic create request with flexible data
    /// </summary>
    public class DynamicCreateRequest : BaseRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        [Required]
        public Dictionary<string, object> Data { get; set; } = new();

        /// <summary>
        /// User ID for audit fields (create_by, update_by)
        /// </summary>
        public string? UserId { get; set; }
    }

    /// <summary>
    /// Dynamic update request with flexible data
    /// </summary>
    public class DynamicUpdateRequest : BaseUpdateRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        [Required]
        public Dictionary<string, object> Data { get; set; } = new();

        [Required]
        public Dictionary<string, object> WhereConditions { get; set; } = new();

        /// <summary>
        /// User ID for audit fields (update_by)
        /// </summary>
        public string? UserId { get; set; }
    }

    /// <summary>
    /// Dynamic DataGrid request for MUI X DataGrid with BSDataGrid support
    /// </summary>
    public class DynamicDataGridRequest : DataGridRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        public DynamicTableType TableType { get; set; } = DynamicTableType.Table;

        public string? StoredProcedureName { get; set; }

        public List<string>? SelectColumns { get; set; }

        public Dictionary<string, object>? ExtraParameters { get; set; }

        // BS Platform specific properties
        /// <summary>
        /// BS Platform prefix object (e.g., "default", "staging")
        /// </summary>
        public string? PreObj { get; set; } = "default";

        /// <summary>
        /// Page number for pagination (1-based)
        /// </summary>
        public int Page { get; set; } = 1;

        /// <summary>
        /// Page size for pagination
        /// </summary>
        public int PageSize { get; set; } = 25;

        /// <summary>
        /// Comma-separated column list to select
        /// </summary>
        public string? Columns { get; set; }

        /// <summary>
        /// Custom WHERE clause for filtering
        /// </summary>
        public string? CustomWhere { get; set; }

        /// <summary>
        /// Custom ORDER BY clause for sorting
        /// </summary>
        public string? CustomOrderBy { get; set; }

        /// <summary>
        /// GROUP BY clause to remove duplicates (e.g., "menu_group")
        /// </summary>
        public string? GroupBy { get; set; }

        /// <summary>
        /// Quick filter value from Frontend (for BSDataGrid compatibility)
        /// </summary>
        public string? QuickFilter { get; set; }

        /// <summary>
        /// User lookup configuration for audit fields (create_by, update_by)
        /// </summary>
        public UserLookupConfig? UserLookup { get; set; }
    }

    /// <summary>
    /// Dynamic response with flexible data structure
    /// </summary>
    public class DynamicResponse
    {
        public Dictionary<string, object> Data { get; set; } = new();

        public DynamicTableMetadata? Metadata { get; set; }
    }

    /// <summary>
    /// Dynamic table metadata information
    /// </summary>
    public class DynamicTableMetadata
    {
        public string TableName { get; set; } = string.Empty;
        public string SchemaName { get; set; } = string.Empty;
        public DynamicTableType TableType { get; set; }
        public List<DynamicColumnInfo> Columns { get; set; } = new();
        public List<string> PrimaryKeys { get; set; } = new();
        public int TotalRows { get; set; }
        public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Dynamic column information
    /// </summary>
    public class DynamicColumnInfo
    {
        public string ColumnName { get; set; } = string.Empty;
        public string DataType { get; set; } = string.Empty;
        public bool IsNullable { get; set; }
        public bool IsPrimaryKey { get; set; }
        public bool IsIdentity { get; set; }
        public int? MaxLength { get; set; }
        public int? Precision { get; set; }
        public int? Scale { get; set; }
        public object? DefaultValue { get; set; }
        public int OrdinalPosition { get; set; }
        /// <summary>
        /// Column description from MS_Description extended property
        /// </summary>
        public string? Description { get; set; }
    }

    /// <summary>
    /// Bulk create request for multiple records
    /// </summary>
    public class DynamicBulkCreateRequest : BaseRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        [Required]
        public List<Dictionary<string, object>> DataItems { get; set; } = new();
    }

    /// <summary>
    /// Bulk update request for multiple records
    /// </summary>
    public class DynamicBulkUpdateRequest : BaseRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        [Required]
        public List<DynamicBulkUpdateItem> UpdateItems { get; set; } = new();

        public string UpdateBy { get; set; } = string.Empty;
    }

    /// <summary>
    /// Single update item for bulk update
    /// </summary>
    public class DynamicBulkUpdateItem
    {
        [Required]
        public Dictionary<string, object> Data { get; set; } = new();

        [Required]
        public Dictionary<string, object> WhereConditions { get; set; } = new();
    }

    /// <summary>
    /// Bulk delete request for multiple records
    /// </summary>
    public class DynamicBulkDeleteRequest : BaseRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        [Required]
        public List<Dictionary<string, object>> WhereConditions { get; set; } = new();
    }

    /// <summary>
    /// ComboBox data request for BSDataGrid dropdown columns
    /// </summary>
    public class DynamicComboBoxRequest : BaseRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        /// <summary>
        /// BS Platform prefix object (e.g., "default", "staging")
        /// </summary>
        public string? PreObj { get; set; } = "default";

        /// <summary>
        /// Field name to use as value
        /// </summary>
        [Required]
        public string ValueField { get; set; } = string.Empty;

        /// <summary>
        /// Field name(s) to use as display text.
        /// Supports comma-separated fields (e.g., "first_name,last_name") which will be concatenated with space.
        /// </summary>
        [Required]
        public string DisplayField { get; set; } = string.Empty;

        /// <summary>
        /// Custom WHERE clause for filtering options
        /// </summary>
        public string? CustomWhere { get; set; }

        /// <summary>
        /// Custom ORDER BY clause for sorting options
        /// </summary>
        public string? CustomOrderBy { get; set; }

        /// <summary>
        /// GROUP BY clause to remove duplicates (e.g., "menu_group")
        /// </summary>
        public string? GroupBy { get; set; }

        /// <summary>
        /// Default option text (e.g., "--- Select Status ---")
        /// </summary>
        public string? DefaultOption { get; set; }

        /// <summary>
        /// Maximum number of items to return
        /// </summary>
        public int? MaxItems { get; set; } = 1000;
    }

    /// <summary>
    /// Table type enumeration
    /// </summary>
    public enum DynamicTableType
    {
        Table,
        View,
        StoredProcedure
    }

    /// <summary>
    /// Dynamic DataGrid response for MUI X DataGrid
    /// </summary>
    public class DynamicDataGridResponse : DataGridResponse<DynamicResponse>
    {
        public DynamicTableMetadata? TableMetadata { get; set; }
        public List<DynamicColumnInfo> ColumnDefinitions { get; set; } = new();
    }

    /// <summary>
    /// Dynamic delete request
    /// </summary>
    public class DynamicDeleteRequest : BaseRequest
    {
        [Required]
        public string TableName { get; set; } = string.Empty;

        public string? SchemaName { get; set; } = "dbo";

        [Required]
        public Dictionary<string, object> WhereConditions { get; set; } = new();
    }

    /// <summary>
    /// Dynamic schema exploration request
    /// </summary>
    public class DynamicSchemaRequest : BaseRequest
    {
        public string? SchemaName { get; set; }
        public DynamicTableType? TableType { get; set; }
        public string? SearchPattern { get; set; }
    }

    /// <summary>
    /// Dynamic schema exploration response
    /// </summary>
    public class DynamicSchemaResponse
    {
        public List<DynamicTableInfo> Tables { get; set; } = new();
        public List<DynamicTableInfo> Views { get; set; } = new();
        public List<DynamicStoredProcedureInfo> StoredProcedures { get; set; } = new();
    }

    /// <summary>
    /// Dynamic table information for schema exploration
    /// </summary>
    public class DynamicTableInfo
    {
        public string TableName { get; set; } = string.Empty;
        public string SchemaName { get; set; } = string.Empty;
        public DynamicTableType TableType { get; set; }
        public int RowCount { get; set; }
        public DateTime? CreateDate { get; set; }
        public DateTime? ModifyDate { get; set; }
        public List<DynamicColumnInfo> Columns { get; set; } = new();
    }

    /// <summary>
    /// Dynamic stored procedure information
    /// </summary>
    public class DynamicStoredProcedureInfo
    {
        public string ProcedureName { get; set; } = string.Empty;
        public string SchemaName { get; set; } = string.Empty;
        public DateTime? CreateDate { get; set; }
        public DateTime? ModifyDate { get; set; }
        public List<DynamicParameterInfo> Parameters { get; set; } = new();
        public List<DynamicColumnInfo> ResultColumns { get; set; } = new();
    }

    /// <summary>
    /// Dynamic parameter information for stored procedures
    /// </summary>
    public class DynamicParameterInfo
    {
        public string ParameterName { get; set; } = string.Empty;
        public string DataType { get; set; } = string.Empty;
        public bool IsOutput { get; set; }
        public bool HasDefault { get; set; }
        public object? DefaultValue { get; set; }
        public int? MaxLength { get; set; }
    }
}
