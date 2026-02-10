using System;
using System.Data;
using System.Data.SqlClient;
using ReportViewer.Config;
using ReportViewer.Models;

namespace ReportViewer.Services
{
    /// <summary>
    /// Service to read report configuration from rpt.t_com_config_report table
    /// </summary>
    public class ReportConfigService
    {
        /// <summary>
        /// Get report configuration by report_code
        /// </summary>
        public static ReportConfig GetConfig(string reportCode)
        {
            if (string.IsNullOrEmpty(reportCode))
                throw new ArgumentException("report_code is required");

            string connStr = AppConfig.Instance.ReportConfigConnectionString;

            using (SqlConnection conn = new SqlConnection(connStr))
            {
                string sql = @"SELECT 
                    report_code, report_name, report_type, is_print_by_server,
                    printer_name, report_path, bartender_data_path, bartender_trigger_path,
                    html_page_size, rdlc_dataset_name, ssrs_server_url, ssrs_report_path,
                    ssrs_username, ssrs_password, ssrs_domain_name, run_as,
                    json_parameter, sql_object_type, sql_command, is_active
                FROM rpt.t_com_config_report
                WHERE report_code = @report_code AND is_active = 'YES'";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@report_code", reportCode);
                    conn.Open();

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        if (!reader.Read())
                            throw new Exception("Report config not found for code: " + reportCode);

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
                            RunAs = GetString(reader, "run_as"),
                            JsonParameter = GetString(reader, "json_parameter"),
                            SqlObjectType = GetString(reader, "sql_object_type"),
                            SqlCommand = GetString(reader, "sql_command"),
                            IsActive = GetString(reader, "is_active")
                        };
                    }
                }
            }
        }

        private static string GetString(SqlDataReader reader, string column)
        {
            int ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }
    }
}
