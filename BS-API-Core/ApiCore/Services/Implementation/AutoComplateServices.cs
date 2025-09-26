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
                message_text = "success"
            };

            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();

                    var columns = (request.columns ?? Enumerable.Empty<ColumnItem>())
                        .Select(c => c.field)
                        .ToList();
                    var colum = columns.Count > 0 ? string.Join(",", columns) : "*";

                    var orderby = request?.order_by ?? "";
                    if (!string.IsNullOrEmpty(orderby))
                        orderby = "ORDER BY " + orderby;

                    var whereClause = request?.where ?? "";
                    if (!string.IsNullOrEmpty(whereClause))
                        whereClause = "WHERE " + whereClause;

                    var sql = @$"SELECT {colum}
                                 FROM {request.schema}{request.table}  
                                 {whereClause} {orderby}";

                    using (var cmd = new SqlCommand(sql, conn))
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (!await reader.ReadAsync())
                        {
                            response.message_code = "2";
                            response.message_text = "No resources found.";
                        }
                        else
                        {
                            response.data = new List<Dictionary<string, object>>();

                            if (request.include_blank)
                            {
                                response.data.Add(new Dictionary<string, object>
                        {
                            { "code", "" },
                            { "value", "--Please Select--" }
                        });
                            }

                            do
                            {
                                dynamic row = new ExpandoObject();

                                var dict = (request.columns ?? Enumerable.Empty<ColumnItem>()).Where(c => c.key)
                                .ToDictionary(
                                    c => c.field,
                                    c => (object)(reader[c.field]?.ToString() ?? "")
                                );

                                // เพิ่ม code + value
                                int index = request.columns?.FindIndex(c => c.key) ?? -1;
                                if (index >= 0)
                                {
                                    var displayValues = (request.columns ?? Enumerable.Empty<ColumnItem>())
                                        .Where(c => c.display)
                                        .Select(c => reader[c.field]?.ToString() ?? "")
                                        .ToList();

                                    dict["code"] = reader[request.columns[index].field]?.ToString() ?? "";
                                    dict["value"] = string.Join(" ", displayValues);
                                }

                                response.data.Add(dict);
                            } while (await reader.ReadAsync());
                        }
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
