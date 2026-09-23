using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ApiCore.Models.Requests; 

namespace ApiCore.Controllers.Transaction
{
  //  [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Route("api/inbound")]
    [ApiController]
    public class InboundController : ControllerResponse
    {
        private readonly IInbound _inbound;
        public InboundController(IInbound inbound)
        {
            _inbound = inbound ?? throw new ArgumentNullException(nameof(inbound));
        }

        /// <summary>
        /// Save Inbound - บันทึกรายการ Inbound
        /// </summary>
        [HttpPost("save")]
        [ProducesResponseType(typeof(InboundResponse), 200)]
        public async Task<IActionResult> SaveInbound([FromBody] SaveInboundRequest request)
        {
            try
            {
                request.Device = GetClientIpAddress();

                var result = await _inbound.SaveInboundAsync(request);

                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to save inbound");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete Inbound Order - ลบคำสั่ง Inbound (เฉพาะสถานะ OPEN)
        /// </summary>
        [HttpPost("delete-order")]
        [ProducesResponseType(typeof(DeleteInboundOrderResponse), 200)]
        public async Task<IActionResult> DeleteInboundOrder([FromBody] DeleteInboundOrderRequest request)
        {
            try
            {
                request.Device = GetClientIpAddress();

                var result = await _inbound.DeleteInboundOrderAsync(request);

                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to delete inbound order");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Close Inbound Order - ปิดคำสั่ง Inbound (CLOSED)
        /// </summary>
        [HttpPost("close-order")]
        [ProducesResponseType(typeof(CloseInboundOrderResponse), 200)]
        public async Task<IActionResult> CloseInboundOrder([FromBody] CloseInboundOrderRequest request)
        {
            try
            {
                request.Device = GetClientIpAddress();

                var result = await _inbound.CloseInboundOrderAsync(request);
                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to delete inbound order");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Close Receipt - ปิดการรับของ
        /// </summary>
        [HttpPost("close-receipt")]
        [ProducesResponseType(typeof(ReceiptResponse), 200)]
        public async Task<IActionResult> CloseReceipt([FromBody] CloseReceiptRequest request)
        {
            try
            {
                request.Device = GetClientIpAddress();

                var result = await _inbound.CloseReceiptAsync(request);

                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to close receipt");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Save Receipt - บันทึกการรับของ
        /// </summary>
        [HttpPost("save-receipt")]
        [ProducesResponseType(typeof(ReceiptResponse), 200)]
        public async Task<IActionResult> SaveReceipt([FromBody] SaveReceiptRequest request)
        {
            try
            {
                var result = await _inbound.SaveReceiptAsync(request);

                if (result.Success)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseError(result.Message ?? "Failed to save receipt");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get Receipt - ดึงข้อมูล Receipt ตาม receipt_header_id
        /// </summary>
        [HttpGet("receipt/{receiptHeaderId}")]
        [ProducesResponseType(typeof(ReceiptHeaderResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetReceipt(int receiptHeaderId)
        {
            try
            {
                var result = await _inbound.GetReceiptAsync(receiptHeaderId);

                if (result != null)
                {
                    return AccessResponseDataSuccess("success", result);
                }

                return ResponseNotFound("Receipt not found");
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get Inbound Details - ดึงรายละเอียด Inbound ตาม inbound_master_id
        /// </summary>
        [HttpGet("details/{inboundMasterId}")]
        [ProducesResponseType(typeof(List<InboundDetailResponse>), 200)]
        public async Task<IActionResult> GetInboundDetails(int inboundMasterId)
        {
            try
            {
                var result = await _inbound.GetInboundDetailsAsync(inboundMasterId);
                return AccessResponseDataSuccess("success", result);
            }
            catch (Exception ex)
            {
                return ResponseError($"Error: {ex.Message}");
            }
        }
    }
}
