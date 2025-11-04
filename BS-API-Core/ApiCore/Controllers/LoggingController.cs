using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ApiCore.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoggingController : ControllerBase
    {
        [HttpPost("log")]
        public async Task<IActionResult> Log([FromBody] LogRequest request)
        {
            try
            {
                var now = DateTime.Now;
                var year = now.Year.ToString();
                var month = now.Month.ToString("D2");
                var day = now.Day.ToString("D2");
                var logDir = Path.Combine("Logs", year, month, day);
                Directory.CreateDirectory(logDir);
                var logFile = Path.Combine(logDir, "logs.txt");
                var logEntry = $"{now:yyyy-MM-dd HH:mm:ss} [{request.Level.ToUpper()}] {request.Message}{Environment.NewLine}";
                await System.IO.File.AppendAllTextAsync(logFile, logEntry);
                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error logging: {ex.Message}");
            }
        }
    }

    public class LogRequest
    {
        public string Level { get; set; }
        public string Message { get; set; }
    }
}