using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers.Transaction
{
    [Route("api/count")]
    [ApiController]
    public class CountController : ControllerResponse
    {
        private readonly ICount _count;
        public CountController(ICount count)
        {
            _count = count ?? throw new ArgumentNullException(nameof(count));
        }

        /// <summary>
        /// Save Count - บันทึกรายการ Count 
        /// </summary>
        [HttpPost("insert")]
        [ProducesResponseType(typeof(CountResponse), 200)]
        public async Task<IActionResult> InsertCount([FromBody] CountMasterRequest request)
        {
            try
            {
                request.Device = GetClientIpAddress();

                var result = await _count.InsertCountPlanAsync(request);

                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to save count");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete Count - ลบคำสั่ง Count (เฉพาะสถานะ OPEN)
        /// </summary>
        [HttpPost("delete")]
        [ProducesResponseType(typeof(DeleteCountRequest), 200)]
        public async Task<IActionResult> DeleteCount([FromBody] DeleteCountRequest request)
        {
            try
            {
                request.Device = GetClientIpAddress();

                var result = await _count.DeleteCountPlanAsync(request);

                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to delete count");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }


        /// <summary>
        /// Get Count Cycle - ดึงข้อมูลรายการ Count ตามเงื่อนไขที่กำหนด
        /// </summary>
        [HttpPost("cycleCountData")]
        [ProducesResponseType(typeof(CountCycleResponse), 200)]
        public async Task<IActionResult> GetCycleCount([FromBody] CountCycleRequest request)
        {
            try
            { 
                var result = await _count.GetCountCycleCountDataAsync(request);

                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to delete count");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

    }
}
