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
        public int sequence { get; set; }
        public string remark { get; set; }
        public string close_by { get; set; }
        public DateTime? close_date { get; set; }
        public string close_remark { get; set; }

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
}
