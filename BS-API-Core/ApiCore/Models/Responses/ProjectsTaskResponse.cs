namespace ApiCore.Models.Responses
{
    public class ProjectsTaskResponse
    {
        public int project_task_id { get; set; }
        public int project_header_id { get; set; }
        public int project_task_phase_id { get; set; }
        public string? task_no { get; set; }
        public string? task_name { get; set; }
        public string? task_description { get; set; }
        public string? task_status { get; set; }
        public string? issue_type { get; set; }
        public string? priority { get; set; }
        public decimal? manday { get; set; }
        public DateTime start_date { get; set; }
        public DateTime end_date { get; set; }
        public DateTime end_date_extend { get; set; }
        public int sequence { get; set; }
        public string? remark { get; set; }
        public string? close_by { get; set; }
        public DateTime? close_date { get; set; }
        public string? close_remark { get; set; }
        public string? is_incident { get; set; }
        public string? incident_no { get; set; }
        public int? response_time { get; set; }
        public int? resolve_duration { get; set; }
        public DateTime? start_incident_date { get; set; }
        public DateTime? response_date { get; set; }
        public DateTime? resolve_duration_date { get; set; }
        public DateTime? plan_response_date { get; set; }
        public DateTime? plan_resolve_duration_date { get; set; }
        public string? create_by { get; set; }
        public DateTime create_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }
    }

    public class ProjectTaskDeleteResponse
    {
        public string? message_code { get; set; }
        public string? message_text { get; set; }
    }
}
