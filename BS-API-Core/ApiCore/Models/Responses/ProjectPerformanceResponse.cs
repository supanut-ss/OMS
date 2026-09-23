namespace ApiCore.Models.Responses
{
    public class PerformanceProjectDto
    {
        public int project_header_id { get; set; }
        public string? project_no { get; set; }
        public string? project_name { get; set; }
        public decimal total_invoice { get; set; }
        public List<PerformanceRoleDto> roles { get; set; } = new();
    }

    public class PerformanceRoleDto
    {
        public string? role { get; set; }
        public decimal role_percentage { get; set; }
        public decimal incentive_amount { get; set; }
    }
}
