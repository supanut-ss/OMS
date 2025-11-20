namespace Authentication.Models.Responses.Auth
{
    public class MenuResponse : MasterResponse
    {
        public List<MenuDataResponse>? data { get; set; } = new List<MenuDataResponse>();

    }


    public class MenuDataResponse
    {
        public int user_group_id { get; set; }
        public string is_add_view { get; set; } = string.Empty;
        public string is_edit_view { get; set; } = string.Empty;
        public string is_delete_view { get; set; } = string.Empty;
        public string is_view { get; set; } = string.Empty;
        public int menu_id { get; set; }
        public int parent_menu_id { get; set; }
        //    public string IsActive { get; set; } = string.Empty;
        //     public int? AppId { get; set; }
        public string menu_name { get; set; } = string.Empty;
        public string menu_group { get; set; } = string.Empty;
        //    public string Platform { get; set; } = string.Empty;
        public string menu_path { get; set; } = string.Empty;
        public int menu_sequence { get; set; }
        public int menu_group_sequence { get; set; }
        public int menu_favorite_id { get; set; }
    }
}
