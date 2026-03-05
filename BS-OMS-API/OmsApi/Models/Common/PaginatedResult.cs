namespace OmsApi.Models.Common
{
    /// <summary>
    /// Paginated result wrapper
    /// </summary>
    public class PaginatedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public bool HasMore => (Page * PageSize) < TotalCount;
    }
}
