using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ApiCore.Models.Base;
using ApiCore.Services.Interfaces;
using Swashbuckle.AspNetCore.Annotations;
using System.Net;

namespace ApiCore.Controllers.Base
{
    /// <summary>
    /// Base controller providing common CRUD operations
    /// </summary>
    /// <typeparam name="TEntity">Entity type</typeparam>
    /// <typeparam name="TResponse">Response model type</typeparam>
    /// <typeparam name="TCreateRequest">Create request type</typeparam>
    /// <typeparam name="TUpdateRequest">Update request type</typeparam>
    /// <typeparam name="TSummaryResponse">Summary response type</typeparam>
    /// <typeparam name="TDataGridRequest">DataGrid request type</typeparam>
    [ApiController]
    [Authorize]
    public abstract class BaseController<TEntity, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest> : ControllerBase
        where TEntity : BaseEntity
        where TResponse : BaseResponse
        where TCreateRequest : BaseRequest
        where TUpdateRequest : BaseUpdateRequest
        where TDataGridRequest : DataGridRequest
    {
        protected readonly IBaseService<TEntity, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest> _service;

        protected BaseController(IBaseService<TEntity, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest> service)
        {
            _service = service;
        }

        /// <summary>
        /// Get all entities
        /// </summary>
        [HttpGet]
        [SwaggerResponse((int)HttpStatusCode.OK, "Success")]
        [SwaggerResponse((int)HttpStatusCode.BadRequest, "Bad Request")]
        public virtual async Task<ActionResult<List<TResponse>>> GetAll()
        {
            try
            {
                var result = await _service.GetAllAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get entity summary for dropdowns
        /// </summary>
        [HttpGet("summary")]
        [AllowAnonymous]
        [SwaggerResponse((int)HttpStatusCode.OK, "Success")]
        [SwaggerResponse((int)HttpStatusCode.BadRequest, "Bad Request")]
        public virtual async Task<ActionResult<List<TSummaryResponse>>> GetSummary()
        {
            try
            {
                var result = await _service.GetSummaryAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get entity by ID
        /// </summary>
        [HttpGet("{id}")]
        [SwaggerResponse((int)HttpStatusCode.OK, "Success")]
        [SwaggerResponse((int)HttpStatusCode.NotFound, "Not Found")]
        [SwaggerResponse((int)HttpStatusCode.BadRequest, "Bad Request")]
        public virtual async Task<ActionResult<TResponse>> GetById(string id)
        {
            try
            {
                var result = await _service.GetByIdAsync(id);
                if (result == null)
                    return NotFound(new { message = $"Entity with ID '{id}' not found" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Create new entity
        /// </summary>
        [HttpPost]
        [SwaggerResponse((int)HttpStatusCode.Created, "Created")]
        [SwaggerResponse((int)HttpStatusCode.BadRequest, "Bad Request")]
        public virtual async Task<ActionResult<TResponse>> Create([FromBody] TCreateRequest request)
        {
            try
            {
                var result = await _service.CreateAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Update entity
        /// </summary>
        [HttpPut("{id}")]
        [SwaggerResponse((int)HttpStatusCode.OK, "Updated")]
        [SwaggerResponse((int)HttpStatusCode.NotFound, "Not Found")]
        [SwaggerResponse((int)HttpStatusCode.BadRequest, "Bad Request")]
        public virtual async Task<ActionResult<TResponse>> Update(string id, [FromBody] TUpdateRequest request)
        {
            try
            {
                if (request.Id != id)
                    return BadRequest(new { message = "ID mismatch between URL and request body" });

                var result = await _service.UpdateAsync(request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Delete entity
        /// </summary>
        [HttpDelete("{id}")]
        [SwaggerResponse((int)HttpStatusCode.NoContent, "Deleted")]
        [SwaggerResponse((int)HttpStatusCode.NotFound, "Not Found")]
        [SwaggerResponse((int)HttpStatusCode.BadRequest, "Bad Request")]
        public virtual async Task<ActionResult> Delete(string id)
        {
            try
            {
                var success = await _service.DeleteAsync(id);
                if (!success)
                    return NotFound(new { message = $"Entity with ID '{id}' not found" });

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get DataGrid data with server-side processing
        /// </summary>
        [HttpPost("datagrid")]
        [SwaggerResponse((int)HttpStatusCode.OK, "Success")]
        [SwaggerResponse((int)HttpStatusCode.BadRequest, "Bad Request")]
        public virtual async Task<ActionResult<DataGridResponse<TResponse>>> GetDataGrid([FromBody] TDataGridRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest(new { message = "Request body is required" });

                var result = await _service.GetDataGridAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error retrieving DataGrid data: {ex.Message}" });
            }
        }

        /// <summary>
        /// Test DataGrid endpoint without authentication
        /// </summary>
        [HttpPost("datagrid-test")]
        [AllowAnonymous]
        [SwaggerResponse((int)HttpStatusCode.OK, "Success")]
        public virtual async Task<ActionResult<DataGridResponse<TResponse>>> GetDataGridTest([FromBody] TDataGridRequest request)
        {
            return await GetDataGrid(request);
        }
    }
}
