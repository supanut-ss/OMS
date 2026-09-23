namespace ApiCore.Models.Responses
{
    public class TaskTrackingResponse
    {
        public int project_task_tracking_id { get; set; }
        public int project_task_id { get; set; }
        public int project_header_id { get; set; }
        public string? issue_type { get; set; }
        public decimal actual_work { get; set; }
        public DateTime actual_date { get; set; }
        public string? process_update { get; set; }
        public string? assignee { get; set; }
        public string? assignee_first_name { get; set; }
        public string? assignee_last_name { get; set; }
        public string? create_by { get; set; }
        public DateTime? create_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }
    }

    public class TaskTrackingPaginatedResult
    {
        public List<TaskTrackingResponse> Data { get; set; } = new();
        public PaginationInfo? Pagination { get; set; }
    }

    public class TaskTrackingDeleteResponse
    {
        public string? message_code { get; set; }
        public string? message_text { get; set; }
    }
}
