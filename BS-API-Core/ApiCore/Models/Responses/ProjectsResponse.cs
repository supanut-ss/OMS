namespace ApiCore.Models.Responses
{
    public class ProjectsResponse
    {
        public int project_header_id { get; set; }
        public int? master_project_id { get; set; }  
        public string project_no { get; set; }
        public string project_name { get; set; }
        public string project_status { get; set; }
        public string? application_type { get; set; }
        public string project_type { get; set; }
        public int iso_type_id { get; set; }
        public string? po_number { get; set; }
        public int sale_id { get; set; }
        public int customer_id { get; set; }
        public decimal? manday { get; set; }
        public decimal? management_cost { get; set; }
        public decimal? travel_cost { get; set; }
        public DateTime? plan_project_start { get; set; }
        public DateTime? plan_project_end { get; set; }
        public DateTime? revise_project_start { get; set; }
        public DateTime? revise_project_end { get; set; }
        public DateTime? actual_project_start { get; set; }
        public DateTime? actual_project_end { get; set; }
        public int? year { get; set; }
        public string record_type { get; set; }
        public string remark { get; set; }
        public string is_active { get; set; }
        public string create_by { get; set; }
        public DateTime create_date { get; set; }
        public string update_by { get; set; }
        public DateTime? update_date { get; set; }

    }
    public class ProjectTaskPhaseResponse
    {
        public int project_task_phase_id { get; set; }
        public int project_header_id { get; set; }
        public string phase_name { get; set; }
        public string description { get; set; }
        public int progress_percent { get; set; }
        public int? sequence { get; set; }
        public string create_by { get; set; }
        public DateTime create_date { get; set; }
        public string update_by { get; set; }
        public DateTime? update_date { get; set; }
    }
    public class ProjectsTaskResponse
    {
        public int project_task_id { get; set; }
        public int project_header_id { get; set; }
        public int project_task_phase_id { get; set; }
        public string task_no { get; set; }
        public string task_name { get; set; }
        public string task_description { get; set; }
        public string task_status { get; set; }
        public string issue_type { get; set; }
        public string priority { get; set; }
        public decimal? manday { get; set; }
        public DateTime start_date { get; set; }
        public DateTime end_date { get; set; }
        public DateTime end_date_extend { get; set; }
        public int sequence { get; set; }
        public string remark { get; set; }
        public string close_by { get; set; }
        public DateTime? close_date { get; set; }
        public string close_remark { get; set; }
        public string is_incident { get; set; }
        public string? incident_no { get; set; }
        public int? response_time { get; set; }
        public int? resolve_duration { get; set; }
        public DateTime? start_incident_date { get; set; }
        public DateTime? response_date { get; set; }
        public DateTime? resolve_duration_date { get; set; }
        public DateTime? plan_response_date { get; set; }
        public DateTime? plan_resolve_duration_date { get; set; }
        public string create_by { get; set; }
        public DateTime create_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }

    }
    public class ProjectTaskDeleteResponse
    {
       public string message_code { get; set; }
        public string message_text { get; set; }
    }
    public class ProjectAssignTaskMemberResponse {
        public string message_code { get; set; }
        public string message_text { get; set; }
        public int project_task_member_id { get; set; }
    }
    public class ProjectTeamResponse
    {
        public string message_code { get; set; }
        public string message_text { get; set; }
    }
    public class ProjectIncentiveResponse
    {
        public int project_header_id { get; set; }
        public string project_no { get; set; }
        public string project_name { get; set; }

        public string plan_project_start { get; set; }
        public string plan_project_end { get; set; }
        public int incentive_year { get; set; }
        public string user_id { get; set; }
        public string first_name { get; set; }
        public string last_name { get; set; }
        public string role { get; set; }

        public decimal project_value { get; set; }
        public decimal collected_amount { get; set; }

        public decimal role_percentage { get; set; }
        public int role_member_count { get; set; }
        public decimal percentage_per_person { get; set; }

        public decimal assign_manday { get; set; }
        public decimal total_project_manday { get; set; }

        public decimal? actual_work_hour { get; set; }
        public decimal total_actual_work { get; set; }

        public decimal? incentive_by_manday { get; set; }
        public decimal? incentive_by_actual_work { get; set; }
    }
    public class ProjectIncentiveProjectResponse
    {
        public int project_header_id { get; set; }
        public string project_no { get; set; }
        public string project_name { get; set; }

        public decimal project_value { get; set; }
        public decimal collected_amount { get; set; }
        public string plan_project_start { get; set; }
        public string plan_project_end { get; set; }
        public int incentive_year { get; set; }
        public List<ProjectIncentiveRoleResponse> roles { get; set; } = new();
    }
    public class ProjectIncentiveRoleResponse
    {
        public string role { get; set; }
        public decimal role_percentage { get; set; }

        public List<ProjectIncentiveMemberResponse> member { get; set; } = new();
    }

    public class ProjectIncentiveMemberResponse
    {
        public string user_id { get; set; }
        public string first_name { get; set; }
        public string last_name { get; set; }

        public decimal assign_manday { get; set; }
        public decimal? actual_work_hour { get; set; }
        public decimal total_project_manday { get; set; }
        public decimal total_actual_work { get; set; }
        public decimal? incentive_by_manday { get; set; }
        public decimal? incentive_by_actual_work { get; set; }
        public decimal incentive_total { get; set; }
        public int rank { get;set; }
    }

    public class ApiResponse<T>
    {
        public int message_code { get; set; }
        public string message_text { get; set; }
        public T data { get; set; }
    }
    public class MonthlyPerformanceInvoiceDto
    {
        public int incentive_year { get; set; }
        public int incentive_month { get; set; }
        public int project_header_id { get; set; }

        public string project_no { get; set; }
        public string project_name { get; set; }

        public string role { get; set; }

        public decimal role_percentage { get; set; }
        public decimal total_invoice { get; set; }
        public decimal incentive_amount { get; set; }
    }
    public class PerformanceRoleDto
    {
        public string role { get; set; }
        public decimal role_percentage { get; set; }
        public decimal incentive_amount { get; set; }
    }
    public class PerformanceProjectDto
    {
        public int project_header_id { get; set; }
        public string project_no { get; set; }
        public string project_name { get; set; }
        public decimal total_invoice { get; set; }
        public List<PerformanceRoleDto> roles { get; set; }
    }
    public class PerformanceProjectWrapperDto
    {
        public PerformanceProjectDto project { get; set; }
    }

}
