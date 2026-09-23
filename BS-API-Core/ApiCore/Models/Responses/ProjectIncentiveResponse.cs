namespace ApiCore.Models.Responses
{
    public class ProjectIncentiveResponse
    {
        public int project_header_id { get; set; }
        public string? project_no { get; set; }
        public string? project_name { get; set; }
        public string? plan_project_start { get; set; }
        public string? plan_project_end { get; set; }
        public int incentive_year { get; set; }
        public string? user_id { get; set; }
        public string? first_name { get; set; }
        public string? last_name { get; set; }
        public string? role { get; set; }
        public decimal project_value { get; set; }
        public decimal collected_amount { get; set; }
        public decimal role_percentage { get; set; }
        public int role_member_count { get; set; }
        public decimal percentage_per_person { get; set; }
        public decimal assign_manday { get; set; }
        public decimal total_project_manday { get; set; }
        public decimal actual_work_hour { get; set; }
        public decimal total_actual_work { get; set; }
        public decimal? incentive_by_manday { get; set; }
        public decimal? incentive_by_actual_work { get; set; }
    }

    public class ProjectIncentiveProjectResponse
    {
        public int project_header_id { get; set; }
        public string? project_no { get; set; }
        public string? project_name { get; set; }
        public decimal project_value { get; set; }
        public decimal collected_amount { get; set; }
        public string? plan_project_start { get; set; }
        public string? plan_project_end { get; set; }
        public int incentive_year { get; set; }
        public List<ProjectIncentiveRoleResponse> roles { get; set; } = new();
    }

    public class ProjectIncentiveRoleResponse
    {
        public string? role { get; set; }
        public decimal role_percentage { get; set; }
        public List<ProjectIncentiveMemberResponse> member { get; set; } = new();
    }

    public class ProjectIncentiveMemberResponse
    {
        public string? user_id { get; set; }
        public string? first_name { get; set; }
        public string? last_name { get; set; }
        public decimal assign_manday { get; set; }
        public decimal? actual_work_hour { get; set; }
        public decimal total_project_manday { get; set; }
        public decimal total_actual_work { get; set; }
        public decimal? incentive_by_manday { get; set; }
        public decimal? incentive_by_actual_work { get; set; }
        public decimal incentive_total { get; set; }
        public int rank { get; set; }
    }

    public class MonthlyPerformanceInvoiceDto
    {
        public int incentive_year { get; set; }
        public int incentive_month { get; set; }
        public int project_header_id { get; set; }
        public string? project_no { get; set; }
        public string? project_name { get; set; }
        public string? role { get; set; }
        public decimal role_percentage { get; set; }
        public decimal total_invoice { get; set; }
        public decimal incentive_amount { get; set; }
    }
}
