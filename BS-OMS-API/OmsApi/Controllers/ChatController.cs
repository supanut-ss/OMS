using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Common;
using Swashbuckle.AspNetCore.Annotations;

namespace OmsApi.Controllers
{
    /// <summary>
    /// Chat integration endpoints — รวมแชทจากทุกช่องทาง
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        /// <summary>
        /// Get conversations from all platforms (placeholder)
        /// </summary>
        [HttpGet("conversations")]
        [SwaggerOperation(Summary = "[Placeholder] Get chat conversations from all platforms")]
        [SwaggerResponse(501, "Not yet implemented")]
        public IActionResult GetConversations()
        {
            return StatusCode(501, ApiResponse<string>.Fail(
                "Chat integration is planned for a future release. " +
                "This endpoint will aggregate conversations from Shopee, Lazada, and TikTok."));
        }

        /// <summary>
        /// Get messages for a specific conversation (placeholder)
        /// </summary>
        [HttpGet("conversations/{conversationId}/messages")]
        [SwaggerOperation(Summary = "[Placeholder] Get messages for a conversation")]
        [SwaggerResponse(501, "Not yet implemented")]
        public IActionResult GetMessages(string conversationId)
        {
            return StatusCode(501, ApiResponse<string>.Fail(
                "Chat message retrieval is planned for a future release."));
        }

        /// <summary>
        /// Send a message (placeholder)
        /// </summary>
        [HttpPost("conversations/{conversationId}/send")]
        [SwaggerOperation(Summary = "[Placeholder] Send a chat message")]
        [SwaggerResponse(501, "Not yet implemented")]
        public IActionResult SendMessage(string conversationId)
        {
            return StatusCode(501, ApiResponse<string>.Fail(
                "Chat sending is planned for a future release."));
        }
    }
}
