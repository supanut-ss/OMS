namespace Authentication.Models.Responses.Auth
{
    public class MenuResponse : MasterResponse
    {
        public List<MenuDataResponse>? data { get; set; } = new List<MenuDataResponse>();
        
    }


    public class MenuDataResponse
    {
        public int UserGroupId { get; set; }
        public string IsAddView { get; set; } = string.Empty;
        public string IsEditView { get; set; } = string.Empty;
        public string IsDeleteView { get; set; } = string.Empty;
        public string IsView { get; set; } = string.Empty;
        public int MenuId { get; set; }
        public int? ParentMenuId { get; set; }
        public string IsActive { get; set; } = string.Empty;
        public int? AppId { get; set; }
        public string MenuName { get; set; } = string.Empty;
        public string MenuGroup { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string MenuPath { get; set; } = string.Empty;
        public int? MenuSequence { get; set; }
        public int? MenuGroupSequence { get; set; }
    }
}
