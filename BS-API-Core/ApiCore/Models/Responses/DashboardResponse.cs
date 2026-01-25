namespace ApiCore.Models.Responses
{
    public class DashboardResponse
    {
        public decimal all_hours { get; set; }
        public decimal all_status_inprocess_hours { get; set; }
        public decimal all_status_close_hours { get; set; }
        public int extend_task { get; set; }
    }
}
