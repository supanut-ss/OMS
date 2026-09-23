namespace ApiCore.Models.Responses
{
    public class ProjectAssignTaskMemberResponse
    {
        public int project_task_member_id { get; set; }
        public string? message_code { get; set; }
        public string? message_text { get; set; }
    }

    public class ProjectTeamResponse
    {
        public string? message_code { get; set; }
        public string? message_text { get; set; }
    }
}
