using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.Data.SqlClient;

namespace ApiCore.Services.Implementation
{
    public class ProjectService : IProjectsService
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB")
                  ?? throw new ArgumentNullException(nameof(_connectionString));

        public async Task<ProjectsResponse> GetProjectsByIdAsync(int projectId)
        {
            ProjectsResponse response = new ProjectsResponse();
            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    var sql = @$"SELECT project_header_id, project_no, project_name, project_status, application_type, project_type, iso_type_id, 
                                        po_number, sale_id, customer_id, manday, management_cost, travel_cost, plan_project_start, 
                                        plan_project_end, revise_project_start, revise_project_end, actual_project_start, actual_project_end, 
                                        remark, is_active, create_by, create_date, update_by, update_date
                                 FROM tmt.t_tmt_project_header
                                 WHERE project_header_id = @ProjectId";
                    using (var cmd = new SqlCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@ProjectId", projectId);
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                response.project_header_id = reader.GetInt32(0);
                                response.project_no = reader.GetString(1);
                                response.project_name = reader.GetString(2);
                                response.project_status = reader.GetString(3);
                                response.application_type = reader.GetString(4);
                                response.project_type = reader.GetString(5);
                                response.iso_type_id = reader.GetInt32(6);
                                response.po_number = reader.GetString(7);
                                response.sale_id = reader.GetInt32(8);
                                response.customer_id = reader.GetInt32(9);
                                response.manday = reader.IsDBNull(10) ? (decimal?)null : reader.GetDecimal(10);
                                response.management_cost = reader.IsDBNull(11) ? (decimal?)null : reader.GetDecimal(11);
                                response.travel_cost = reader.IsDBNull(12) ? (decimal?)null : reader.GetDecimal(12);
                                response.plan_project_start = reader.IsDBNull(13) ? (DateTime?)null : reader.GetDateTime(13);
                                response.plan_project_end = reader.IsDBNull(14) ? (DateTime?)null : reader.GetDateTime(14);
                                response.revise_project_start = reader.IsDBNull(15) ? (DateTime?)null : reader.GetDateTime(15);
                                response.revise_project_end = reader.IsDBNull(16) ? (DateTime?)null : reader.GetDateTime(16);
                                response.actual_project_start = reader.IsDBNull(17) ? (DateTime?)null : reader.GetDateTime(17);
                                response.actual_project_end = reader.IsDBNull(18) ? (DateTime?)null : reader.GetDateTime(18);
                                response.remark = reader.GetString(19);
                                response.is_active = reader.GetString(20);
                                response.create_by = reader.GetString(21);
                                response.create_date = reader.GetDateTime(22);
                                response.update_by = reader.IsDBNull(23) ? null : reader.GetString(23);
                                response.update_date = reader.IsDBNull(24) ? (DateTime?)null : reader.GetDateTime(24);

                            }
                        }
                    }
                }
                return response;
            }
            catch (Exception ex)
            {
                return null;
            }
          

        }
    }
}
