using BS_Printing_Manager.Interfaces;
using BS_Printing_Manager.Models.Request;
using Microsoft.AspNetCore.Mvc;

namespace BS_Printing_Manager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrintController : ControllerBase
    {
        private readonly IPrintService _printService;

        public PrintController(IPrintService printService)
        {
            _printService = printService;
        }

        [HttpPost]
        public async Task<IActionResult> PrintAsync([FromBody] PrintRequest request)
        {
            await _printService.PrintReportAsync(request);
            return Ok("Print job sent successfully");
        }
    }
}
