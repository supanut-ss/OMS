using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class InvoiceController : ControllerResponse
    {
        IInvoiceService invoiceService;
        public InvoiceController(IInvoiceService _invoiceService)
        {
            invoiceService = _invoiceService;
        }
        [HttpPost("invoice/delete/{projectTaskMemberId}")]
        public async Task<IActionResult> DeleteInvoice(int invoiceId)
        {
            try
            {
                var result = await invoiceService.DeleteInvoice(invoiceId);
                if (result != null)
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", "Delete assigned task member failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost("invoice")]
        public async Task<IActionResult> InsertOrUpdateInvoice([FromBody] InvoiceRequest invoice)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";
                var result = await invoiceService.InsertOrUpdateInvoice(invoice, userId);
                if (result != null)
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", "Insert/Update project team failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
    }
}
