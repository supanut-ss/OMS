namespace ApiCore.Models.Requests
{
    public class TaskTrackingRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? OrderBy { get; set; }
        public string? QuickFilter { get; set; }
        public int ProjectTaskId { get; set; }
    }

    public class InsertTaskTrackingRequest
    {
        public int? ProjectTaskTrackingId { get; set; }
        public int ProjectTaskId { get; set; }
        public string? IssueType { get; set; }
        public decimal ActualWork { get; set; }
        public DateTime ActualDate { get; set; }
        public string? ProcessUpdate { get; set; }
        public string? AssigneeUserId { get; set; }
    }
}
