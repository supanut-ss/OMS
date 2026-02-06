using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Sprache;
using System;
using System.Data;
using System.Runtime.InteropServices;
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
                                        year, record_type,remark, is_active, create_by, create_date, update_by, update_date
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
                                response.year = reader.IsDBNull(20) ? (int?)null : reader.GetInt32(20);
                                response.record_type = reader.GetString(21);
                                response.remark = reader.GetString(22);
                                response.is_active = reader.GetString(23);
                                response.create_by = reader.GetString(24);
                                response.create_date = reader.GetDateTime(25);
                                response.update_by = reader.IsDBNull(26) ? null : reader.GetString(26);
                                response.update_date = reader.IsDBNull(27) ? (DateTime?)null : reader.GetDateTime(27);

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
                    var sql = @$"SELECT project_task_phase_id, project_header_id, phase_name, progress_percent,description, sequence, create_by, create_date, update_by, update_date
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
                                    progress_percent = reader.GetInt32(3),
                                    description = reader.IsDBNull(4) ? null : reader.GetString(4),
                                    sequence = reader.IsDBNull(5) ? (int?)null : reader.GetInt32(5),
                                    create_by = reader.GetString(6),
                                    create_date = reader.GetDateTime(7),
                                    update_by = reader.IsDBNull(8) ? null : reader.GetString(8),
                                    update_date = reader.IsDBNull(9) ? (DateTime?)null : reader.GetDateTime(9)
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
                AddParam("@in_vchRecordType", SqlDbType.NVarChar, project.record_type ?? null, 50);
                AddParam("@in_vchRemark", SqlDbType.NVarChar, project.remark ?? null, 500);
                AddParam("@in_vchIsActive", SqlDbType.VarChar, project.is_active ?? "YES", 3);
                AddParam("@in_intYear", SqlDbType.Int, project.year ?? null);
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

        public async Task<ProjectsTaskResponse> InsertProjectTaskAsync(InsertProjectTaskRequest request, string userId)
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
                AddParam("@in_intProjectTaskId", SqlDbType.Int, request.project_task_id);
                AddParam("@in_intProjectTaskPhaseId", SqlDbType.Int, request.project_task_phase_id);
                AddParam("@in_intProjectHeaderId", SqlDbType.Int, request.project_header_id);

                AddParam("@in_vchTaskNo", SqlDbType.VarChar, request.task_no, 25);
                AddParam("@in_vchTaskName", SqlDbType.NVarChar, request.task_name, 200);
                AddParam("@in_vchTaskDescription", SqlDbType.NVarChar, request.task_description); // NVARCHAR(MAX)

                AddParam("@in_vchTaskStatus", SqlDbType.VarChar, request.task_status, 25);
                AddParam("@in_vchIssueType", SqlDbType.VarChar, request.issue_type, 30);
                AddParam("@in_vchPriority", SqlDbType.VarChar, request.priority, 25);

                var manday = cmd.Parameters.Add("@in_decManday", SqlDbType.Decimal);
                manday.Precision = 18;
                manday.Scale = 5;
                manday.Value = request.manday ?? (object)DBNull.Value;

                AddParam("@in_dateStartDate", SqlDbType.DateTime, request.start_date);
                AddParam("@in_dateEndDate", SqlDbType.DateTime, request.end_date);
                AddParam("@in_intSequence", SqlDbType.Int, request.sequence);
                AddParam("@in_vchRemark", SqlDbType.NVarChar, request.remark, 500);

                AddParam("@in_vchIsIncident", SqlDbType.VarChar, request.is_incident ?? "YES", 3);
                AddParam("@in_vchIncidentNo", SqlDbType.NVarChar, request.incident_no, 25);
                AddParam("@in_intResponseTime", SqlDbType.Int, request.response_time);
                AddParam("@in_intResolveDuration", SqlDbType.Int, request.resolve_duration);
                AddParam("@in_dateStartIncidentDate", SqlDbType.DateTime, request.start_incident_date);
                AddParam("@in_dateResponseDate", SqlDbType.DateTime, request.response_date);
                AddParam("@in_dateResolveDurationDate", SqlDbType.DateTime, request.resolve_duration_date);
                AddParam("@in_datePlanResponseDate", SqlDbType.DateTime, request.plan_response_date);
                AddParam("@in_datePlanResolveDurationDate", SqlDbType.DateTime, request.plan_resolve_duration_date);

                AddParam("@in_vchCloseBy", SqlDbType.NVarChar, request.close_by, 40);
                AddParam("@in_dateCloseDate", SqlDbType.DateTime, request.close_date);
                AddParam("@in_vchCloseRemark", SqlDbType.NVarChar, request.close_remark, 255);

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
                Console.WriteLine(pOutCode.Value);
                Console.WriteLine(pOutMsg.Value);
                return await GetProjectsTaskByIdAsync(newId);

            }
            catch (Exception ex)
            {
                return null;
            }
        }
        public async Task<ProjectsTaskResponse> GetProjectsTaskByIdAsync(int projectTaskId)
        {
            ProjectsTaskResponse response = new ProjectsTaskResponse();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                var sql = @$"SELECT project_task_id, project_header_id, project_task_phase_id, task_no, task_name, task_description, task_status, 
                                   issue_type, priority, manday, start_date, end_date,end_date_extend, sequence, remark , close_by, close_date, close_remark, is_incident, incident_no, response_time,
                                   resolve_duration ,start_incident_date,response_date, resolve_duration_date,plan_response_date,plan_resolve_duration_date,create_by, create_date, update_by, update_date
                            FROM tmt.t_tmt_project_task
                            WHERE project_task_id = @ProjectTaskId";
                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@ProjectTaskId", projectTaskId);
                using var reader = await cmd.ExecuteReaderAsync();
                {
                    if (await reader.ReadAsync())
                    {
                        response.project_task_id = reader.GetInt32(0);
                        response.project_header_id = reader.GetInt32(1);
                        response.project_task_phase_id = reader.GetInt32(2);
                        response.task_no = reader.GetString(3);
                        response.task_name = reader.GetString(4);
                        response.task_description = reader.GetString(5);
                        response.task_status = reader.GetString(6);
                        response.issue_type = reader.GetString(7);
                        response.priority = reader.GetString(8);
                        response.manday = reader.IsDBNull(9) ? (decimal?)null : reader.GetDecimal(9);
                        response.start_date = reader.GetDateTime(10);
                        response.end_date = reader.GetDateTime(11);
                        response.end_date_extend = reader.GetDateTime(12);
                        response.sequence = reader.GetInt32(13);
                        response.remark = reader.GetString(14);
                        response.close_by = reader.IsDBNull(15) ? null : reader.GetString(15);
                        response.close_date = reader.IsDBNull(16) ? (DateTime?)null : reader.GetDateTime(16);
                        response.close_remark = reader.IsDBNull(17) ? null : reader.GetString(17);
                        response.is_incident = reader.GetString(18);
                        response.incident_no = reader.IsDBNull(19) ? null : reader.GetString(19);
                        response.response_time = reader.IsDBNull(20) ? (int?)null : reader.GetInt32(20);
                        response.resolve_duration = reader.IsDBNull(21) ? (int?)null : reader.GetInt32(21);
                        response.start_incident_date = reader.IsDBNull(22) ? (DateTime?)null : reader.GetDateTime(22);
                        response.response_date = reader.IsDBNull(23) ? (DateTime?)null : reader.GetDateTime(23);
                        response.resolve_duration_date = reader.IsDBNull(24) ? (DateTime?)null : reader.GetDateTime(24);
                        response.plan_response_date = reader.IsDBNull(25) ? (DateTime?)null : reader.GetDateTime(25);
                        response.plan_resolve_duration_date = reader.IsDBNull(26) ? (DateTime?)null : reader.GetDateTime(26);
                        response.create_by = reader.GetString(27);
                        response.create_date = reader.GetDateTime(28);
                        response.update_by = reader.IsDBNull(29) ? null : reader.GetString(29);
                        response.update_date = reader.IsDBNull(30) ? (DateTime?)null : reader.GetDateTime(30);
                    }
                }
                return response;
            }
            catch (Exception ex)
            {
                return null;
            }
        }
        public async Task<ProjectTaskDeleteResponse> DeleteProjectsTaskByIdAsync(int projectTaskId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("tmt.usp_tmt_project_task", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                // Parameters - ตาม Coding Standards
                cmd.Parameters.AddWithValue("@in_vchOperation", "DELETE");
                cmd.Parameters.AddWithValue("@in_intProjectTaskId", projectTaskId);

                // Output parameters (ต้องใส่ เพราะ procedure มี output)
                cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;
                cmd.Parameters.Add("@out_intErrorCode", SqlDbType.Int).Direction = ParameterDirection.Output;

                await cmd.ExecuteNonQueryAsync();

                int errorCode = (int)cmd.Parameters["@out_intErrorCode"].Value;

                return new ProjectTaskDeleteResponse
                {
                    message_code = errorCode.ToString() ?? "",
                    message_text = cmd.Parameters["@out_vchMessage"].Value.ToString() ?? ""
                };
            }
            catch
            {
                return new ProjectTaskDeleteResponse
                {
                    message_code = "-1",
                    message_text = "An error occurred while deleting the project task."
                };
            }
        }
        public async Task<ProjectAssignTaskMemberResponse> InsertOrUpdateProjectTaskMemberAsync(AssignProjectTaskToTeamRequest req, string userId)
        {
            var response = new ProjectAssignTaskMemberResponse();

            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();

                    using (var cmd = new SqlCommand("tmt.usp_upsert_project_task_member", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;

                        // --- INPUT ---
                        void AddIn(string name, SqlDbType type, object value, int? size = null)
                        {
                            var p = cmd.Parameters.Add(name, type);
                            if (size.HasValue) p.Size = size.Value;
                            p.Value = value ?? DBNull.Value;
                        }

                        AddIn("@in_intProjectTaskMemberId", SqlDbType.Int, req.project_task_member_id ?? null);
                        AddIn("@in_intProjectTaskId", SqlDbType.Int, req.project_task_id);
                        AddIn("@in_intProjectHeaderId", SqlDbType.Int, req.project_header_id);
                        AddIn("@in_vchUserId", SqlDbType.NVarChar, req.user_id, 40);
                        AddIn("@in_decManday", SqlDbType.Decimal, req.manday);
                        AddIn("@in_vchDescription", SqlDbType.NVarChar, "", 500);
                        AddIn("@in_vchActionUser", SqlDbType.NVarChar, userId, 40);

                        // --- OUTPUT ---
                        var outId = cmd.Parameters.Add("@out_intProjectTaskMemberId", SqlDbType.Int);
                        outId.Direction = ParameterDirection.Output;

                        var outCode = cmd.Parameters.Add("@out_vchErrorCode", SqlDbType.NVarChar, 50);
                        outCode.Direction = ParameterDirection.Output;

                        var outMsg = cmd.Parameters.Add("@out_vchErrorMessage", SqlDbType.NVarChar, 500);
                        outMsg.Direction = ParameterDirection.Output;

                        // Execute
                        await cmd.ExecuteNonQueryAsync();

                        // --- READ OUTPUT ---
                        response.project_task_member_id = outId.Value != DBNull.Value ? (int)outId.Value : 0;
                        response.message_code = outCode.Value?.ToString();
                        response.message_text = outMsg.Value?.ToString();
                    }
                }
            }
            catch (Exception ex)
            {
                response.project_task_member_id = 0;
                response.message_code = "999";
                response.message_text = ex.Message;
            }

            return response;
        }

        public async Task<ProjectAssignTaskMemberResponse> DeleteAssignTaskMemberAsync(int assignTaskMemberId)
        {
            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    using (var cmd = new SqlCommand("tmt.usp_tmt_project_task_member", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;
                        // Parameters - ตาม Coding Standards
                        cmd.Parameters.AddWithValue("@in_vchOperation", "DELETE");
                        cmd.Parameters.AddWithValue("@in_intProjectTaskMemberId", assignTaskMemberId);
                        // Output parameters (ต้องใส่ เพราะ procedure มี output)
                        cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                        cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;
                        cmd.Parameters.Add("@out_intErrorCode", SqlDbType.Int).Direction = ParameterDirection.Output;
                        await cmd.ExecuteNonQueryAsync();
                        int errorCode = (int)cmd.Parameters["@out_intErrorCode"].Value;
                        return new ProjectAssignTaskMemberResponse
                        {
                            project_task_member_id = assignTaskMemberId,
                            message_code = errorCode.ToString() ?? "",
                            message_text = cmd.Parameters["@out_vchMessage"].Value.ToString() ?? ""
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                return new ProjectAssignTaskMemberResponse
                {
                    project_task_member_id = 0,
                    message_code = "999",
                    message_text = "An error occurred while deleting the assigned task member."
                };
            }
        }

        public async Task<ProjectTeamResponse> InsertOrUpdateProjectTeam(ProjectTeamRequest project, string userId)
        {
            try
            {
                ProjectTeamResponse response = new ProjectTeamResponse();
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    using (var cmd = new SqlCommand("tmt.usp_upsert_project_team", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;
                        // --- Helper function ---
                        void AddParam(string name, SqlDbType type, object? value, int size = 0)
                        {
                            var p = cmd.Parameters.Add(name, type);
                            if (size > 0) p.Size = size;
                            p.Value = value ?? DBNull.Value;
                        }
                        // Input parameters (type-safe)
                        AddParam("@in_intProjectMemberId", SqlDbType.Int, project.project_member_id ?? null);
                        AddParam("@in_intProjectHeaderId", SqlDbType.Int, project.project_header_id);
                        AddParam("@in_vchUserId", SqlDbType.NVarChar, project.user_id, 40);
                        AddParam("@in_vchRole", SqlDbType.NVarChar, project.role, 100);
                        AddParam("@in_vchDescription", SqlDbType.NVarChar, project.description ?? null, 500);
                        AddParam("@in_vchActionUser", SqlDbType.NVarChar, userId, 40);
                        // Output parameters
                        var pOutId = new SqlParameter("@out_intProjectMemberId", SqlDbType.Int)
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
                        response.message_code = pOutCode.Value?.ToString();
                        response.message_text = pOutMsg.Value?.ToString();


                    }
                }
                return response;
            }
            catch (Exception ex)
            {
                return new ProjectTeamResponse
                {
                    message_code = "999",
                    message_text = ex.Message
                };
            }
        }

        public async Task<ProjectTeamResponse> DeleteProjectTeam(int projectTeamId)
        {
            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    using (var cmd = new SqlCommand("tmt.usp_project_teams", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;
                        // Parameters - ตาม Coding Standards
                        cmd.Parameters.AddWithValue("@in_vchOperation", "DELETE");
                        cmd.Parameters.AddWithValue("@in_intProjectMemberId", projectTeamId);
                        // Output parameters (ต้องใส่ เพราะ procedure มี output)
                        cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                        cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;
                        cmd.Parameters.Add("@out_intErrorCode", SqlDbType.Int).Direction = ParameterDirection.Output;
                        await cmd.ExecuteNonQueryAsync();
                        int errorCode = (int)cmd.Parameters["@out_intErrorCode"].Value;
                        return new ProjectTeamResponse
                        {
                            message_code = errorCode.ToString() ?? "",
                            message_text = cmd.Parameters["@out_vchMessage"].Value.ToString() ?? ""
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                return (new ProjectTeamResponse
                {
                    message_code = "999",
                    message_text = ex.Message
                });
            }
        }

        public async Task<List<ProjectIncentiveResponse>> GetProjectIncentiveByIdAsync(string projectId, string year)
        {
            try
            {
                var result = new List<ProjectIncentiveResponse>();
                using var conn = new SqlConnection(_connectionString) ;

                    using var cmd = new SqlCommand(
                    "[tmt].[usp_calculate_project_incentive]",
                    conn
                );

                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue(
                    "@in_intProjectHeaderId",
                    (object?)projectId ?? DBNull.Value
                );
                cmd.Parameters.AddWithValue(
                    "@in_intYear",
                    (object?)year ?? DBNull.Value
                );

                await conn.OpenAsync();

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    ProjectIncentiveResponse projectIncentive = new ProjectIncentiveResponse();
                    projectIncentive.project_header_id = reader.GetInt32(0);
                    projectIncentive.project_no = reader.GetString(1);
                    projectIncentive.project_name = reader.GetString(2);

                    projectIncentive.plan_project_start =
                        reader.IsDBNull(3) ? null : reader.GetDateTime(3).ToString("yyyy-MM-dd");

                    projectIncentive.plan_project_end =
                        reader.IsDBNull(4) ? null : reader.GetDateTime(4).ToString("yyyy-MM-dd");

                    projectIncentive.incentive_year = reader.GetInt32(5);

                    projectIncentive.user_id = reader.GetString(6);
                    projectIncentive.first_name = reader.GetString(7);
                    projectIncentive.last_name = reader.GetString(8);
                    projectIncentive.role = reader.GetString(9);

                    projectIncentive.project_value =
                        reader.IsDBNull(10) ? 0 : reader.GetDecimal(10);

                    projectIncentive.collected_amount =
                        reader.IsDBNull(11) ? 0 : reader.GetDecimal(11);

                    projectIncentive.role_percentage =
                        reader.IsDBNull(12) ? 0 : reader.GetDecimal(12);

                    projectIncentive.role_member_count =
                        reader.GetInt32(13);   // ✅ FIX

                    projectIncentive.percentage_per_person =
                        reader.IsDBNull(14) ? 0 : reader.GetDecimal(14);

                    projectIncentive.assign_manday =
                        reader.IsDBNull(15) ? 0 : reader.GetDecimal(15);

                    projectIncentive.total_project_manday =
                        reader.IsDBNull(16) ? 0 : reader.GetDecimal(16);

                    projectIncentive.actual_work_hour =
                        reader.IsDBNull(17) ? 0 : reader.GetDecimal(17);

                    projectIncentive.total_actual_work =
                        reader.IsDBNull(18) ? 0 : reader.GetDecimal(18);

                    projectIncentive.incentive_by_manday =
                        reader.IsDBNull(19) ? 0 : reader.GetDecimal(19);

                    projectIncentive.incentive_by_actual_work =
                        reader.IsDBNull(20) ? 0 : reader.GetDecimal(20);

                    result.Add(projectIncentive);


                }
                return result;
            }
            catch(Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }

        public async Task<List<MonthlyPerformanceInvoiceDto>> GetMonthlyPerformanceInvoicesAsync(int year, int month)
        {
            try
            {
                var result = new List<MonthlyPerformanceInvoiceDto>();

                using (var conn = new SqlConnection(_connectionString))
                using (var cmd = new SqlCommand(
                    "tmt.usp_calculate_monthly_performance_voice", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@in_intYear", year);
                    cmd.Parameters.AddWithValue("@in_intMonth", month);

                    await conn.OpenAsync();

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            result.Add(new MonthlyPerformanceInvoiceDto
                            {
                                incentive_year = reader.GetInt32(0),
                                incentive_month = reader.GetInt32(1),
                                project_header_id = reader.GetInt32(2),
                                project_no = reader.GetString(3),
                                project_name = reader.GetString(4),
                                role = reader.GetString(5),
                                role_percentage = reader.GetDecimal(6),
                                total_invoice = reader.GetDecimal(7),
                                incentive_amount = reader.GetDecimal(8),
                            });
                        }
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }
    }
}
