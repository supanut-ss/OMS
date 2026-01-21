namespace ApiCore.Services.Interfaces
{
    /// <summary>
    /// Service interface for Gantt chart operations
    /// </summary>
    public interface IGanttService
    {
        /// <summary>
        /// Get project timeline data for Gantt chart
        /// </summary>
        /// <param name="startDate">Start date filter</param>
        /// <param name="endDate">End date filter</param>
        /// <param name="projectHeaderId">Optional project ID filter</param>
        /// <param name="xmlUserIds">XML formatted user IDs filter</param>
        /// <returns>List of project timeline records</returns>
        Task<List<Models.Responses.ProjectTimelineResponse>> GetProjectTimelineAsync(
            DateTime startDate, 
            DateTime endDate, 
            int? projectHeaderId, 
            string xmlUserIds);
    }
}
