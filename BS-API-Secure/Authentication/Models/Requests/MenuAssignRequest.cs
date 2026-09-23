namespace Authentication.Models.Requests
{
    public class MenuAssignRequest
    {
        public int UserGroupId { get; set; }
        public bool IsAddView { get; set; } = false;
        public bool IsEditView { get; set; } = false;
        public bool IsDeleteView { get; set; } = false;
        public bool IsView { get; set; } = false;
        public int menu_id { get; set; }
        public string Platform { get; set; } = string.Empty;
    }
}
