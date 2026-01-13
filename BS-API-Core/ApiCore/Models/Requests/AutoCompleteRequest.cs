using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Requests
{
    public class AutoCompleteRequest
    {
        [Required]
        public string table { get; set; } = string.Empty;
        [Required]
        public string schema { get; set; } = string.Empty;
        public string where { get; set; } = string.Empty;
        public string order_by { get; set; } = string.Empty;
        public List<ColumnItem>? columns { get; set; } = new List<ColumnItem>();
     
        public bool include_blank { get; set; } = false;
        public string? keyword { get; set; } = "";
        public int limit { get; set; } = 30;

    }
    public class ColumnItem
    {
        public string field { get; set; } = string.Empty;

        public bool display { get; set; } = false;
        public bool filter { get; set; } = false;
        public bool key { get; set; } = false;
    }
}
