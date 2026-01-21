using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ApiCore.Services.Implementation
{
    /// <summary>
    /// Service implementation for Gantt chart operations
    /// </summary>
    public class GanttService : IGanttService
    {
        private readonly string _connectionString;

        public GanttService(IConfiguration configuration)
        {
            _connectionString = Environment.GetEnvironmentVariable("SERVERDB") ?? "";
        }

        /// <summary>
        /// Get project timeline data by calling usp_tmt_dashboard_project_timeline stored procedure
        /// </summary>
        public async Task<List<ProjectTimelineResponse>> GetProjectTimelineAsync(
            DateTime startDate,
            DateTime endDate,
            int? projectHeaderId,
            string xmlUserIds)
        {
            var result = new List<ProjectTimelineResponse>();

            try
            {
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                using var command = new SqlCommand("tmt.usp_tmt_dashboard_project_timeline", connection);
                command.CommandType = CommandType.StoredProcedure;

                // Add parameters matching the SP signature
                command.Parameters.AddWithValue("@in_dtStartDate", startDate);
                command.Parameters.AddWithValue("@in_dtEndDate", endDate);
                command.Parameters.AddWithValue("@in_vchProjectHeaderID", (object?)projectHeaderId ?? DBNull.Value);
                command.Parameters.AddWithValue("@in_xmlUserID", string.IsNullOrEmpty(xmlUserIds) ? DBNull.Value : xmlUserIds);

                using var reader = await command.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                    var item = new ProjectTimelineResponse
                    {
                        user_id = GetSafeString(reader, "user_id"),
                        first_name = GetSafeString(reader, "first_name"),
                        last_name = GetSafeString(reader, "last_name"),
                        project_header_id = GetSafeNullableValue<int>(reader, "project_header_id"),
                        project_no = GetSafeString(reader, "project_no"),
                        project_name = GetSafeString(reader, "project_name"),
                        min_task_start_date = GetSafeNullableDateTime(reader, "min_task_start_date"),
                        max_task_end_date = GetSafeNullableDateTime(reader, "max_task_end_date"),
                        task_no = GetSafeString(reader, "task_no"),
                        task_name = GetSafeString(reader, "task_name"),
                        task_description = GetSafeString(reader, "task_description"),
                        task_start_date = GetSafeNullableDateTime(reader, "task_start_date"),
                        task_end_date = GetSafeNullableDateTime(reader, "task_end_date"),
                        
                        // Task-level manday fields
                        task_plan_manday = GetSafeNullableValue<decimal>(reader, "task_plan_manday"),
                        actual_work = GetSafeNullableValue<decimal>(reader, "actual_work"),
                        
                        // Project summary manday fields
                        total_task_plan_manday = GetSafeNullableValue<decimal>(reader, "total_task_plan_manday"),
                        total_actual_work = GetSafeNullableValue<decimal>(reader, "total_actual_work")
                    };

                    result.Add(item);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error executing usp_tmt_dashboard_project_timeline: {ex.Message}", ex);
            }

            return result;
        }

        #region Helper Methods

        private static T GetSafeValue<T>(SqlDataReader reader, string columnName) where T : struct
        {
            try
            {
                int ordinal = reader.GetOrdinal(columnName);
                if (reader.IsDBNull(ordinal))
                    return default;
                
                var value = reader.GetValue(ordinal);
                
                // Handle numeric type conversions (e.g., bigint to int, decimal to int)
                if (typeof(T) == typeof(int))
                {
                    return (T)(object)Convert.ToInt32(value);
                }
                
                return (T)value;
            }
            catch (Exception ex)
            {
                // Log for debugging - remove in production
                System.Diagnostics.Debug.WriteLine($"GetSafeValue error for {columnName}: {ex.Message}");
                return default;
            }
        }

        private static T? GetSafeNullableValue<T>(SqlDataReader reader, string columnName) where T : struct
        {
            try
            {
                int ordinal = reader.GetOrdinal(columnName);
                if (reader.IsDBNull(ordinal))
                    return null;
                return (T)reader.GetValue(ordinal);
            }
            catch
            {
                return null;
            }
        }

        private static string? GetSafeString(SqlDataReader reader, string columnName)
        {
            try
            {
                int ordinal = reader.GetOrdinal(columnName);
                if (reader.IsDBNull(ordinal))
                    return null;
                return reader.GetString(ordinal);
            }
            catch
            {
                return null;
            }
        }

        private static DateTime? GetSafeNullableDateTime(SqlDataReader reader, string columnName)
        {
            try
            {
                int ordinal = reader.GetOrdinal(columnName);
                if (reader.IsDBNull(ordinal))
                    return null;
                return reader.GetDateTime(ordinal);
            }
            catch
            {
                return null;
            }
        }

        #endregion
    }
}
