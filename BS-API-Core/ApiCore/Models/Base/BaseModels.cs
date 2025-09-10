using System.ComponentModel.DataAnnotations;

namespace ApiCore.Models.Base
{
    public abstract class BaseEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string? CreateBy { get; set; }
        public DateTime CreateDate { get; set; } = DateTime.Now;

        public string? UpdateBy { get; set; }
        public DateTime? UpdateDate { get; set; }
    }

    public abstract class BaseResponse
    {
        public string Id { get; set; } = string.Empty;
        public string? CreateBy { get; set; }
        public DateTime? CreateDate { get; set; }
        public string? UpdateBy { get; set; }
        public DateTime? UpdateDate { get; set; }
    }

    public abstract class BaseRequest
    {
        public string CreateBy { get; set; } = string.Empty;
    }

    public abstract class BaseUpdateRequest : BaseRequest
    {
        public string Id { get; set; } = string.Empty;
        public string UpdateBy { get; set; } = string.Empty;
    }
}
