using ApiCore.Models.Responses;
using ApiCore.Services.Implementation;
using ApiCore.Services.Interfaces;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class PartAttachmentController : ControllerBase
{
    private readonly IPartAttachmentService _service;
    private readonly ILogger<PartAttachmentController> _logger;

    public PartAttachmentController(
        IPartAttachmentService service,
        ILogger<PartAttachmentController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet("{partId:long}")]
    public async Task<ActionResult<PartAttachmentResponse>> Get(long partId)
    {
        var attachment = await _service.GetAsync(partId);
        return attachment is null ? NotFound() : Ok(attachment);
    }

    [HttpPost("{partId:long}")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<ActionResult<PartAttachmentResponse>> Upsert(
        long partId, [FromForm] IFormFile file)
    {
        try
        {
            var attachment = await _service.UpsertAsync(partId, file, ResolveUserId());
            return Ok(attachment);
        }
        catch (PartAttachmentValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (UnauthorizedAccessException exception)
        {
            _logger.LogError(exception, "Storage permission denied for Part {PartId}", partId);
            return StatusCode(500, new
            {
                message = "The API does not have permission to write to GTEC_ATTACHMENT_ROOT."
            });
        }
        catch (IOException exception)
        {
            _logger.LogError(exception, "Storage error while saving attachment for Part {PartId}", partId);
            return StatusCode(500, new
            {
                message = "Unable to write the Part attachment file to storage."
            });
        }
        catch (DbException exception)
        {
            _logger.LogError(exception, "Database error while saving attachment for Part {PartId}", partId);
            return StatusCode(500, new
            {
                message = "Unable to update the Part attachment record in the database."
            });
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unable to save attachment for Part {PartId}", partId);
            return StatusCode(500, new { message = "Unable to save Part attachment." });
        }
    }

    [HttpPost("{partId:long}/delete")]
    public async Task<IActionResult> DeleteAttachment(long partId)
    {
        try
        {
            return await _service.DeleteAttachmentAsync(partId)
                ? Ok(new { message = "Part attachment deleted." })
                : NotFound();
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unable to delete attachment for Part {PartId}", partId);
            return StatusCode(500, new { message = "Unable to delete Part attachment." });
        }
    }

    [HttpPost("part/{partId:long}/delete")]
    public async Task<IActionResult> DeletePart(long partId)
    {
        try
        {
            return await _service.DeletePartAsync(partId)
                ? Ok(new { message = "Part and attachment deleted." })
                : NotFound();
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unable to delete Part {PartId}", partId);
            return StatusCode(500, new { message = "Unable to delete Part." });
        }
    }

    private string ResolveUserId() =>
        User.FindFirst("UserId")?.Value
        ?? User.FindFirst("user_id")?.Value
        ?? User.Identity?.Name
        ?? "SYSTEM";
}
