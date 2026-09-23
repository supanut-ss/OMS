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
        public int Seq { get; set; }
        public bool IsActive { get; set; } = true;
        public string? ConfirmMessageTh { get; set; }
        public string? ConfirmMessageEn { get; set; }
        public string? ConfirmMessageOther { get; set; }
        public int ImportBatchSize { get; set; }
        public string ImportTempTableName { get; set; }
        public string ImportStatus { get; set; }
        public string CreateBy { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public string? UpdateBy { get; set; }
        public DateTime? UpdateDate { get; set; }

        [Timestamp]
        [Column("rowversion")]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
