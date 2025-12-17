using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace ApiCore.Controllers
{
    /// <summary>
    /// File Controller for uploading and downloading files
    /// Used by BSFileUploadDialog component
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FileController : ControllerBase
    {
        private readonly ILogger<FileController> _logger;
        private readonly IConfiguration _configuration;
        private readonly string _uploadPath;

        public FileController(ILogger<FileController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;

            // Get upload path from configuration or use default
            _uploadPath = _configuration["FileStorage:UploadPath"]
                ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");

            // Ensure upload directory exists
            if (!Directory.Exists(_uploadPath))
            {
                Directory.CreateDirectory(_uploadPath);
            }
        }

        /// <summary>
        /// Upload a file to the server
        /// </summary>
        /// <param name="file">The file to upload</param>
        /// <param name="foreignKey">Foreign key column name</param>
        /// <param name="foreignKeyValue">Foreign key value</param>
        /// <param name="tableName">Target table name</param>
        /// <param name="preObj">Schema prefix</param>
        /// <returns>Upload result with file path</returns>
        [HttpPost("upload")]
        [ProducesResponseType(typeof(FileUploadResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        [RequestSizeLimit(50 * 1024 * 1024)] // 50MB limit
        public async Task<ActionResult<FileUploadResponse>> UploadFile(
            [Required] IFormFile file,
            [FromForm] string? foreignKey = null,
            [FromForm] string? foreignKeyValue = null,
            [FromForm] string? tableName = null,
            [FromForm] string? preObj = null)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { message = "No file uploaded" });
                }

                // Validate file size (10MB default, can be configured)
                var maxFileSize = _configuration.GetValue<long>("FileStorage:MaxFileSize", 10 * 1024 * 1024);
                if (file.Length > maxFileSize)
                {
                    return BadRequest(new { message = $"File size exceeds maximum allowed size of {maxFileSize / 1024 / 1024}MB" });
                }

                // Generate unique file name to prevent overwriting
                var originalFileName = file.FileName;
                var fileExtension = Path.GetExtension(originalFileName);
                var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";

                // Create subfolder based on date and table name
                var dateFolder = DateTime.Now.ToString("yyyy/MM");
                var tableFolder = !string.IsNullOrEmpty(tableName) ? tableName : "general";
                var relativePath = Path.Combine(tableFolder, dateFolder);
                var fullFolderPath = Path.Combine(_uploadPath, relativePath);

                // Ensure folder exists
                if (!Directory.Exists(fullFolderPath))
                {
                    Directory.CreateDirectory(fullFolderPath);
                }

                var fullFilePath = Path.Combine(fullFolderPath, uniqueFileName);
                var relativeFilePath = Path.Combine(relativePath, uniqueFileName);

                // Save file to disk
                using (var stream = new FileStream(fullFilePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                _logger.LogInformation("File uploaded successfully: {FileName} -> {FilePath}",
                    originalFileName, relativeFilePath);

                return Ok(new FileUploadResponse
                {
                    Success = true,
                    Message = "File uploaded successfully",
                    FileName = originalFileName,
                    FilePath = relativeFilePath.Replace("\\", "/"),
                    FileSize = file.Length,
                    ContentType = file.ContentType,
                    UniqueFileName = uniqueFileName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file");
                return BadRequest(new { message = $"Error uploading file: {ex.Message}" });
            }
        }

        /// <summary>
        /// Download a file from the server
        /// </summary>
        /// <param name="path">Relative file path</param>
        /// <param name="name">Original file name for download</param>
        /// <param name="download">If true, force download instead of inline display</param>
        /// <returns>File content</returns>
        [HttpGet("download")]
        [ProducesResponseType(typeof(FileContentResult), 200)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> DownloadFile(
            [Required] string path,
            string? name = null,
            bool download = false)
        {
            try
            {
                // Sanitize path to prevent directory traversal attacks
                var sanitizedPath = path.Replace("..", "").Replace("\\", "/");
                var fullPath = Path.Combine(_uploadPath, sanitizedPath);

                // Verify path is within upload directory
                var fullUploadPath = Path.GetFullPath(_uploadPath);
                var fullFilePath = Path.GetFullPath(fullPath);

                if (!fullFilePath.StartsWith(fullUploadPath))
                {
                    _logger.LogWarning("Attempted directory traversal attack: {Path}", path);
                    return BadRequest(new { message = "Invalid file path" });
                }

                if (!System.IO.File.Exists(fullPath))
                {
                    return NotFound(new { message = "File not found" });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                var contentType = GetContentType(fullPath);
                var fileName = name ?? Path.GetFileName(fullPath);

                if (download)
                {
                    return File(fileBytes, contentType, fileName);
                }
                else
                {
                    // Display inline (for images, PDFs, etc.)
                    return File(fileBytes, contentType);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading file: {Path}", path);
                return BadRequest(new { message = $"Error downloading file: {ex.Message}" });
            }
        }

        /// <summary>
        /// Delete a file from the server
        /// </summary>
        /// <param name="path">Relative file path</param>
        /// <returns>Delete result</returns>
        [HttpDelete("delete")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 404)]
        [ProducesResponseType(401)]
        public ActionResult DeleteFile([Required] string path)
        {
            try
            {
                // Sanitize path to prevent directory traversal attacks
                var sanitizedPath = path.Replace("..", "").Replace("\\", "/");
                var fullPath = Path.Combine(_uploadPath, sanitizedPath);

                // Verify path is within upload directory
                var fullUploadPath = Path.GetFullPath(_uploadPath);
                var fullFilePath = Path.GetFullPath(fullPath);

                if (!fullFilePath.StartsWith(fullUploadPath))
                {
                    _logger.LogWarning("Attempted directory traversal attack: {Path}", path);
                    return BadRequest(new { message = "Invalid file path" });
                }

                if (!System.IO.File.Exists(fullPath))
                {
                    return NotFound(new { message = "File not found" });
                }

                System.IO.File.Delete(fullPath);

                _logger.LogInformation("File deleted successfully: {Path}", path);

                return Ok(new { success = true, message = "File deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file: {Path}", path);
                return BadRequest(new { message = $"Error deleting file: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get content type based on file extension
        /// </summary>
        private string GetContentType(string path)
        {
            var extension = Path.GetExtension(path).ToLowerInvariant();
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".bmp" => "image/bmp",
                ".svg" => "image/svg+xml",
                ".webp" => "image/webp",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xls" => "application/vnd.ms-excel",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".ppt" => "application/vnd.ms-powerpoint",
                ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ".txt" => "text/plain",
                ".csv" => "text/csv",
                ".json" => "application/json",
                ".xml" => "application/xml",
                ".zip" => "application/zip",
                ".rar" => "application/x-rar-compressed",
                ".7z" => "application/x-7z-compressed",
                _ => "application/octet-stream"
            };
        }
    }

    /// <summary>
    /// File upload response model
    /// </summary>
    public class FileUploadResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string ContentType { get; set; } = string.Empty;
        public string UniqueFileName { get; set; } = string.Empty;
    }
}
