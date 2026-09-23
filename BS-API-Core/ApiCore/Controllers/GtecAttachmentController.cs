using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers;

[ApiController]
[Route("api/[controller]/[action]")]
[Authorize]
public sealed class GtecAttachmentController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".pdf"
    };

    private readonly string _attachmentRoot;
    private readonly ILogger<GtecAttachmentController> _logger;

    public GtecAttachmentController(ILogger<GtecAttachmentController> logger, IConfiguration configuration)
    {
        _logger = logger;
        _attachmentRoot = Environment.GetEnvironmentVariable("GTEC_ATTACHMENT_ROOT")
            ?? configuration["GtecAttachment:Root"]
            ?? throw new InvalidOperationException("GTEC_ATTACHMENT_ROOT is not configured.");
    }

    [HttpGet]
    [Produces("image/jpeg", "image/png", "application/pdf")]
    public IActionResult Download([FromQuery] string path)
    {
        if (string.IsNullOrWhiteSpace(path) || Path.IsPathRooted(path))
            return BadRequest(new { message = "A relative attachment path is required." });

        var extension = Path.GetExtension(path);
        if (!AllowedExtensions.Contains(extension))
            return BadRequest(new { message = "Only JPG, PNG and PDF attachments are allowed." });

        string fullPath;
        try
        {
            fullPath = ResolveSafePath(path);
        }
        catch (InvalidOperationException)
        {
            _logger.LogWarning("Rejected attachment path outside GTEC_ATTACHMENT_ROOT: {Path}", path);
            return BadRequest(new { message = "Invalid attachment path." });
        }

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { message = "Attachment not found." });

        var contentType = extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };

        return File(
            new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true),
            contentType,
            enableRangeProcessing: true);
    }

    private string ResolveSafePath(string relativePath)
    {
        var root = Path.GetFullPath(_attachmentRoot);
        var fullPath = Path.GetFullPath(
            Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var relativeToRoot = Path.GetRelativePath(root, fullPath);

        if (relativeToRoot == ".." ||
            relativeToRoot.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) ||
            Path.IsPathRooted(relativeToRoot))
        {
            throw new InvalidOperationException("Attachment path escapes the configured root.");
        }

        return fullPath;
    }
}
