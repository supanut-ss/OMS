using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using DotNetEnv;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace ApiCore.Services.Implementation
{
    public class DashboardService : IDashboard
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB")
                 ?? throw new ArgumentNullException(nameof(_connectionString));
        public async Task<DashboardResponse> GetDashboard(string userId)
        {
            DashboardResponse result = new DashboardResponse();

            try
            {
                using (var conn = new SqlConnection(_connectionString))
                using (var cmd = new SqlCommand("tmt.usp_project_summary_by_user", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@in_vchUserId", userId);

                    await conn.OpenAsync();

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        // ===== Result set ที่ 1 : hours summary =====
                        if (await reader.ReadAsync())
                        {
                            result.all_hours = reader.GetDecimal(reader.GetOrdinal("all_hours"));
                            result.all_status_close_hours = reader.GetDecimal(reader.GetOrdinal("all_status_close_hours"));
                            result.all_status_inprocess_hours = reader.GetDecimal(reader.GetOrdinal("all_status_inprocess_hours"));
                        }

                        // ===== Result set ที่ 2 : extend_task =====
                        if (await reader.NextResultAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                result.extend_task = reader.GetInt32(reader.GetOrdinal("extend_task"));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("GetDashboard failed", ex);
            }

            return result;
        }
    }
}
