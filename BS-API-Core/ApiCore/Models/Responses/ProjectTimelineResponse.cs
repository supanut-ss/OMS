namespace ApiCore.Models.Responses
{
    public class ProjectTimelineResponse
    {
        public string? user_id { get; set; }
        public string? first_name { get; set; }
        public string? last_name { get; set; }
        public int? project_header_id { get; set; }
        public string? project_no { get; set; }
        public string? project_name { get; set; }
        public DateTime? min_task_start_date { get; set; }
        public DateTime? max_task_end_date { get; set; }
        public string? task_no { get; set; }
        public string? task_name { get; set; }
        public string? task_description { get; set; }
        public DateTime? task_start_date { get; set; }
        public DateTime? task_end_date { get; set; }
        public decimal? task_plan_manday { get; set; }
        public decimal? actual_work { get; set; }
        public decimal? total_task_plan_manday { get; set; }
        public decimal? total_actual_work { get; set; }
    }
}
