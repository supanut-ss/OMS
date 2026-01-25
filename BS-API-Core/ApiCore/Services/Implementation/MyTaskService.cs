using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ApiCore.Services.Implementation
{
    public class MyTaskService : IMyTaskService
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB")
                  ?? throw new ArgumentNullException("SERVERDB connection string not found");

        /// <summary>
        /// Get My Tasks with pagination and filtering by calling tmt.usp_tmt_my_task
        /// </summary>
        public async Task<MyTaskPaginatedResult> GetMyTasksAsync(MyTaskRequest request, string userId)
        {
            var result = new MyTaskPaginatedResult();

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("tmt.usp_tmt_my_task", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                // Input parameters - ตาม Coding Standards
                cmd.Parameters.AddWithValue("@in_vchOperation", "SELECT");
                cmd.Parameters.AddWithValue("@in_intPage", request.Page);
                cmd.Parameters.AddWithValue("@in_intPageSize", request.PageSize);
                cmd.Parameters.AddWithValue("@in_vchOrderBy", (object?)request.OrderBy ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@in_vchFilterModel", (object?)request.FilterModel ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@in_vchQuickFilter", (object?)request.QuickFilter ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@in_vchTaskStatus", (object?)request.TaskStatus ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@in_vchUserId", userId);

                // Output parameters
                cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;

                using var reader = await cmd.ExecuteReaderAsync();

                // Read data rows
                while (await reader.ReadAsync())
                {
                    result.Data.Add(new MyTaskResponse
                    {
                        project_task_id = reader.GetInt32(reader.GetOrdinal("project_task_id")),
                        task_no = reader.IsDBNull(reader.GetOrdinal("task_no")) ? null : reader.GetString(reader.GetOrdinal("task_no")),
                        task_name = reader.IsDBNull(reader.GetOrdinal("task_name")) ? null : reader.GetString(reader.GetOrdinal("task_name")),
                        task_status = reader.IsDBNull(reader.GetOrdinal("task_status")) ? null : reader.GetString(reader.GetOrdinal("task_status")),
                        task_description = reader.IsDBNull(reader.GetOrdinal("task_description")) ? null : reader.GetString(reader.GetOrdinal("task_description")),
                        start_date = reader.IsDBNull(reader.GetOrdinal("start_date")) ? null : reader.GetDateTime(reader.GetOrdinal("start_date")),
                        end_date = reader.IsDBNull(reader.GetOrdinal("end_date")) ? null : reader.GetDateTime(reader.GetOrdinal("end_date")),
                        priority = reader.IsDBNull(reader.GetOrdinal("priority")) ? null : reader.GetString(reader.GetOrdinal("priority")),
                        manday = reader.IsDBNull(reader.GetOrdinal("manday")) ? null : reader.GetDecimal(reader.GetOrdinal("manday")),
                        issue_type = reader.IsDBNull(reader.GetOrdinal("issue_type")) ? null : reader.GetString(reader.GetOrdinal("issue_type")),
                        remark = reader.IsDBNull(reader.GetOrdinal("remark")) ? null : reader.GetString(reader.GetOrdinal("remark")),
                        project_header_id = reader.GetInt32(reader.GetOrdinal("project_header_id")),
                        project_no = reader.IsDBNull(reader.GetOrdinal("project_no")) ? null : reader.GetString(reader.GetOrdinal("project_no")),
                        project_name = reader.IsDBNull(reader.GetOrdinal("project_name")) ? null : reader.GetString(reader.GetOrdinal("project_name")),
                        project_type = reader.IsDBNull(reader.GetOrdinal("project_type")) ? null : reader.GetString(reader.GetOrdinal("project_type")),
                        assignee = reader.IsDBNull(reader.GetOrdinal("assignee")) ? null : reader.GetString(reader.GetOrdinal("assignee")),
                        assignee_list = reader.IsDBNull(reader.GetOrdinal("assignee_list")) ? null : reader.GetString(reader.GetOrdinal("assignee_list")),
                        task_tracking_count = reader.GetInt32(reader.GetOrdinal("task_tracking_count")),
                        create_by = reader.IsDBNull(reader.GetOrdinal("create_by")) ? null : reader.GetString(reader.GetOrdinal("create_by")),
                        create_date = reader.IsDBNull(reader.GetOrdinal("create_date")) ? null : reader.GetDateTime(reader.GetOrdinal("create_date")),
                        update_by = reader.IsDBNull(reader.GetOrdinal("update_by")) ? null : reader.GetString(reader.GetOrdinal("update_by")),
                        update_date = reader.IsDBNull(reader.GetOrdinal("update_date")) ? null : reader.GetDateTime(reader.GetOrdinal("update_date"))
                    });
                }

                // Read pagination metadata (second result set)
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    result.Pagination = new PaginationInfo
                    {
                        TotalRows = reader.GetInt32(reader.GetOrdinal("TotalRows")),
                        CurrentPage = reader.GetInt32(reader.GetOrdinal("CurrentPage")),
                        PageSize = reader.GetInt32(reader.GetOrdinal("PageSize")),
                        TotalPages = (int)reader.GetDouble(reader.GetOrdinal("TotalPages"))
                    };
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetMyTasksAsync Error: {ex.Message}");
                return result;
            }
        }

        /// <summary>
        /// Get Task Tracking records for a task by calling tmt.usp_tmt_project_task_tracking
        /// </summary>
        public async Task<TaskTrackingPaginatedResult> GetTaskTrackingAsync(TaskTrackingRequest request)
        {
            var result = new TaskTrackingPaginatedResult();

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("tmt.usp_tmt_project_task_tracking", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                // Input parameters - ตาม Coding Standards
                cmd.Parameters.AddWithValue("@in_vchOperation", "SELECT");
                cmd.Parameters.AddWithValue("@in_intPage", request.Page);
                cmd.Parameters.AddWithValue("@in_intPageSize", request.PageSize);
                cmd.Parameters.AddWithValue("@in_vchOrderBy", (object?)request.OrderBy ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@in_vchQuickFilter", (object?)request.QuickFilter ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@in_intProjectTaskId", request.ProjectTaskId);

                // Output parameters
                cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;

                using var reader = await cmd.ExecuteReaderAsync();

                // Read data rows
                while (await reader.ReadAsync())
                {
                    result.Data.Add(new TaskTrackingResponse
                    {
                        project_task_tracking_id = reader.GetInt32(reader.GetOrdinal("project_task_tracking_id")),
                        project_task_id = reader.GetInt32(reader.GetOrdinal("project_task_id")),
                        project_header_id = reader.GetInt32(reader.GetOrdinal("project_header_id")),
                        issue_type = reader.IsDBNull(reader.GetOrdinal("issue_type")) ? null : reader.GetString(reader.GetOrdinal("issue_type")),
                        actual_work = reader.GetDecimal(reader.GetOrdinal("actual_work")),
                        actual_date = reader.GetDateTime(reader.GetOrdinal("actual_date")),
                        process_update = reader.IsDBNull(reader.GetOrdinal("process_update")) ? null : reader.GetString(reader.GetOrdinal("process_update")),
                        assignee = reader.IsDBNull(reader.GetOrdinal("assignee")) ? null : reader.GetString(reader.GetOrdinal("assignee")),
                        assignee_first_name = reader.IsDBNull(reader.GetOrdinal("assignee_first_name")) ? null : reader.GetString(reader.GetOrdinal("assignee_first_name")),
                        assignee_last_name = reader.IsDBNull(reader.GetOrdinal("assignee_last_name")) ? null : reader.GetString(reader.GetOrdinal("assignee_last_name")),
                        create_by = reader.IsDBNull(reader.GetOrdinal("create_by")) ? null : reader.GetString(reader.GetOrdinal("create_by")),
                        create_date = reader.IsDBNull(reader.GetOrdinal("create_date")) ? null : reader.GetDateTime(reader.GetOrdinal("create_date")),
                        update_by = reader.IsDBNull(reader.GetOrdinal("update_by")) ? null : reader.GetString(reader.GetOrdinal("update_by")),
                        update_date = reader.IsDBNull(reader.GetOrdinal("update_date")) ? null : reader.GetDateTime(reader.GetOrdinal("update_date"))
                    });
                }

                // Read pagination metadata
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    result.Pagination = new PaginationInfo
                    {
                        TotalRows = reader.GetInt32(reader.GetOrdinal("TotalRows")),
                        CurrentPage = reader.GetInt32(reader.GetOrdinal("CurrentPage")),
                        PageSize = reader.GetInt32(reader.GetOrdinal("PageSize")),
                        TotalPages = (int)reader.GetDouble(reader.GetOrdinal("TotalPages"))
                    };
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetTaskTrackingAsync Error: {ex.Message}");
                return result;
            }
        }

        /// <summary>
        /// Insert new Task Tracking record
        /// </summary>
        public async Task<TaskTrackingResponse?> InsertTaskTrackingAsync(InsertTaskTrackingRequest request, string userId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("tmt.usp_tmt_project_task_tracking", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                // Input parameters - ตาม Coding Standards
                cmd.Parameters.AddWithValue("@in_vchOperation", "INSERT");
                cmd.Parameters.AddWithValue("@in_intProjectTaskId", request.ProjectTaskId);
                cmd.Parameters.AddWithValue("@in_vchIssueType", request.IssueType);
                cmd.Parameters.AddWithValue("@in_decActualWork", request.ActualWork);
                cmd.Parameters.AddWithValue("@in_dtActualDate", request.ActualDate);
                cmd.Parameters.AddWithValue("@in_vchProcessUpdate", request.ProcessUpdate);
                // AssigneeUserId = who the task is assigned to, UserId = who is creating the record
                cmd.Parameters.AddWithValue("@in_vchAssigneeUserId", string.IsNullOrEmpty(request.AssigneeUserId) ? userId : request.AssigneeUserId);
                cmd.Parameters.AddWithValue("@in_vchUserId", userId);

                // Output parameters
                cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;

                using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    return new TaskTrackingResponse
                    {
                        project_task_tracking_id = reader.GetInt32(reader.GetOrdinal("project_task_tracking_id")),
                        project_task_id = reader.GetInt32(reader.GetOrdinal("project_task_id")),
                        project_header_id = reader.GetInt32(reader.GetOrdinal("project_header_id")),
                        issue_type = reader.IsDBNull(reader.GetOrdinal("issue_type")) ? null : reader.GetString(reader.GetOrdinal("issue_type")),
                        actual_work = reader.GetDecimal(reader.GetOrdinal("actual_work")),
                        actual_date = reader.GetDateTime(reader.GetOrdinal("actual_date")),
                        process_update = reader.IsDBNull(reader.GetOrdinal("process_update")) ? null : reader.GetString(reader.GetOrdinal("process_update")),
                        assignee = reader.IsDBNull(reader.GetOrdinal("assignee")) ? null : reader.GetString(reader.GetOrdinal("assignee")),
                        assignee_first_name = reader.IsDBNull(reader.GetOrdinal("assignee_first_name")) ? null : reader.GetString(reader.GetOrdinal("assignee_first_name")),
                        assignee_last_name = reader.IsDBNull(reader.GetOrdinal("assignee_last_name")) ? null : reader.GetString(reader.GetOrdinal("assignee_last_name")),
                        create_by = reader.IsDBNull(reader.GetOrdinal("create_by")) ? null : reader.GetString(reader.GetOrdinal("create_by")),
                        create_date = reader.IsDBNull(reader.GetOrdinal("create_date")) ? null : reader.GetDateTime(reader.GetOrdinal("create_date"))
                    };
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InsertTaskTrackingAsync Error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Update existing Task Tracking record
        /// </summary>
        public async Task<TaskTrackingResponse?> UpdateTaskTrackingAsync(InsertTaskTrackingRequest request, string userId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("tmt.usp_tmt_project_task_tracking", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                // Input parameters - ตาม Coding Standards
                cmd.Parameters.AddWithValue("@in_vchOperation", "UPDATE");
                cmd.Parameters.AddWithValue("@in_intProjectTaskTrackingId", request.ProjectTaskTrackingId ?? 0);
                cmd.Parameters.AddWithValue("@in_vchIssueType", request.IssueType);
                cmd.Parameters.AddWithValue("@in_decActualWork", request.ActualWork);
                cmd.Parameters.AddWithValue("@in_dtActualDate", request.ActualDate);
                cmd.Parameters.AddWithValue("@in_vchProcessUpdate", request.ProcessUpdate);
                // AssigneeUserId = who the task is assigned to, UserId = who is updating the record
                cmd.Parameters.AddWithValue("@in_vchAssigneeUserId", string.IsNullOrEmpty(request.AssigneeUserId) ? userId : request.AssigneeUserId);
                cmd.Parameters.AddWithValue("@in_vchUserId", userId);

                // Output parameters
                cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;

                using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    return new TaskTrackingResponse
                    {
                        project_task_tracking_id = reader.GetInt32(reader.GetOrdinal("project_task_tracking_id")),
                        project_task_id = reader.GetInt32(reader.GetOrdinal("project_task_id")),
                        project_header_id = reader.GetInt32(reader.GetOrdinal("project_header_id")),
                        issue_type = reader.IsDBNull(reader.GetOrdinal("issue_type")) ? null : reader.GetString(reader.GetOrdinal("issue_type")),
                        actual_work = reader.GetDecimal(reader.GetOrdinal("actual_work")),
                        actual_date = reader.GetDateTime(reader.GetOrdinal("actual_date")),
                        process_update = reader.IsDBNull(reader.GetOrdinal("process_update")) ? null : reader.GetString(reader.GetOrdinal("process_update")),
                        assignee = reader.IsDBNull(reader.GetOrdinal("assignee")) ? null : reader.GetString(reader.GetOrdinal("assignee")),
                        assignee_first_name = reader.IsDBNull(reader.GetOrdinal("assignee_first_name")) ? null : reader.GetString(reader.GetOrdinal("assignee_first_name")),
                        assignee_last_name = reader.IsDBNull(reader.GetOrdinal("assignee_last_name")) ? null : reader.GetString(reader.GetOrdinal("assignee_last_name")),
                        create_by = reader.IsDBNull(reader.GetOrdinal("create_by")) ? null : reader.GetString(reader.GetOrdinal("create_by")),
                        create_date = reader.IsDBNull(reader.GetOrdinal("create_date")) ? null : reader.GetDateTime(reader.GetOrdinal("create_date")),
                        update_by = reader.IsDBNull(reader.GetOrdinal("update_by")) ? null : reader.GetString(reader.GetOrdinal("update_by")),
                        update_date = reader.IsDBNull(reader.GetOrdinal("update_date")) ? null : reader.GetDateTime(reader.GetOrdinal("update_date"))
                    };
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"UpdateTaskTrackingAsync Error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Delete Task Tracking record
        /// </summary>
        public async Task<TaskTrackingDeleteResponse> DeleteTaskTrackingAsync(int projectTaskTrackingId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("tmt.usp_tmt_project_task_tracking", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                // Input parameters - ตาม Coding Standards
                cmd.Parameters.AddWithValue("@in_vchOperation", "DELETE");
                cmd.Parameters.AddWithValue("@in_intProjectTaskTrackingId", projectTaskTrackingId);

                // Output parameters
                var rowCountParam = cmd.Parameters.Add("@out_intRowCount", SqlDbType.Int);
                rowCountParam.Direction = ParameterDirection.Output;
                var messageParam = cmd.Parameters.Add("@out_vchMessage", SqlDbType.NVarChar, 4000);
                messageParam.Direction = ParameterDirection.Output;

                await cmd.ExecuteNonQueryAsync();

                int rowCount = rowCountParam.Value == DBNull.Value ? 0 : (int)rowCountParam.Value;
                string message = messageParam.Value?.ToString() ?? "";

                return new TaskTrackingDeleteResponse
                {
                    message_code = rowCount > 0 ? "0" : "1",
                    message_text = message
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DeleteTaskTrackingAsync Error: {ex.Message}");
                return new TaskTrackingDeleteResponse
                {
                    message_code = "-1",
                    message_text = "An error occurred while deleting the task tracking."
                };
            }
        }
    }
}
