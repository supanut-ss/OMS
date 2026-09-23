using BS_Printing_Manager.Interfaces;
using BS_Printing_Manager.Models.Request;
using System.Data;
using TokenManagement.Database;

namespace BS_Printing_Manager.Services
{
    public class DbReportConfigService : IReportConfigProvider
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public DbReportConfigService(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }

        public async Task<ConfigReportResponse> GetConfigReportAsync(string reportCode)
        {
            try
            {
                using var conn = _connectionFactory.CreateConnection();
                using var cmd = _connectionFactory.CreateCommand(@"
                        SELECT  report_code
                               ,report_name
                               ,report_type
                               ,is_print_by_server
                               ,printer_name
                               ,report_path
                               ,bartender_data_path
                               ,bartender_trigger_path
                               ,sql_command
                               ,sql_object_type
                               ,html_page_size
                               ,html_pdf_body
                FROM rpt.t_com_config_report
                WHERE report_code = @report_code
                AND is_active = 1 
                AND is_print_by_server = 1
                ", conn);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@report_code", reportCode));

                await conn.OpenAsync();

                using var reader = await cmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                    throw new Exception($"Report template not found: {reportCode}");

                return new ConfigReportResponse
                {
                    report_code = reader["report_code"].ToString()!,
                    report_name = reader["report_name"].ToString()!,
                    report_type = reader["report_type"].ToString()!,
                    is_print_by_server = reader["is_print_by_server"].ToString()!,
                    printer_name = reader["printer_name"].ToString()!,
                    bartender_data_path = reader["bartender_data_path"].ToString()!,
                    bartender_trigger_path = reader["bartender_trigger_path"].ToString()!,
                    sql_command = reader["sql_command"].ToString()!,
                    html_page_size = reader["html_page_size"].ToString()!,
                    html_pdf_body = reader["html_pdf_body"].ToString()!,
                    sql_object_type = reader["sql_object_type"].ToString()!,
                };
            }
            catch (Exception ex)
            {
                // Log exception (not implemented here)
                throw new ApplicationException("Error fetching config report", ex);
            }
        }

        public async Task<DataTable> GetConfigExeCmdAsync(string reportSqlCommand, Dictionary<string, object?>? parameters, string sqlType)
        {
            try
            {
                if ("VIEW" == sqlType && parameters != null)
                {
                    if (parameters.TryGetValue("FilterConditionString", out var filterObj)
                  && filterObj != null)
                    {
                        // ⚠️ ระวัง injection ถ้า string นี้มาจาก user
                        reportSqlCommand += " AND " + filterObj.ToString();
                    }
                }
                else
                {
                    if (parameters != null)
                    {
                        foreach (var param in parameters)
                        {
                            var key = "{" + param.Key + "}";
                            var value = param.Value?.ToString() ?? string.Empty;

                            // escape single quote ป้องกัน SQL พัง
                            value = value.Replace("'", "''");

                            reportSqlCommand = reportSqlCommand.Replace(key, value);
                        }
                    }
                }

                using var conn = _connectionFactory.CreateConnection();
                using var cmd = _connectionFactory.CreateCommand(reportSqlCommand, conn);

                await conn.OpenAsync();

                var table = new DataTable();
                using var reader = await cmd.ExecuteReaderAsync();
                table.Load(reader);

                return table;
            }
            catch (Exception ex)
            {
                // Log exception (not implemented here)
                throw new ApplicationException("Error fetching config report", ex);
            }
        }
    }
}
