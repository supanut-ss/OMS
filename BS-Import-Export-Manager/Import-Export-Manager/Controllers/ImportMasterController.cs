using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Import_Export_Manager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ImportMasterController : ControllerBase
    {
        private readonly IImportMaster _importMasterService;
        public ImportMasterController(IImportMaster importMasterService)
        {
            _importMasterService = importMasterService;
        }
        [HttpGet]
        public async Task<IActionResult> GetImportMasters(int page = 1, int limit = 10, string search = "", string sortBy = "import_id", string sortOrder = "asc")
        {
            var result = await _importMasterService.GetImportMasters(page, limit, search, sortBy, sortOrder);
            if (result.code == "200")
            {
                return Ok(result);
            }
            return StatusCode(int.Parse(result.code), result);
        }
        [HttpGet("{import_id}")]
        public async Task<IActionResult> GetImportMasterById(int import_id)
        {
            var result = await _importMasterService.GetImportMasterById(import_id);
            if (result.code == "200")
            {
                return Ok(result);
            }
            return StatusCode(int.Parse(result.code), result);
        }
        [HttpPost]
        public async Task<IActionResult> CreateImportMaster([FromBody] ImportMasterRequest request)
        {
            var result = await _importMasterService.CreateImportMaster(request);
            if (result.code == "0")
            {
                return Ok(result);
            }
            else
            {
                return Ok(result.message);
            }
        }
        [HttpPut("{import_id}")]
        public async Task<IActionResult> UpdateImportMaster(int import_id, [FromBody] ImportMasterRequest request)
        {
            var result = await _importMasterService.UpdateImportMaster(import_id, request);
            if (result.code == "0")
            {
                return Ok(result);
            }
            else
            {
                return Ok(result.message);
            }
        }
        [HttpDelete("{import_id}")]
        public async Task<IActionResult> DeleteImportMaster(int import_id)
        {
            var result = await _importMasterService.DeleteImportMaster(import_id);
            if (result.code == "0")
            {
                return Ok(result);
            }
            else
            {
                return Ok(result.message);
            }
        }
    }
}
