using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Import_Export_Manager.Models.Data
{
    public class TImportMaster
    {
        public int ImportId { get; set; }
        public string ImportName { get; set; }
        public string? Description { get; set; }
        public string ExecSqlCommand { get; set; }
        public string? ExcelExampleFilePath { get; set; }
        public int Seq { get; set; }
        public string IsActive { get; set; } = "YES";
        public string? ConfirmMessage { get; set; }
        public string CreateBy { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public string? UpdateBy { get; set; }
        public DateTime? UpdateDate { get; set; }

        [Timestamp] // ✅ บอก EF ว่านี่คือ rowversion column
        [Column("rowversion")]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>(); // ✅ ต้องใช้ byte[]
    }
}
