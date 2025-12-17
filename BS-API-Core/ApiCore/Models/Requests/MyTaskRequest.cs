namespace ApiCore.Models.Requests
{
    /// <summary>
    /// Request for My Task list with pagination and filtering
    /// </summary>
    public class MyTaskRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 25;
        public string? OrderBy { get; set; }
        public string? FilterModel { get; set; }
        public string? QuickFilter { get; set; }
        public string? TaskStatus { get; set; }  // Open, In Process, Close
    }

    /// <summary>
    /// Request for Task Tracking list with pagination
    /// </summary>
    public class TaskTrackingRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 25;
        public string? OrderBy { get; set; }
        public string? QuickFilter { get; set; }
        public int ProjectTaskId { get; set; }
    }

    /// <summary>
    /// Request for Insert/Update Task Tracking
    /// Column mapping: IssueType = issue_type, ActualWork = actual_work, ProcessUpdate = process_update
    /// </summary>
    public class InsertTaskTrackingRequest
    {
        public int? ProjectTaskTrackingId { get; set; }
        public int ProjectTaskId { get; set; }
        public string IssueType { get; set; } = string.Empty;          // Task Tracking Type
        public decimal ActualWork { get; set; }                         // Work Hour
        public DateTime ActualDate { get; set; }
        public string ProcessUpdate { get; set; } = string.Empty;       // Description
        public string? AssigneeUserId { get; set; }                     // Assignee User ID (can be different from logged-in user)
    }
}
