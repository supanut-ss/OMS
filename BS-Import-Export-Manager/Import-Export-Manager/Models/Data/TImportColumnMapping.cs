using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Import_Export_Manager.Models.Data
{
    public class TImportColumnMapping
    {
        public int MappingId { get; set; }
        public int ImportId { get; set; }
        public string ExcelColumnName { get; set; }
        public string DbColumnName { get; set; }
        public string DataType { get; set; }
        public string? AllowedValues { get; set; }
        public string? DataTypeParameter { get; set; }
        public string? FormatPattern { get; set; }
        public bool IsRequired { get; set; } = false;
        public int ColumnOrder { get; set; }
        public string? DefaultValue { get; set; }
        public string CreateBy { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public string? UpdateBy { get; set; }
        public DateTime? UpdateDate { get; set; }

        [Timestamp]
        [Column("rowversion")]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
