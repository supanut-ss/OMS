namespace OmsApi.Models.Common
{
    /// <summary>
    /// Standard API response wrapper
    /// </summary>
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public int? TotalCount { get; set; }

        public static ApiResponse<T> Ok(T data, string message = "Success", int? totalCount = null)
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data,
                TotalCount = totalCount
            };
        }

        public static ApiResponse<T> Fail(string message)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Data = default
            };
        }
    }
}
