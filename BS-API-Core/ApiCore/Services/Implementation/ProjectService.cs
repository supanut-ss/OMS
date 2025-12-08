using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.Data.SqlClient;
using System;
using System.Data;
using System.Text.RegularExpressions;

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
            catch (Exception ex)
            {
                return null;
            }
        }
        public async Task<ProjectsResponse> InsertProjecHeaderAsync(InsertProjectHeader project, string userId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("tmt.usp_upsert_project_header", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                // --- Helper function ---
                void AddParam(string name, SqlDbType type, object? value, int size = 0)
                {
                    var p = cmd.Parameters.Add(name, type);
                    if (size > 0) p.Size = size;
                    p.Value = value ?? DBNull.Value;
                }

                // Input parameters (type-safe)
                AddParam("@in_intProjectHeaderId", SqlDbType.Int, project.project_header_id);
                AddParam("@in_intMasterProjectId", SqlDbType.Int, project.master_project_id ?? null);
                AddParam("@in_vchProjectNo", SqlDbType.VarChar, project.project_no ?? null, 25);
                AddParam("@in_vchProjectName", SqlDbType.NVarChar, project.project_name, 200);
                AddParam("@in_vchProjectStatus", SqlDbType.VarChar, project.project_status, 25);
                AddParam("@in_vchApplicationType", SqlDbType.VarChar, project.application_type, 30);
                AddParam("@in_vchProjectType", SqlDbType.VarChar, project.project_type, 30);
                AddParam("@in_intIsoTypeId", SqlDbType.Int, project.iso_type_id);
                AddParam("@in_vchPoNumber", SqlDbType.NVarChar, project.po_number, 50);
                AddParam("@in_intSaleId", SqlDbType.Int, project.sale_id);
                AddParam("@in_intCustomerId", SqlDbType.Int, project.customer_id);
                AddParam("@in_decManday", SqlDbType.Decimal, project.manday ?? null);
                AddParam("@in_decManagementCost", SqlDbType.Decimal, project.management_cost ?? null);
                AddParam("@in_decTravelCost", SqlDbType.Decimal, project.travel_cost ?? null);
                AddParam("@in_datePlanProjectStart", SqlDbType.DateTime, project.plan_project_start);
                AddParam("@in_datePlanProjectEnd", SqlDbType.DateTime, project.plan_project_end);
                AddParam("@in_dateReviseProjectStart", SqlDbType.DateTime, project.revise_project_start ?? null);
                AddParam("@in_dateReviseProjectEnd", SqlDbType.DateTime, project.revise_project_end ?? null);
                AddParam("@in_dateActualProjectStart", SqlDbType.DateTime, project.actual_project_start ?? null);
                AddParam("@in_dateActualProjectEnd", SqlDbType.DateTime, project.actual_project_end ?? null);
                AddParam("@in_vchRemark", SqlDbType.NVarChar, project.remark ?? null, 500);
                AddParam("@in_vchIsActive", SqlDbType.VarChar, project.is_active ?? "YES", 3);
                AddParam("@in_vchUserId", SqlDbType.NVarChar, userId, 40);

                // Output parameters
                var pOutId = new SqlParameter("@out_intProjectHeaderId", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
                var pOutCode = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                {
                    Direction = ParameterDirection.Output
                };
                var pOutMsg = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                {
                    Direction = ParameterDirection.Output
                };

                cmd.Parameters.Add(pOutId);
                cmd.Parameters.Add(pOutCode);
                cmd.Parameters.Add(pOutMsg);

                await cmd.ExecuteNonQueryAsync();

                int newId = pOutId.Value is DBNull ? 0 : (int)pOutId.Value;

                // ถ้า insert fail ให้ return null เช่นเดิม
                if (newId <= 0)
                    return null;

                // อ่านข้อมูลที่ insert กลับไปให้ frontend
                return await GetProjectsByIdAsync(newId);
            }
            catch
            {
                return null;
            }
        }

        public async Task<ProjectTaskResponse> InsertProjectTaskAsync(InsertProjectTaskRequest request, string userId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                using var cmd = new SqlCommand("tmt.usp_upsert_project_task", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };
                // --- Helper function ---
                void AddParam(string name, SqlDbType type, object? value, int size = 0)
                {
                    var p = cmd.Parameters.Add(name, type);
                    if (size > 0) p.Size = size;
                    p.Value = value ?? DBNull.Value;
                }
                // Input parameters (type-safe)
                AddParam("@in_intProjectTaskId", SqlDbType.Int, request.project_task_id ?? null);
                AddParam("@in_intProjectTaskPhaseId", SqlDbType.Int, request.project_task_phase_id);
                AddParam("@in_intProjectHeaderId", SqlDbType.Int, request.project_header_id);
                AddParam("@in_vchTaskNo", SqlDbType.VarChar, request.task_no ?? null, 25);
                AddParam("@in_vchTaskName", SqlDbType.NVarChar, request.task_name, 200);
                AddParam("@in_vchTaskDescription", SqlDbType.NVarChar, request.task_description ?? null, 500);
                AddParam("@in_vchTaskStatus", SqlDbType.VarChar, request.task_status, 25);
                AddParam("@in_vchIssueType", SqlDbType.VarChar, request.issue_type, 30);
                AddParam("@in_vchPriority", SqlDbType.VarChar, request.priority, 30);
                AddParam("@in_decManday", SqlDbType.Decimal, request.manday ?? null);
                AddParam("@in_dateStartDate", SqlDbType.DateTime, request.start_date);
                AddParam("@in_dateEndDate", SqlDbType.DateTime, request.end_date);
                AddParam("@in_intSequence", SqlDbType.Int, request.sequence);
                AddParam("@in_vchRemark", SqlDbType.NVarChar, request.remark ?? null, 500);
                AddParam("@in_vchCloseBy", SqlDbType.NVarChar, request.close_by ?? null, 40);
                AddParam("@in_dateCloseDate", SqlDbType.DateTime, request.close_date ?? null);
                AddParam("@in_vchCloseRemark", SqlDbType.NVarChar, request.close_remark ?? null, 500);
                AddParam("@in_vchUserId", SqlDbType.NVarChar, userId, 40);
                // Output parameters
                var pOutId = new SqlParameter("@out_intProjectTaskId", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
                var pOutCode = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                {
                    Direction = ParameterDirection.Output
                };
                var pOutMsg = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                {
                    Direction = ParameterDirection.Output
                };
                cmd.Parameters.Add(pOutId);
                cmd.Parameters.Add(pOutCode);
                cmd.Parameters.Add(pOutMsg);
                await cmd.ExecuteNonQueryAsync();
                int newId = pOutId.Value is DBNull ? 0 : (int)pOutId.Value;



                return new ProjectTaskResponse()
                {
                    project_task_id = newId
                };
            }
            catch (Exception ex)
            {
                return null;
            }
        }
    }
}
