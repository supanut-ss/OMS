using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using System.Data.Common;

namespace ApiCore.Controllers.Transaction
{
    [Route("api/inventory-viewer")]
    [ApiController]
    public class InventoryViewerController : ControllerResponse
    {
        private static readonly IReadOnlyDictionary<string, InventoryViewerTabDefinition> Tabs =
            new Dictionary<string, InventoryViewerTabDefinition>(StringComparer.OrdinalIgnoreCase)
            {
                ["item"] = new() { Key = "item", Label = "By Item", ViewName = "v_inv_viewer_inventory" },
                ["serial"] = new() { Key = "serial", Label = "By Serial", ViewName = "v_inv_viewer_inventory_serial" },
                ["itemSummary"] = new() { Key = "itemSummary", Label = "By Item Summary", ViewName = "v_inv_viewer_inventory_sum_by_item" },
                ["lotSummary"] = new() { Key = "lotSummary", Label = "By Lot Summary", ViewName = "v_inv_viewer_inventory_sum_by_lot" },
                ["minStock"] = new() { Key = "minStock", Label = "By Min Stock", ViewName = "v_inv_viewer_inventory_min_stock" },
            };

        private readonly ISqlConnectionFactory _connectionFactory;

        public InventoryViewerController(ISqlConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }

        [HttpGet("tabs")]
        [ProducesResponseType(typeof(IEnumerable<InventoryViewerTabDefinition>), 200)]
        public IActionResult GetTabs()
        {
            return AccessResponseDataSuccess("success", Tabs.Values);
        }

        [HttpGet("filter-options")]
        [ProducesResponseType(typeof(InventoryViewerFilterOptionsResponse), 200)]
        public async Task<IActionResult> GetFilterOptions()
        {
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();

            var response = new InventoryViewerFilterOptionsResponse
            {
                Warehouse = await LoadFilterOptionsAsync(
                    connection,
                    tableName: "t_inv_warehouse",
                    codeColumn: "warehouse",
                    defaultLabel: "All Warehouses"),
                Owner = await LoadFilterOptionsAsync(
                    connection,
                    tableName: "t_inv_owner",
                    codeColumn: "owner_code",
                    defaultLabel: "All Owners"),
                Category = await LoadFilterOptionsAsync(
                    connection,
                    tableName: "t_inv_category",
                    codeColumn: "item_category",
                    defaultLabel: "All Categories"),
                InventoryStatus = await LoadFilterOptionsAsync(
                    connection,
                    tableName: "t_com_combobox_item",
                    codeColumn: "value_member",
                    defaultLabel: "All Statuses",
                    whereClause: $"WHERE {_connectionFactory.Dialect.QuoteIdentifier("group_name")} = @GroupName",
                    parameters: new { GroupName = "inventory_status" }),
            };

            return AccessResponseDataSuccess("success", response);
        }

        [HttpPost("search")]
        [ProducesResponseType(typeof(InventoryViewerSearchResponse), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Search([FromBody] InventoryViewerSearchRequest? request)
        {
            try
            {
                var activeTab = string.IsNullOrWhiteSpace(request?.TabKey) ? "serial" : request.TabKey;
                if (!Tabs.TryGetValue(activeTab, out var tabDefinition))
                {
                    return ResponseError($"Unsupported tab '{activeTab}'");
                }

                IEnumerable<Dictionary<string, object?>> rows = await LoadRowsFromViewAsync(tabDefinition.ViewName);

                if (request?.Filters is { Count: > 0 })
                {
                    foreach (var filter in request.Filters)
                    {
                        if (string.IsNullOrWhiteSpace(filter.Field) || string.IsNullOrWhiteSpace(filter.Value))
                        {
                            continue;
                        }

                        var filterValue = filter.Value.Trim();
                        var operatorName = string.IsNullOrWhiteSpace(filter.Operator) ? "contains" : filter.Operator;
                        rows = rows.Where(row => MatchesFilter(row, filter.Field, operatorName, filterValue));
                    }
                }

                if (!string.IsNullOrWhiteSpace(request?.SearchText))
                {
                    var query = request.SearchText.Trim();
                    rows = rows.Where(row => row.Values.Any(value =>
                        value?.ToString()?.Contains(query, StringComparison.OrdinalIgnoreCase) == true));
                }

                var resultRows = rows.ToList();
                var response = new InventoryViewerSearchResponse
                {
                    TabKey = tabDefinition.Key,
                    TabLabel = tabDefinition.Label,
                    ViewName = tabDefinition.ViewName,
                    RowCount = resultRows.Count,
                    Rows = resultRows,
                };

                return AccessResponseDataSuccess("success", response);
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        private async Task<IEnumerable<Dictionary<string, object?>>> LoadRowsFromViewAsync(string viewName)
        {
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var resolvedViewName = await ResolveViewNameAsync(connection, viewName);
            var rows = await connection.QueryAsync($"SELECT * FROM {resolvedViewName}");
            return rows.Select(ToDictionary).ToList();
        }

        private async Task<IReadOnlyList<InventoryViewerFilterOption>> LoadFilterOptionsAsync(
            DbConnection connection,
            string tableName,
            string codeColumn,
            string defaultLabel,
            string? whereClause = null,
            object? parameters = null)
        {
            var resolvedTableName = await ResolveTableNameAsync(connection, tableName);
            var quotedCodeColumn = _connectionFactory.Dialect.QuoteIdentifier(codeColumn);
            var conditions = new List<string>();
            if (!string.IsNullOrWhiteSpace(whereClause))
            {
                conditions.Add(whereClause.Trim().Replace("WHERE ", string.Empty, StringComparison.OrdinalIgnoreCase));
            }

            conditions.Add($"{quotedCodeColumn} IS NOT NULL");
            conditions.Add($"LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), {quotedCodeColumn}))) <> ''");
            var filterClause = $"WHERE {string.Join(" AND ", conditions)}";
            var query = $@"
SELECT DISTINCT
    {quotedCodeColumn}
FROM {resolvedTableName}
{filterClause}
ORDER BY {quotedCodeColumn}";

            var values = await connection.QueryAsync<string>(query, parameters);
            var options = values
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => new InventoryViewerFilterOption
                {
                    Code = value,
                    Name = value,
                })
                .ToList();

            options.Insert(0, new InventoryViewerFilterOption { Code = string.Empty, Name = defaultLabel });
            return options;
        }

        private async Task<string> ResolveViewNameAsync(DbConnection connection, string viewName)
        {
            const string resolveViewSql = @"
SELECT TOP 1 TABLE_SCHEMA
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_NAME = @ViewName
ORDER BY CASE
    WHEN TABLE_SCHEMA = 'dbo' THEN 0
    WHEN TABLE_SCHEMA = 'tmt' THEN 1
    WHEN TABLE_SCHEMA = 'public' THEN 2
    ELSE 3
END,
TABLE_SCHEMA";

            var schemaName = await connection.QueryFirstOrDefaultAsync<string>(resolveViewSql, new
            {
                ViewName = viewName,
            });

            return string.IsNullOrWhiteSpace(schemaName)
                ? _connectionFactory.Dialect.QuoteIdentifier(viewName)
                : _connectionFactory.Dialect.QuoteTable(schemaName, viewName);
        }

        private async Task<string> ResolveTableNameAsync(DbConnection connection, string tableName)
        {
            const string resolveTableSql = @"
SELECT TOP 1 TABLE_SCHEMA
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = @TableName
ORDER BY CASE
    WHEN TABLE_SCHEMA = 'dbo' THEN 0
    WHEN TABLE_SCHEMA = 'tmt' THEN 1
    WHEN TABLE_SCHEMA = 'public' THEN 2
    ELSE 3
END,
TABLE_SCHEMA";

            var schemaName = await connection.QueryFirstOrDefaultAsync<string>(resolveTableSql, new
            {
                TableName = tableName,
            });

            return string.IsNullOrWhiteSpace(schemaName)
                ? _connectionFactory.Dialect.QuoteIdentifier(tableName)
                : _connectionFactory.Dialect.QuoteTable(schemaName, tableName);
        }

        private static Dictionary<string, object?> ToDictionary(object row)
        {
            if (row is IDictionary<string, object> dictionary)
            {
                return dictionary.ToDictionary(
                    item => item.Key,
                    item => item.Value == DBNull.Value ? null : item.Value,
                    StringComparer.OrdinalIgnoreCase);
            }

            return row.GetType()
                .GetProperties()
                .ToDictionary(
                    property => property.Name,
                    property =>
                    {
                        var value = property.GetValue(row);
                        return value == DBNull.Value ? null : value;
                    },
                    StringComparer.OrdinalIgnoreCase);
        }

        private static bool MatchesFilter(
            IReadOnlyDictionary<string, object?> row,
            string field,
            string operatorName,
            string filterValue)
        {
            row.TryGetValue(field, out var cellValue);
            var text = cellValue?.ToString() ?? string.Empty;

            return operatorName.ToLowerInvariant() switch
            {
                "equals" => string.Equals(text, filterValue, StringComparison.OrdinalIgnoreCase),
                "startswith" => text.StartsWith(filterValue, StringComparison.OrdinalIgnoreCase),
                "endswith" => text.EndsWith(filterValue, StringComparison.OrdinalIgnoreCase),
                "isempty" => string.IsNullOrWhiteSpace(text),
                "isnotempty" => !string.IsNullOrWhiteSpace(text),
                _ => text.Contains(filterValue, StringComparison.OrdinalIgnoreCase),
            };
        }
    }

    public class InventoryViewerSearchRequest
    {
        public string TabKey { get; set; } = "serial";

        public string? SearchText { get; set; }

        public List<InventoryViewerFilterRequest> Filters { get; set; } = new();
    }

    public class InventoryViewerFilterRequest
    {
        public string Field { get; set; } = string.Empty;

        public string? Operator { get; set; }

        public string? Value { get; set; }
    }

    public class InventoryViewerSearchResponse
    {
        public string TabKey { get; set; } = string.Empty;

        public string TabLabel { get; set; } = string.Empty;

        public string ViewName { get; set; } = string.Empty;

        public int RowCount { get; set; }

        public IReadOnlyList<Dictionary<string, object?>> Rows { get; set; } = Array.Empty<Dictionary<string, object?>>();
    }

    public class InventoryViewerFilterOptionsResponse
    {
        public IReadOnlyList<InventoryViewerFilterOption> Warehouse { get; set; } = Array.Empty<InventoryViewerFilterOption>();

        public IReadOnlyList<InventoryViewerFilterOption> Owner { get; set; } = Array.Empty<InventoryViewerFilterOption>();

        public IReadOnlyList<InventoryViewerFilterOption> Category { get; set; } = Array.Empty<InventoryViewerFilterOption>();

        public IReadOnlyList<InventoryViewerFilterOption> InventoryStatus { get; set; } = Array.Empty<InventoryViewerFilterOption>();
    }

    public class InventoryViewerFilterOption
    {
        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;
    }

    public class InventoryViewerTabDefinition
    {
        public string Key { get; set; } = string.Empty;

        public string Label { get; set; } = string.Empty;

        public string ViewName { get; set; } = string.Empty;
    }
}
