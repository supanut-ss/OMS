using System.Data;

namespace ApiCore.Models.Requests
{
    public class ProjectTeamRequest
    {
        public int? project_member_id { get; set; }
        public int project_header_id { get; set; }
        public string user_id { get; set; }
        public string role { get; set; }
        public string? description { get; set; } = "";
    }
}
