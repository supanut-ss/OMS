using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    /// <summary>
    /// Request model for project timeline API
    /// </summary>
    public class ProjectTimelineRequest
    {
        /// <summary>
        /// Start date for timeline filter
        /// </summary>
        [Required]
        public DateTime StartDate { get; set; }

        /// <summary>
        /// End date for timeline filter
        /// </summary>
        [Required]
        public DateTime EndDate { get; set; }

        /// <summary>
        /// Optional project header ID to filter specific project
        /// </summary>
        public int? ProjectHeaderId { get; set; }

        /// <summary>
        /// XML formatted user IDs for filtering employees
        /// Example: &lt;users&gt;&lt;user id="1"/&gt;&lt;user id="2"/&gt;&lt;/users&gt;
        /// </summary>
        public string? XmlUserIds { get; set; }
    }
}
