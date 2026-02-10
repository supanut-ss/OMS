using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Text.RegularExpressions;
using ReportViewer.Config;
using ReportViewer.Models;

namespace ReportViewer.Services
{
    /// <summary>
    /// Service to execute SQL commands with parameter replacement
    /// Supports two patterns:
    /// 1. View: Append FilterConditionString to WHERE clause
    /// 2. Stored Procedure: Replace {field} placeholders with parameter values
    /// </summary>
    public class ReportDataService
    {
        /// <summary>
        /// Execute SQL command from report config with parameter replacement
        /// Returns DataTable with query results
        /// </summary>
        public static DataTable ExecuteSql(ReportConfig config, Dictionary<string, string> parameters)
        {
            if (string.IsNullOrEmpty(config.SqlCommand))
                throw new ArgumentException("sql_command is not configured for report: " + config.ReportCode);

            string connStr = AppConfig.Instance.ReportDataConnectionString;
            string finalSql = BuildSqlCommand(config, parameters);

            using (SqlConnection conn = new SqlConnection(connStr))
            {
                using (SqlCommand cmd = new SqlCommand(finalSql, conn))
                {
                    cmd.CommandType = CommandType.Text;
                    cmd.CommandTimeout = 300;

                    SqlDataAdapter da = new SqlDataAdapter(cmd);
                    DataTable dt = new DataTable();
                    da.Fill(dt);
                    return dt;
                }
            }
        }

        /// <summary>
        /// Build final SQL command by applying parameter replacement
        /// </summary>
        public static string BuildSqlCommand(ReportConfig config, Dictionary<string, string> parameters)
        {
            string sql = config.SqlCommand;

            if (parameters == null || parameters.Count == 0)
            {
                // Remove any remaining {field} placeholders with empty string
                sql = Regex.Replace(sql, @"\{[^}]+\}", "");
                return sql;
            }

            string objectType = (config.SqlObjectType ?? "").Trim();

            if (objectType.Equals("View", StringComparison.OrdinalIgnoreCase))
            {
                // Pattern 1: View — append FilterConditionString to WHERE clause
                sql = BuildViewSql(sql, parameters);
            }
            else if (objectType.Equals("Stored Procedure", StringComparison.OrdinalIgnoreCase))
            {
                // Pattern 2: Stored Procedure — replace {field} placeholders
                sql = BuildStoredProcedureSql(sql, parameters);
            }
            else
            {
                // Default: try placeholder replacement
                sql = BuildStoredProcedureSql(sql, parameters);
            }

            return sql;
        }

        /// <summary>
        /// View pattern: Append filter conditions to WHERE clause
        /// If parameter "FilterConditionString" exists, append it directly
        /// Otherwise, build conditions from individual parameters
        /// </summary>
        private static string BuildViewSql(string sql, Dictionary<string, string> parameters)
        {
            // Check if FilterConditionString parameter exists (pre-built from frontend)
            if (parameters.ContainsKey("FilterConditionString"))
            {
                string filterCondition = parameters["FilterConditionString"];
                if (!string.IsNullOrEmpty(filterCondition))
                {
                    // Append to existing WHERE clause
                    sql = sql.TrimEnd();
                    if (sql.EndsWith(";"))
                        sql = sql.Substring(0, sql.Length - 1);

                    sql += " AND " + filterCondition;
                }
            }

            // Also replace any {field} placeholders that may exist
            sql = ReplacePlaceholders(sql, parameters);

            return sql;
        }

        /// <summary>
        /// Stored Procedure pattern: Replace {field} placeholders with parameter values
        /// Example: EXEC sp @param = N'{field_name}' becomes EXEC sp @param = N'actual_value'
        /// </summary>
        private static string BuildStoredProcedureSql(string sql, Dictionary<string, string> parameters)
        {
            return ReplacePlaceholders(sql, parameters);
        }

        /// <summary>
        /// Replace all {field} placeholders in SQL with parameter values
        /// Escapes single quotes to prevent SQL injection
        /// </summary>
        private static string ReplacePlaceholders(string sql, Dictionary<string, string> parameters)
        {
            foreach (var param in parameters)
            {
                string placeholder = "{" + param.Key + "}";
                // Escape single quotes for SQL safety
                string safeValue = (param.Value ?? "").Replace("'", "''");
                sql = sql.Replace(placeholder, safeValue);
            }

            // Remove any remaining unreplaced placeholders
            sql = Regex.Replace(sql, @"\{[^}]+\}", "");

            return sql;
        }
    }
}
