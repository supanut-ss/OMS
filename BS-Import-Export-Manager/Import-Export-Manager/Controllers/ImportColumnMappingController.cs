using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Import_Export_Manager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ImportColumnMappingController : ControllerBase
    {
        private readonly IImportColumnMapping _importColumnMappingService;

        public ImportColumnMappingController(IImportColumnMapping importColumnMappingService)
        {
            _importColumnMappingService = importColumnMappingService;
        }

        [HttpGet("GetImportColumnMappings")]
        public async Task<IActionResult> GetImportColumnMappings(
            int importId,
            int page = 1,
            int limit = 10,
            string search = "",
            string sortBy = "column_order",
            string sortOrder = "asc")
        {
            var result = await _importColumnMappingService.GetImportColumnMappings(importId, page, limit, search, sortBy, sortOrder);
            if (result.code == "0")
            {
                return Ok(result);
            }
            return NotFound(result);
        }

        [HttpGet("GetImportColumnMapping")]
        public async Task<IActionResult> GetImportColumnMappingById(int mappingId)
        {
            var result = await _importColumnMappingService.GetImportColumnMappingById(mappingId);
            if (result.code == "0")
            {
                return Ok(result);
            }
            return NotFound(result);
        }

        [HttpPost("CreateImportColumnMapping")]
        public async Task<IActionResult> CreateImportColumnMapping([FromBody] ImportColumnMappingRequest request)
        {
            var result = await _importColumnMappingService.CreateImportColumnMapping(request);
            if (result.code == "0")
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPost("UpdateImportColumnMapping")]
        public async Task<IActionResult> UpdateImportColumnMapping(int mappingId, [FromBody] ImportColumnMappingRequest request)
        {
            var result = await _importColumnMappingService.UpdateImportColumnMapping(mappingId, request);
            if (result.code == "0")
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPost("DeleteImportColumnMapping")]
        public async Task<IActionResult> DeleteImportColumnMapping(int mappingId)
        {
            var result = await _importColumnMappingService.DeleteImportColumnMapping(mappingId);
            if (result.code == "0")
            {
                return Ok(result);
            }
            return BadRequest(result);
        }
    }
}