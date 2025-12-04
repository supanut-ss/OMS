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
                    var sql = @$"SELECT project_header_id,master_project_id, project_no, project_name, project_status, application_type, project_type, iso_type_id, 
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
                                response.master_project_id = reader.IsDBNull(1) ? (int?)null : reader.GetInt32(1);
                                response.project_no = reader.GetString(2);
                                response.project_name = reader.GetString(3);
                                response.project_status = reader.GetString(4);
                                response.application_type = reader.GetString(5);
                                response.project_type = reader.GetString(6);
                                response.iso_type_id = reader.GetInt32(7);
                                response.po_number = reader.GetString(8);
                                response.sale_id = reader.GetInt32(9);
                                response.customer_id = reader.GetInt32(10);
                                response.manday = reader.IsDBNull(11) ? (decimal?)null : reader.GetDecimal(11);
                                response.management_cost = reader.IsDBNull(12) ? (decimal?)null : reader.GetDecimal(12);
                                response.travel_cost = reader.IsDBNull(13) ? (decimal?)null : reader.GetDecimal(13);
                                response.plan_project_start = reader.IsDBNull(14) ? (DateTime?)null : reader.GetDateTime(14);
                                response.plan_project_end = reader.IsDBNull(15) ? (DateTime?)null : reader.GetDateTime(15);
                                response.revise_project_start = reader.IsDBNull(16) ? (DateTime?)null : reader.GetDateTime(16);
                                response.revise_project_end = reader.IsDBNull(17) ? (DateTime?)null : reader.GetDateTime(17);
                                response.actual_project_start = reader.IsDBNull(18) ? (DateTime?)null : reader.GetDateTime(18);
                                response.actual_project_end = reader.IsDBNull(19) ? (DateTime?)null : reader.GetDateTime(19);
                                response.remark = reader.GetString(20);
                                response.is_active = reader.GetString(21);
                                response.create_by = reader.GetString(22);
                                response.create_date = reader.GetDateTime(23);
                                response.update_by = reader.IsDBNull(24) ? null : reader.GetString(24);
                                response.update_date = reader.IsDBNull(25) ? (DateTime?)null : reader.GetDateTime(25);

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

        public async Task<List<ProjectTaskPhaseResponse>> GetProjectTaskPhasesByIdAsync(int projectId)
        {
            try
            {
                List<ProjectTaskPhaseResponse> response = new List<ProjectTaskPhaseResponse>();
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    var sql = @$"SELECT project_task_phase_id, project_header_id, phase_name, description, sequence, create_by, create_date, update_by, update_date
                                 FROM tmt.v_tmt_project_task_phase
                                 WHERE project_header_id = @ProjectId
                                ORDER BY sequence asc
                    ";
                    using (var cmd = new SqlCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@ProjectId", projectId);
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var item = new ProjectTaskPhaseResponse
                                {
                                    project_task_phase_id = reader.GetInt32(0),
                                    project_header_id = reader.GetInt32(1),
                                    phase_name = reader.GetString(2),
                                    description = reader.IsDBNull(3) ? null : reader.GetString(3),
                                    sequence = reader.IsDBNull(4) ? (int?)null : reader.GetInt32(4),
                                    create_by = reader.GetString(5),
                                    create_date = reader.GetDateTime(6),
                                    update_by = reader.IsDBNull(7) ? null : reader.GetString(7),
                                    update_date = reader.IsDBNull(8) ? (DateTime?)null : reader.GetDateTime(8)
                                };

                                response.Add(item);
                            }
                        }
                    }
                }
                return response;

            }
            catch(Exception ex)
            {
                return null;
            }
        }
    }
}
