using ApiCore.Services.Interfaces;
using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using Microsoft.Data.SqlClient;
using DotNetEnv;
using System.Dynamic;

namespace ApiCore.Services.Implementation
{
    public class AutoCompleteServices : IAutoComplete
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY")
            ?? throw new ArgumentNullException(nameof(_connectionString));

        public async Task<AutoCompleteResponse> AutoCompleteAsync(AutoCompleteRequest request)
        {
            var response = new AutoCompleteResponse
            {
                message_code = "0",
                message_text = "success",
                data = new List<Dictionary<string, object>>()
            };

            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();

                    var keyColumn = request.columns?.FirstOrDefault(c => c.key)?.field;
                    var displayColumns = request.columns?
                        .Where(c => c.display)
                        .Select(c => c.field)
                        .ToList();

                    // ---------- WHERE ----------
                    var whereList = new List<string>();

                    if (!string.IsNullOrWhiteSpace(request.where))
                        whereList.Add(request.where);

                    if (!string.IsNullOrWhiteSpace(request.keyword) && displayColumns?.Any() == true)
                    {
                        var likes = displayColumns.Select(c => $"{c} LIKE @keyword");
                        whereList.Add("(" + string.Join(" OR ", likes) + ")");
                    }

                    var whereSql = whereList.Any()
                        ? "WHERE " + string.Join(" AND ", whereList)
                        : "";

                    // ---------- ORDER ----------
                    var orderSql = !string.IsNullOrWhiteSpace(request.order_by)
                        ? $"ORDER BY {request.order_by}"
                        : (!string.IsNullOrEmpty(keyColumn) ? $"ORDER BY {keyColumn}" : "");

                    // ---------- COLUMN ----------
                    var columnList = (request.columns ?? Enumerable.Empty<ColumnItem>())
                        .Select(c => c.field)
                        .Distinct()
                        .ToList();

                    if (!string.IsNullOrEmpty(keyColumn) && !columnList.Contains(keyColumn))
                        columnList.Add(keyColumn);

                    var selectColumns = columnList.Any()
                        ? string.Join(",", columnList)
                        : "*";

                    // ---------- SQL ----------
                    var sql = $@"
SELECT TOP (@limit) {selectColumns}
FROM {request.schema}{request.table}
{whereSql}
{orderSql}";

                    using (var cmd = new SqlCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@limit", request.limit > 0 ? request.limit : 30);

                        if (!string.IsNullOrWhiteSpace(request.keyword))
                            cmd.Parameters.AddWithValue("@keyword", $"%{request.keyword}%");

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            // include blank (ครั้งเดียว)
                            if (request.include_blank)
                            {
                                response.data.Add(new Dictionary<string, object>
                        {
                            { "code", "" },
                            { "value", "--Please Select--" }
                        });
                            }

                            while (await reader.ReadAsync())
                            {
                                var dict = new Dictionary<string, object>();

                                // ดึงทุก column
                                for (int i = 0; i < reader.FieldCount; i++)
                                {
                                    var colName = reader.GetName(i);
                                    dict[colName] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                                }

                                // map code + value
                                if (!string.IsNullOrEmpty(keyColumn))
                                {
                                    var displayValues = (displayColumns ?? new List<string>())
                                        .Select(c => reader[c]?.ToString() ?? "")
                                        .ToList();

                                    dict["code"] = reader[keyColumn]?.ToString() ?? "";
                                    dict["value"] = string.Join(" ", displayValues);
                                }

                                response.data.Add(dict);
                            }
                        }
                    }

                    if (response.data.Count == (request.include_blank ? 1 : 0))
                    {
                        response.message_code = "2";
                        response.message_text = "No resources found.";
                    }
                }
            }
            catch (Exception ex)
            {
                response.message_code = "9";
                response.message_text = $"Error: {ex.Message}";
            }

            return response;
        }
    }
    }
