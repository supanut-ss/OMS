namespace ApiCore.Models.Responses
{
    public class ProjectTaskPhaseResponse
    {
        public int project_task_phase_id { get; set; }
        public int project_header_id { get; set; }
        public string? phase_name { get; set; }
        public int progress_percent { get; set; }
        public string? description { get; set; }
        public int? sequence { get; set; }
        public string? create_by { get; set; }
        public DateTime create_date { get; set; }
        public string? update_by { get; set; }
        public DateTime? update_date { get; set; }
    }
}
