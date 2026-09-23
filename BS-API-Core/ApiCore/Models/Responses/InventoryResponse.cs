using System.Text.Json.Serialization;

namespace ApiCore.Models.Responses
{
    public class InventoryResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("data")] // เพิ่มตบแต่ง JsonPropertyName ให้เข้าพวก
        public object? Data { get; set; }

        // ส่วที่เพิ่มเข้ามา: สำหรับเก็บรายการ Error แยกรายตัว
        [JsonPropertyName("errors")]
        public List<string> Errors { get; set; } = new List<string>();
    }
}
