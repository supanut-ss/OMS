using System.Data;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using ReportViewer.Models;

namespace ReportViewer.Services
{
    public class ReportDataService
    {
        private static readonly Regex PlaceholderRegex = new(@"\{[^}]+\}", RegexOptions.Compiled);
        private static readonly Regex WhereRegex = new(@"\bWHERE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex TrailingOrderByRegex = new(@"\bORDER\s+BY\b[\s\S]*$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = null,
            WriteIndented = false
        };

        private readonly string _connectionString;
        private readonly string _appServerPath;

        public ReportDataService(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _connectionString = FirstConfigured(
                configuration["ReportViewer:ReportDataConnectionString"],
                configuration.GetConnectionString("ReportDataDb"),
                configuration.GetConnectionString("ReportConfigDb"));

            _appServerPath = configuration["ReportViewer:AppServerPath"]
                ?? Path.Combine(environment.ContentRootPath, "Reports");
        }

        private static string FirstConfigured(params string?[] values)
        {
            return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;
        }

        public string ExecuteSqlToJson(ReportConfig config, Dictionary<string, string>? parameters)
        {
            var rows = ExecuteSql(config, parameters);
            if (rows.Count == 0)
                throw new InvalidOperationException("No report data found for the selected filters.");

            var sampleJson = ResolveSampleJson(config);
            var output = string.IsNullOrWhiteSpace(sampleJson)
                ? rows
                : ShapeRowsBySample(rows, sampleJson);

            return JsonSerializer.Serialize(output, JsonOptions);
        }

        private List<Dictionary<string, object?>> ExecuteSql(ReportConfig config, Dictionary<string, string>? parameters)
        {
            if (string.IsNullOrWhiteSpace(config.SqlCommand))
                throw new ArgumentException("sql_command is not configured for report: " + config.ReportCode);
            if (string.IsNullOrWhiteSpace(_connectionString))
                throw new InvalidOperationException("Report data connection string is not configured.");

            var sql = BuildSqlCommand(config, parameters ?? new Dictionary<string, string>());
            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(sql, conn)
            {
                CommandType = CommandType.Text,
                CommandTimeout = 300
            };

            conn.Open();
            using var reader = cmd.ExecuteReader();
            var rows = new List<Dictionary<string, object?>>();

            while (reader.Read())
            {
                var row = new Dictionary<string, object?>(reader.FieldCount, StringComparer.OrdinalIgnoreCase);
                for (var i = 0; i < reader.FieldCount; i++)
                    row[reader.GetName(i)] = reader.IsDBNull(i) ? null : ConvertValue(reader.GetValue(i));
                rows.Add(row);
            }

            return rows;
        }

        private static string BuildSqlCommand(ReportConfig config, Dictionary<string, string> parameters)
        {
            var sql = config.SqlCommand ?? string.Empty;
            if (parameters.Count == 0)
                return PlaceholderRegex.Replace(sql, "");

            var objectType = (config.SqlObjectType ?? "").Trim();
            if (parameters.TryGetValue("FilterConditionString", out var filterCondition) &&
                !string.IsNullOrWhiteSpace(filterCondition) &&
                (objectType.Equals("View", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(config.ReportCode, "StickerInboundItem", StringComparison.OrdinalIgnoreCase)))
            {
                sql = AppendFilterCondition(sql, filterCondition);
            }

            foreach (var parameter in parameters)
            {
                var safeValue = (parameter.Value ?? "").Replace("'", "''");
                sql = sql.Replace("{" + parameter.Key + "}", safeValue);
            }

            return PlaceholderRegex.Replace(sql, "");
        }

        private static string AppendFilterCondition(string sql, string filterCondition)
        {
            sql = sql.TrimEnd();
            if (sql.EndsWith(";"))
                sql = sql[..^1].TrimEnd();

            var orderBy = "";
            var orderMatch = TrailingOrderByRegex.Match(sql);
            if (orderMatch.Success)
            {
                orderBy = " " + orderMatch.Value;
                sql = sql[..orderMatch.Index].TrimEnd();
            }

            sql += WhereRegex.IsMatch(sql)
                ? " AND " + filterCondition
                : " WHERE " + filterCondition;

            return sql + orderBy;
        }

        private string? ResolveSampleJson(ReportConfig config)
        {
            if (!string.IsNullOrWhiteSpace(config.JasperSampleJson))
                return config.JasperSampleJson;

            if (string.IsNullOrWhiteSpace(config.JasperSampleJsonPath))
            {
                if (string.IsNullOrWhiteSpace(config.ReportCode))
                    return null;

                var fallbackPath = Path.Combine(_appServerPath, "jasper", config.ReportCode + ".json");
                return File.Exists(fallbackPath) ? File.ReadAllText(fallbackPath) : null;
            }

            var path = config.JasperSampleJsonPath.Replace("@app_server_path", _appServerPath);
            if (!Path.IsPathRooted(path))
                path = Path.Combine(_appServerPath, "jasper", path);

            if (!File.Exists(path))
                throw new FileNotFoundException("Jasper sample JSON file not found: " + path);

            return File.ReadAllText(path);
        }

        private static object? ShapeRowsBySample(List<Dictionary<string, object?>> rows, string sampleJson)
        {
            using var sampleDoc = JsonDocument.Parse(sampleJson, new JsonDocumentOptions
            {
                AllowTrailingCommas = true,
                CommentHandling = JsonCommentHandling.Skip
            });

            var fieldMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (sampleDoc.RootElement.TryGetProperty("_field_map", out var fieldMapElement) &&
                fieldMapElement.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in fieldMapElement.EnumerateObject())
                {
                    if (prop.Value.ValueKind == JsonValueKind.String)
                        fieldMap[prop.Name] = prop.Value.GetString()!;
                }
            }

            return MapElement(sampleDoc.RootElement, rows, rows.FirstOrDefault(), Array.Empty<string>(), fieldMap);
        }

        private static object? MapElement(
            JsonElement sample,
            List<Dictionary<string, object?>> rows,
            Dictionary<string, object?>? currentRow,
            IReadOnlyList<string> path,
            IReadOnlyDictionary<string, string> fieldMap)
        {
            return sample.ValueKind switch
            {
                JsonValueKind.Object => MapObject(sample, rows, currentRow, path, fieldMap),
                JsonValueKind.Array => MapArray(sample, rows, path, fieldMap),
                _ => CoerceSampleValue(sample)
            };
        }

        private static Dictionary<string, object?> MapObject(
            JsonElement sampleObject,
            List<Dictionary<string, object?>> rows,
            Dictionary<string, object?>? currentRow,
            IReadOnlyList<string> path,
            IReadOnlyDictionary<string, string> fieldMap)
        {
            var output = new Dictionary<string, object?>();
            foreach (var property in sampleObject.EnumerateObject())
            {
                if (property.Name.StartsWith('_'))
                    continue;

                var propertyPath = path.Concat(new[] { property.Name }).ToArray();
                output[property.Name] = property.Value.ValueKind switch
                {
                    JsonValueKind.Object => MapObject(property.Value, rows, rows.FirstOrDefault(), propertyPath, fieldMap),
                    JsonValueKind.Array => MapArray(property.Value, rows, propertyPath, fieldMap),
                    _ => ResolveScalarValue(property.Name, propertyPath, property.Value, currentRow, rows, fieldMap)
                };
            }

            return output;
        }

        private static List<object?> MapArray(
            JsonElement sampleArray,
            List<Dictionary<string, object?>> rows,
            IReadOnlyList<string> path,
            IReadOnlyDictionary<string, string> fieldMap)
        {
            var itemTemplate = sampleArray.EnumerateArray().FirstOrDefault();
            if (itemTemplate.ValueKind == JsonValueKind.Undefined)
                return new List<object?>();

            return rows
                .Select(row => itemTemplate.ValueKind == JsonValueKind.Object
                    ? MapObject(itemTemplate, rows, row, path, fieldMap)
                    : MapElement(itemTemplate, rows, row, path, fieldMap))
                .Cast<object?>()
                .ToList();
        }

        private static object? ResolveScalarValue(
            string propertyName,
            IReadOnlyList<string> path,
            JsonElement sampleValue,
            Dictionary<string, object?>? currentRow,
            List<Dictionary<string, object?>> rows,
            IReadOnlyDictionary<string, string> fieldMap)
        {
            if (TryGetRowValue(currentRow, propertyName, path, fieldMap, out var rowValue))
                return CoerceValue(propertyName, path, rowValue, sampleValue);

            if (string.Equals(propertyName, "report_title", StringComparison.OrdinalIgnoreCase))
                return CoerceSampleValue(sampleValue);

            if (TryGetSummaryValue(propertyName, path, sampleValue, rows, out var summaryValue))
                return summaryValue;

            return GetEmptyValue(propertyName, path, sampleValue);
        }

        private static bool TryGetRowValue(
            Dictionary<string, object?>? row,
            string propertyName,
            IReadOnlyList<string> path,
            IReadOnlyDictionary<string, string> fieldMap,
            out object? value)
        {
            value = null;
            if (row == null)
                return false;

            foreach (var candidate in GetColumnCandidates(propertyName, path, fieldMap))
            {
                if (row.TryGetValue(candidate, out value))
                    return true;
            }

            return false;
        }

        private static IEnumerable<string> GetColumnCandidates(
            string propertyName,
            IReadOnlyList<string> path,
            IReadOnlyDictionary<string, string> fieldMap)
        {
            yield return propertyName;
            if (fieldMap.TryGetValue(propertyName, out var mapped))
                yield return mapped;

            var fullPath = string.Join("_", path);
            if (!string.Equals(fullPath, propertyName, StringComparison.OrdinalIgnoreCase))
                yield return fullPath;

            if (path.Count > 1)
            {
                var prefixed = $"{path[^2]}_{propertyName}";
                yield return prefixed;
                if (fieldMap.TryGetValue(prefixed, out var prefixedMapped))
                    yield return prefixedMapped;
            }
        }

        private static bool TryGetSummaryValue(
            string propertyName,
            IReadOnlyList<string> path,
            JsonElement sampleValue,
            List<Dictionary<string, object?>> rows,
            out object? value)
        {
            value = null;
            if (rows.Count == 0 ||
                sampleValue.ValueKind != JsonValueKind.Number ||
                path.Count == 0 ||
                !string.Equals(path[0], "summary", StringComparison.OrdinalIgnoreCase) ||
                !propertyName.StartsWith("total_", StringComparison.OrdinalIgnoreCase))
                return false;

            var sourceColumn = propertyName["total_".Length..];
            decimal total = 0;
            var matched = false;

            foreach (var row in rows)
            {
                if (!row.TryGetValue(sourceColumn, out var rawValue) || rawValue == null)
                    continue;

                if (decimal.TryParse(rawValue.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var number) ||
                    decimal.TryParse(rawValue.ToString(), NumberStyles.Any, CultureInfo.CurrentCulture, out number))
                {
                    total += number;
                    matched = true;
                }
            }

            if (!matched)
                return false;

            value = total;
            return true;
        }

        private static object? ConvertValue(object value)
        {
            return value switch
            {
                DateTime dt => dt.ToString("yyyy-MM-dd"),
                DateOnly d => d.ToString("yyyy-MM-dd"),
                TimeOnly t => t.ToString("HH:mm:ss"),
                byte[] b => Convert.ToBase64String(b),
                _ => value
            };
        }

        private static object? CoerceValue(
            string propertyName,
            IReadOnlyList<string> path,
            object? value,
            JsonElement sampleValue)
        {
            if (value == null)
                return GetEmptyValue(propertyName, path, sampleValue);

            if (IsDateField(propertyName, path) && string.IsNullOrWhiteSpace(value.ToString()))
                return null;

            return sampleValue.ValueKind switch
            {
                JsonValueKind.Number when decimal.TryParse(value.ToString(), out var number) => number,
                JsonValueKind.True or JsonValueKind.False when bool.TryParse(value.ToString(), out var boolean) => boolean,
                JsonValueKind.String => value.ToString(),
                _ => value
            };
        }

        private static object? CoerceSampleValue(JsonElement sampleValue)
        {
            if (sampleValue.ValueKind == JsonValueKind.String &&
                string.Equals(sampleValue.GetString(), "string", StringComparison.OrdinalIgnoreCase))
                return string.Empty;

            return sampleValue.ValueKind switch
            {
                JsonValueKind.String => sampleValue.GetString(),
                JsonValueKind.Number => sampleValue.TryGetInt64(out var integer)
                    ? integer
                    : sampleValue.GetDecimal(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => sampleValue.GetRawText()
            };
        }

        private static object? GetEmptyValue(JsonElement sampleValue)
        {
            return sampleValue.ValueKind switch
            {
                JsonValueKind.Number => 0,
                JsonValueKind.String => string.Empty,
                JsonValueKind.True or JsonValueKind.False => false,
                _ => null
            };
        }

        private static object? GetEmptyValue(
            string propertyName,
            IReadOnlyList<string> path,
            JsonElement sampleValue)
        {
            if (IsDateField(propertyName, path))
                return null;

            return GetEmptyValue(sampleValue);
        }

        private static bool IsDateField(string propertyName, IReadOnlyList<string> path)
        {
            var candidates = path.Append(propertyName);
            return candidates.Any(part =>
                part.Contains("date", StringComparison.OrdinalIgnoreCase) ||
                part.Contains("expiry", StringComparison.OrdinalIgnoreCase));
        }
    }
}
