using Microsoft.Data.SqlClient;
using ReportViewer.Models;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ReportViewer.Services
{
    public class ReportConfigService
    {
        private static readonly Regex SafeSqlFieldRegex = new(@"^[A-Za-z0-9_\.\[\]\(\),\s]+$", RegexOptions.Compiled);
        private static readonly HashSet<string> AllowedOperators = new(StringComparer.OrdinalIgnoreCase)
        {
            "=",
            "<>",
            ">",
            ">=",
            "<",
            "<=",
            "LIKE",
            "IN"
        };

        private readonly string _connectionString;

        public ReportConfigService(IConfiguration configuration)
        {
            _connectionString = FirstConfigured(
                configuration["ReportViewer:ReportConfigConnectionString"],
                configuration.GetConnectionString("ReportConfigDb"));
        }

        private static string FirstConfigured(params string?[] values)
        {
            return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;
        }

        public ReportConfig GetConfig(string reportCode)
        {
            if (string.IsNullOrWhiteSpace(reportCode))
                throw new ArgumentException("report_code is required", nameof(reportCode));
            if (string.IsNullOrWhiteSpace(_connectionString))
                throw new InvalidOperationException("ReportConfigDb connection string is not configured.");

            const string sql = @"
                SELECT
                    report_code, report_name, report_type, is_print_by_server,
                    printer_name, report_path, bartender_data_path, bartender_trigger_path,
                    html_page_size, rdlc_dataset_name, ssrs_server_url, ssrs_report_path,
                    ssrs_username, ssrs_password, ssrs_domain_name,
                    jasper_output_format, jasper_sample_json_path, jasper_sample_json, run_as,
                    json_parameter, sql_object_type, sql_command, is_active
                FROM rpt.t_com_config_report
                WHERE report_code = @report_code
                  AND UPPER(CONVERT(NVARCHAR(10), is_active)) IN ('YES', '1', 'TRUE')";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@report_code", reportCode);
            conn.Open();

            using var reader = cmd.ExecuteReader();
            if (!reader.Read())
                throw new InvalidOperationException("Report config not found for code: " + reportCode);

            return new ReportConfig
            {
                ReportCode = GetString(reader, "report_code"),
                ReportName = GetString(reader, "report_name"),
                ReportType = GetString(reader, "report_type"),
                IsPrintByServer = GetString(reader, "is_print_by_server"),
                PrinterName = GetString(reader, "printer_name"),
                ReportPath = GetString(reader, "report_path"),
                BartenderDataPath = GetString(reader, "bartender_data_path"),
                BartenderTriggerPath = GetString(reader, "bartender_trigger_path"),
                HtmlPageSize = GetString(reader, "html_page_size"),
                RdlcDatasetName = GetString(reader, "rdlc_dataset_name"),
                SsrsServerUrl = GetString(reader, "ssrs_server_url"),
                SsrsReportPath = GetString(reader, "ssrs_report_path"),
                SsrsUsername = GetString(reader, "ssrs_username"),
                SsrsPassword = GetString(reader, "ssrs_password"),
                SsrsDomainName = GetString(reader, "ssrs_domain_name"),
                JasperOutputFormat = GetString(reader, "jasper_output_format"),
                JasperSampleJsonPath = GetString(reader, "jasper_sample_json_path"),
                JasperSampleJson = GetString(reader, "jasper_sample_json"),
                RunAs = GetString(reader, "run_as"),
                JsonParameter = GetString(reader, "json_parameter"),
                SqlObjectType = GetString(reader, "sql_object_type"),
                SqlCommand = GetString(reader, "sql_command"),
                IsActive = GetString(reader, "is_active")
            };
        }

        public List<ReportListItem> GetActiveReports()
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
                throw new InvalidOperationException("ReportConfigDb connection string is not configured.");

            const string sql = @"
                SELECT
                    report_code,
                    report_name,
                    report_type,
                    jasper_output_format
                FROM rpt.t_com_config_report
                WHERE UPPER(CONVERT(NVARCHAR(10), is_active)) IN ('YES', '1', 'TRUE')
                ORDER BY report_name, report_code";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(sql, conn);
            conn.Open();

            using var reader = cmd.ExecuteReader();
            var reports = new List<ReportListItem>();
            while (reader.Read())
            {
                reports.Add(new ReportListItem
                {
                    ReportCode = GetString(reader, "report_code"),
                    ReportName = GetString(reader, "report_name"),
                    ReportType = GetString(reader, "report_type"),
                    OutputFormat = GetString(reader, "jasper_output_format")
                });
            }

            return reports;
        }

        public List<ReportFilterConfig> GetFilters(string reportCode)
        {
            return GetFilters(reportCode, includeOptions: true);
        }

        private List<ReportFilterConfig> GetFilters(string reportCode, bool includeOptions)
        {
            if (string.IsNullOrWhiteSpace(reportCode))
                throw new ArgumentException("report_code is required", nameof(reportCode));
            if (string.IsNullOrWhiteSpace(_connectionString))
                throw new InvalidOperationException("ReportConfigDb connection string is not configured.");

            const string sql = @"
                SELECT
                    id,
                    report_code,
                    parameter_name,
                    label,
                    input_type,
                    data_type,
                    sql_field_name,
                    operator,
                    default_value,
                    placeholder,
                    option_source_type,
                    option_json,
                    option_sql,
                    is_required,
                    sort_order
                FROM rpt.t_com_config_report_filter
                WHERE report_code = @report_code
                  AND is_active = 1
                ORDER BY sort_order, id";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@report_code", reportCode);
            conn.Open();

            var filters = new List<ReportFilterConfig>();
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    filters.Add(new ReportFilterConfig
                    {
                        Id = GetInt(reader, "id"),
                        ReportCode = GetString(reader, "report_code"),
                        ParameterName = GetString(reader, "parameter_name"),
                        Label = GetString(reader, "label"),
                        InputType = GetString(reader, "input_type"),
                        DataType = GetString(reader, "data_type"),
                        SqlFieldName = GetString(reader, "sql_field_name"),
                        Operator = GetString(reader, "operator"),
                        DefaultValue = GetString(reader, "default_value"),
                        Placeholder = GetString(reader, "placeholder"),
                        OptionSourceType = GetString(reader, "option_source_type"),
                        OptionJson = GetString(reader, "option_json"),
                        OptionSql = GetString(reader, "option_sql"),
                        IsRequired = GetBool(reader, "is_required"),
                        SortOrder = GetInt(reader, "sort_order")
                    });
                }
            }

            if (includeOptions)
            {
                foreach (var filter in filters)
                {
                    filter.Options = LoadOptions(conn, filter);
                }
            }

            return filters;
        }

        public Dictionary<string, string> BuildReportParameters(
            string reportCode,
            Dictionary<string, string>? rawParameters)
        {
            var parameters = rawParameters == null
                ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, string>(rawParameters, StringComparer.OrdinalIgnoreCase);

            parameters.Remove("FilterConditionString");

            var filters = GetFilters(reportCode, includeOptions: false);
            var conditions = new List<string>();

            foreach (var filter in filters)
            {
                if (string.IsNullOrWhiteSpace(filter.ParameterName) ||
                    string.IsNullOrWhiteSpace(filter.SqlFieldName))
                    continue;

                if (!parameters.TryGetValue(filter.ParameterName, out var value) &&
                    !parameters.TryGetValue(filter.SqlFieldName, out value))
                    continue;

                if (string.IsNullOrWhiteSpace(value))
                    continue;

                var fieldName = filter.SqlFieldName.Trim();
                if (!SafeSqlFieldRegex.IsMatch(fieldName))
                    throw new InvalidOperationException("Unsafe sql_field_name in report filter mapping: " + filter.ParameterName);

                var operatorName = string.IsNullOrWhiteSpace(filter.Operator) ? "=" : filter.Operator.Trim().ToUpperInvariant();
                if (!AllowedOperators.Contains(operatorName))
                    throw new InvalidOperationException("Unsupported report filter operator: " + filter.Operator);

                if (operatorName == "LIKE")
                {
                    conditions.Add($"{fieldName} LIKE {QuoteSqlValue("%" + value + "%", "string")}");
                    continue;
                }

                if (operatorName == "IN")
                {
                    var values = value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .Select(item => QuoteSqlValue(item, filter.DataType))
                        .Where(item => !string.IsNullOrWhiteSpace(item))
                        .ToArray();

                    if (values.Length > 0)
                        conditions.Add($"{fieldName} IN ({string.Join(",", values)})");
                    continue;
                }

                var sqlValue = QuoteSqlValue(value, filter.DataType);
                if (!string.IsNullOrWhiteSpace(sqlValue))
                    conditions.Add($"{fieldName} {operatorName} {sqlValue}");
            }

            if (conditions.Count > 0)
                parameters["FilterConditionString"] = string.Join(" AND ", conditions);

            return parameters;
        }

        private List<ReportFilterOption> LoadOptions(SqlConnection conn, ReportFilterConfig filter)
        {
            var options = ParseOptionJson(filter.OptionJson);
            if (options.Count > 0 || string.IsNullOrWhiteSpace(filter.OptionSql))
                return options;

            using var cmd = new SqlCommand(filter.OptionSql, conn)
            {
                CommandTimeout = 120
            };

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var valueOrdinal = TryGetOrdinal(reader, "value");
                var labelOrdinal = TryGetOrdinal(reader, "label");
                if (valueOrdinal < 0)
                    valueOrdinal = 0;
                if (labelOrdinal < 0)
                    labelOrdinal = reader.FieldCount > 1 ? 1 : valueOrdinal;

                var value = reader.IsDBNull(valueOrdinal) ? null : reader.GetValue(valueOrdinal).ToString();
                var label = reader.IsDBNull(labelOrdinal) ? value : reader.GetValue(labelOrdinal).ToString();
                options.Add(new ReportFilterOption { Value = value, Label = label });
            }

            return options;
        }

        private static List<ReportFilterOption> ParseOptionJson(string? optionJson)
        {
            var options = new List<ReportFilterOption>();
            if (string.IsNullOrWhiteSpace(optionJson))
                return options;

            try
            {
                using var doc = JsonDocument.Parse(optionJson, new JsonDocumentOptions
                {
                    AllowTrailingCommas = true,
                    CommentHandling = JsonCommentHandling.Skip
                });

                if (doc.RootElement.ValueKind != JsonValueKind.Array)
                    return options;

                foreach (var item in doc.RootElement.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        var text = item.GetString();
                        options.Add(new ReportFilterOption { Value = text, Label = text });
                        continue;
                    }

                    if (item.ValueKind != JsonValueKind.Object)
                        continue;

                    var value = GetJsonProperty(item, "value") ??
                                GetJsonProperty(item, "id") ??
                                GetJsonProperty(item, "code");
                    var label = GetJsonProperty(item, "label") ??
                                GetJsonProperty(item, "name") ??
                                GetJsonProperty(item, "text") ??
                                value;

                    options.Add(new ReportFilterOption { Value = value, Label = label });
                }
            }
            catch (JsonException)
            {
                return options;
            }

            return options;
        }

        private static string? GetJsonProperty(JsonElement item, string propertyName)
        {
            return item.TryGetProperty(propertyName, out var property) ? property.ToString() : null;
        }

        private static int TryGetOrdinal(SqlDataReader reader, string column)
        {
            for (var i = 0; i < reader.FieldCount; i++)
            {
                if (reader.GetName(i).Equals(column, StringComparison.OrdinalIgnoreCase))
                    return i;
            }

            return -1;
        }

        private static string? QuoteSqlValue(string value, string? dataType)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            var normalizedType = dataType?.Trim().ToLowerInvariant();
            if (normalizedType is "number" or "int" or "decimal" or "float")
                return decimal.TryParse(value, out _) ? value : null;

            return "'" + value.Replace("'", "''") + "'";
        }

        private static string? GetString(SqlDataReader reader, string column)
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetValue(ordinal).ToString();
        }

        private static int GetInt(SqlDataReader reader, string column)
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return 0;

            return Convert.ToInt32(reader.GetValue(ordinal));
        }

        private static bool GetBool(SqlDataReader reader, string column)
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return false;

            var value = reader.GetValue(ordinal);
            if (value is bool boolean)
                return boolean;

            var text = value.ToString();
            return text == "1" ||
                   text?.Equals("YES", StringComparison.OrdinalIgnoreCase) == true ||
                   text?.Equals("TRUE", StringComparison.OrdinalIgnoreCase) == true;
        }
    }
}
