namespace ApiCore.Models.Requests
{
    public class InsertProjectHeader
    {
        public int project_header_id { get; set; }
        public int? master_project_id { get; set; }
        public string project_no { get; set; }
        public string project_name { get; set; }
        public string project_status { get; set; }
        public string application_type { get; set; }
        public string project_type { get; set; }
        public int iso_type_id { get; set; }
        public string po_number { get; set; }
        public int sale_id { get; set; }
        public int customer_id { get; set; }
        public decimal? manday { get; set; }
        public decimal? management_cost { get; set; }
        public decimal? travel_cost { get; set; }
        public DateTime? plan_project_start { get; set; }
        public DateTime? plan_project_end { get; set; }
        public DateTime? revise_project_start { get; set; }
        public DateTime? revise_project_end { get; set; }
        public DateTime? actual_project_start { get; set; }
        public DateTime? actual_project_end { get; set; }
        public string record_type { get; set; } = "PROJECT";
        public string remark { get; set; }
        public string is_active { get; set; }
        public int? year { get; set; }
    }
}
