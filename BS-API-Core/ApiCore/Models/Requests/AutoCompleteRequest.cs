using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    public class AutoCompleteRequest
    {
        [Required]
        public string table { get; set; } = string.Empty;
        [Required]
        public string primary { get; set; } = string.Empty;
 
        public List<ColumnItem>? columns { get; set; } = new List<ColumnItem>();
     
        public List<FilterItem>? filters { get; set; } = new List<FilterItem>();
        public bool include_blank { get; set; } = false;

    }
    public class FilterItem
    {
        public string field { get; set; } = string.Empty;
        public string op { get; set; } = string.Empty;
        public string value { get; set; } = string.Empty;
    }
    public class ColumnItem
    {
        public string field { get; set; } = string.Empty;

        public string order_by { get; set; } = string.Empty;
     
        public bool display { get; set; } = false;
    }
}
