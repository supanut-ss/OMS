using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Base
{
    /// <summary>
    /// MUI X Data Grid server-side data request parameters
    /// Based on GridGetRowsParams interface
    /// </summary>
    public class DataGridRequest
    {
        /// <summary>
        /// Starting index for data fetching (0-based)
        /// </summary>
        [Range(0, int.MaxValue)]
        public int Start { get; set; } = 0;

        /// <summary>
        /// Ending index for data fetching (exclusive)
        /// </summary>
        [Range(1, int.MaxValue)]
        public int End { get; set; } = 100;

        /// <summary>
        /// Sorting configuration
        /// </summary>
        public List<DataGridSortModel> SortModel { get; set; } = new();

        /// <summary>
        /// Filtering configuration
        /// </summary>
        public DataGridFilterModel FilterModel { get; set; } = new();

        /// <summary>
        /// Group keys for hierarchical data (optional)
        /// </summary>
        public List<string> GroupKeys { get; set; } = new();

        /// <summary>
        /// Get sort field for SQL query (defaults to first sort field or Id)
        /// </summary>
        public string GetSortField()
        {
            return SortModel?.FirstOrDefault()?.Field ?? "Id";
        }

        /// <summary>
        /// Get sort order for SQL query (defaults to ASC)
        /// </summary>
        public string GetSortOrder()
        {
            return SortModel?.FirstOrDefault()?.Sort?.ToUpper() ?? "ASC";
        }
    }

    /// <summary>
    /// Sort model for MUI X Data Grid
    /// </summary>
    public class DataGridSortModel
    {
        /// <summary>
        /// Field name to sort by
        /// </summary>
        [Required]
        public string Field { get; set; } = string.Empty;

        /// <summary>
        /// Sort direction: "asc" or "desc"
        /// </summary>
        [Required]
        public string Sort { get; set; } = "asc";
    }

    /// <summary>
    /// Filter model for MUI X Data Grid
    /// </summary>
    public class DataGridFilterModel
    {
        /// <summary>
        /// List of filter items
        /// </summary>
        public List<DataGridFilterItem> Items { get; set; } = new();

        /// <summary>
        /// Logic operator: "and" or "or"
        /// </summary>
        public string LogicOperator { get; set; } = "and";

        /// <summary>
        /// Quick filter value for global search (standard MUI format)
        /// </summary>
        public string? QuickFilterValues { get; set; }

        /// <summary>
        /// Quick filter value for BSDataGrid compatibility
        /// </summary>
        public string? QuickFilter { get; set; }
    }

    /// <summary>
    /// Individual filter item
    /// </summary>
    public class DataGridFilterItem
    {
        /// <summary>
        /// Field name to filter
        /// </summary>
        [Required]
        public string Field { get; set; } = string.Empty;

        /// <summary>
        /// Filter operator (contains, equals, startsWith, endsWith, etc.)
        /// </summary>
        [Required]
        public string Operator { get; set; } = "contains";

        /// <summary>
        /// Filter value
        /// </summary>
        public object? Value { get; set; }

        /// <summary>
        /// Unique identifier for the filter
        /// </summary>
        public string? Id { get; set; }
    }

    /// <summary>
    /// MUI X Data Grid server-side data response
    /// Based on GridGetRowsResponse interface
    /// </summary>
    /// <typeparam name="T">Type of data rows</typeparam>
    public class DataGridResponse<T>
    {
        /// <summary>
        /// Array of data rows
        /// </summary>
        public List<T> Rows { get; set; } = new();

        /// <summary>
        /// Total number of rows available on the server (for pagination)
        /// </summary>
        public int RowCount { get; set; }

        /// <summary>
        /// Success status
        /// </summary>
        public bool Success { get; set; } = true;

        /// <summary>
        /// Response message
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Additional metadata for debugging
        /// </summary>
        public DataGridMetadata? Metadata { get; set; }
    }

    /// <summary>
    /// Additional metadata for Data Grid response
    /// </summary>
    public class DataGridMetadata
    {
        /// <summary>
        /// Current page information
        /// </summary>
        public int Start { get; set; }
        public int End { get; set; }
        public int PageSize { get; set; }
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }

        /// <summary>
        /// Applied filters and sorting
        /// </summary>
        public List<DataGridSortModel> AppliedSort { get; set; } = new();
        public List<DataGridFilterItem> AppliedFilters { get; set; } = new();

        /// <summary>
        /// Performance metrics
        /// </summary>
        public long QueryExecutionTimeMs { get; set; }
        public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Customer-specific DataGrid request - uses standard MUI X DataGrid properties
    /// </summary>
    public class CustomerDataGridRequest : DataGridRequest
    {
        // All filtering is now handled by standard MUI X DataGrid properties:
        // - FilterModel.Items for field-specific filters  
        // - FilterModel.QuickFilterValues for global search
        // - SortModel for sorting
        // - Start/End for pagination
    }
}
