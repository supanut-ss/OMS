using ApiCore.Services.Interfaces;
using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using Microsoft.Data.SqlClient;

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

                    // ✅ whitelist column
                    var allowedColumns = new HashSet<string>((request.columns ?? new List<ColumnItem>()).Select(c => c.field)) { request.primary };

                    var columns = (request.columns ?? Enumerable.Empty<ColumnItem>())
                .Select(c => c.field)
                .ToList();
                    var colum = columns.Count > 0 ? "," + string.Join(",", columns) : "";

                    var orderby = string.Join(",",
                        (request.columns ?? Enumerable.Empty<ColumnItem>())
                            .Where(c => !string.IsNullOrWhiteSpace(c.order_by))
                            .Select(c => $"{c.field} {c.order_by}")
                    );
                    if (!string.IsNullOrEmpty(orderby))
                        orderby = "ORDER BY " + orderby;

                    // ✅ สร้าง WHERE จาก filters (รองรับ null หรือ [])
                    var (whereClause, parameters) = BuildWhereClause(request.filters, allowedColumns);

                    var sql = @$"SELECT {request.primary}{colum} 
                                 FROM {request.table}  
                                 {whereClause} {orderby}";

                    using (var cmd = new SqlCommand(sql, conn))
                    {
                        if (parameters.Count > 0)
                            cmd.Parameters.AddRange(parameters.ToArray());

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (!await reader.ReadAsync())
                            {
                                response.message_code = "2";
                                response.message_text = "No resources found.";
                            }
                            else
                            {
                                response.data = new List<AutoCompleteItem>();
                                if (request.include_blank)
                                {
                                    response.data.Add(new AutoCompleteItem { code = "", value = "--Please Select--" });
                                }
                                do
                                {
                                    var displayValues = (request.columns ?? Enumerable.Empty<ColumnItem>())
                                    .Where(c => c.display)
                                    .Select(c => reader[c.field].ToString())
                                    .ToList();

                                    var data = new AutoCompleteItem
                                    {
                                        code = reader[request.primary].ToString() ?? "",
                                        value = string.Join(" ", displayValues)
                                    };

                                    response.data.Add(data);
                                } while (await reader.ReadAsync());
                            }
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

        private (string whereClause, List<SqlParameter> parameters) BuildWhereClause(IEnumerable<FilterItem>? filters, HashSet<string> allowedColumns)
        {
            var conditions = new List<string>();
            var parameters = new List<SqlParameter>();
            int i = 0;

            if (filters == null || !filters.Any())
                return ("", parameters); // ✅ ถ้า filter ไม่มีค่า คืน string ว่างเลย

            foreach (var f in filters)
            {
                // ✅ ตรวจสอบว่า column อยู่ใน whitelist
                if (!allowedColumns.Contains(f.field))
                    throw new Exception($"Invalid column: {f.field}");

                var paramName = $"@p{i}";
                string op = f.op.ToUpper();

                // ✅ รองรับเฉพาะ operator ที่อนุญาต
                if (op is not ("=" or "<" or ">" or "<=" or ">=" or "<>" or "LIKE"))
                    throw new Exception($"Invalid operator: {op}");

                conditions.Add($"{f.field} {op} {paramName}");

                // ✅ LIKE ต้องใส่ wildcard
                object value = (op == "LIKE") ? $"%{f.value}%" : f.value;
                parameters.Add(new SqlParameter(paramName, value));

                i++;
            }

            var where = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";
            return (where, parameters);
        }
    }
}
