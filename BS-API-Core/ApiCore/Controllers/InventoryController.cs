using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ApiCore.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class InventoryController : ControllerResponse
    {
        private readonly IInventory _inventory;
        public InventoryController(IInventory inventory)
        {
            _inventory = inventory;
        }

        [HttpPost("ChangeLocation")]
        public async Task<InventoryResponse> ChangeLocation([FromBody] ChangeLocationRequest request)
        {
            request.Device = GetClientIpAddress();
            return await _inventory.ChangeLocation(request);
        }
        [HttpPost("StatusChange")]
        public async Task<InventoryResponse> StatusChange([FromBody] StatusChangeRequest request)
        {
            request.Device = GetClientIpAddress();
            return await _inventory.StatusChange(request);
        }
        [HttpPost("Adjustment")]
        public async Task<InventoryResponse> Adjustment([FromBody] AdjustmentRequest request)
        {
            request.Device = GetClientIpAddress();
            return await _inventory.Adjustment(request);
        }
        [HttpPost("AdjustIn")]
        public async Task<InventoryResponse> AdjustIn([FromBody] AdjustInRequest request)
        {
            request.Device = GetClientIpAddress();
            return await _inventory.AdjustIn(request);
        }

    }
}
