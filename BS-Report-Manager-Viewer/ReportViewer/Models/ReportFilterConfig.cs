using System.Text.Json.Serialization;

namespace ReportViewer.Models
{
    public class ReportFilterConfig
    {
        public int Id { get; set; }
        public string? ReportCode { get; set; }
        public string? ParameterName { get; set; }
        public string? Label { get; set; }
        public string? InputType { get; set; }
        public string? DataType { get; set; }
        [JsonIgnore]
        public string? SqlFieldName { get; set; }
        [JsonIgnore]
        public string? Operator { get; set; }
        public string? DefaultValue { get; set; }
        public string? Placeholder { get; set; }
        public string? OptionSourceType { get; set; }
        public string? OptionJson { get; set; }
        [JsonIgnore]
        public string? OptionSql { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public List<ReportFilterOption> Options { get; set; } = new();
    }

    public class ReportFilterOption
    {
        public string? Value { get; set; }
        public string? Label { get; set; }
    }
}
