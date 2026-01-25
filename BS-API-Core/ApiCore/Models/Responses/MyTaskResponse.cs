namespace ApiCore.Models.Responses
{
    /// <summary>
    /// Response for My Task list item
    /// </summary>
    public class MyTaskResponse
    {
        public int project_task_id { get; set; }
        public string? task_no { get; set; }
        public string? task_name { get; set; }
        public string? task_status { get; set; }
        public string? task_description { get; set; }
        public DateTime? start_date { get; set; }
        public DateTime? end_date { get; set; }
        public string? priority { get; set; }
        public decimal? manday { get; set; }
        public string? issue_type { get; set; }
        public string? remark { get; set; }
        public int project_header_id { get; set; }
        public string? project_no { get; set; }
        public string? project_name { get; set; }
        public string? project_type { get; set; }
        public string? assignee { get; set; }
        public string? assignee_list { get; set; }
        public int? task_tracking_count { get; set; }
        public string? create_by { get; set; }
        public DateTime? create_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }
    }

    /// <summary>
    /// Response for Task Tracking item
    /// Column mapping: issue_type = Task Tracking Type, actual_work = Work Hour, process_update = Description
    /// </summary>
    public class TaskTrackingResponse
    {
        public int project_task_tracking_id { get; set; }
        public int project_task_id { get; set; }
        public int project_header_id { get; set; }
        public string? issue_type { get; set; }                 // Task Tracking Type
        public decimal actual_work { get; set; }                // Work Hour
        public DateTime actual_date { get; set; }
        public string? process_update { get; set; }             // Description
        public string? assignee { get; set; }
        public string? assignee_first_name { get; set; }
        public string? assignee_last_name { get; set; }
        public string? create_by { get; set; }
        public DateTime? create_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }
    }

    /// <summary>
    /// Pagination metadata
    /// </summary>
    public class PaginationInfo
    {
        public int TotalRows { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    /// <summary>
    /// Paginated result for My Task
    /// </summary>
    public class MyTaskPaginatedResult
    {
        public List<MyTaskResponse> Data { get; set; } = new List<MyTaskResponse>();
        public PaginationInfo Pagination { get; set; } = new PaginationInfo();
    }

    /// <summary>
    /// Paginated result for Task Tracking
    /// </summary>
    public class TaskTrackingPaginatedResult
    {
        public List<TaskTrackingResponse> Data { get; set; } = new List<TaskTrackingResponse>();
        public PaginationInfo Pagination { get; set; } = new PaginationInfo();
    }

    /// <summary>
    /// Generic delete response
    /// </summary>
    public class TaskTrackingDeleteResponse
    {
        public string message_code { get; set; } = string.Empty;
        public string message_text { get; set; } = string.Empty;
    }
}
