namespace Authentication.Models.Requests
{
    public class MenuAssignRequest
    {
        public int UserGroupId { get; set; }
        public string IsAddView { get; set; } = string.Empty;
        public string IsEditView { get; set; } = string.Empty;
        public string IsDeleteView { get; set; } = string.Empty;
        public string IsView { get; set; } = string.Empty;
        public int menu_id { get; set; }
        public string Platform { get; set; } = string.Empty;
    }
}
