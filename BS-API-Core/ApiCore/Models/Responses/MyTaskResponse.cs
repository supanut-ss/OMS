namespace ApiCore.Models.Responses
{
    public class PaginationInfo
    {
        public int TotalRows { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

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
        public int task_tracking_count { get; set; }
        public string? create_by { get; set; }
        public DateTime? create_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }
    }

    public class MyTaskPaginatedResult
    {
        public List<MyTaskResponse> Data { get; set; } = new();
        public PaginationInfo? Pagination { get; set; }
    }
}
