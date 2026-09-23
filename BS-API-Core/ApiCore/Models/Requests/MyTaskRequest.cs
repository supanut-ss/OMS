namespace ApiCore.Models.Requests
{
    public class MyTaskRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? OrderBy { get; set; }
        public string? FilterModel { get; set; }
        public string? QuickFilter { get; set; }
        public string? TaskStatus { get; set; }
    }
}
