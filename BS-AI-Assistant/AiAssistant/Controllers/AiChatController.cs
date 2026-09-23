using AiAssistant.Models.Requests;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace AiAssistant.Controllers;

/// <summary>
/// AI Chat Controller - Main endpoint for the AI Database Assistant.
/// </summary>
[ApiController]
[Route("api/ai")]
[Produces("application/json")]
public class AiChatController : ControllerBase
{
    private readonly IAiOrchestratorService _orchestratorService;
    private readonly IFavoritePromptService _favoritePromptService;
    private readonly IRateLimitService _rateLimitService;
    private readonly IAiProviderConfigService _providerConfigService;
    private readonly ILogger<AiChatController> _logger;

    public AiChatController(
        IAiOrchestratorService orchestratorService,
        IFavoritePromptService favoritePromptService,
        IRateLimitService rateLimitService,
        IAiProviderConfigService providerConfigService,
        ILogger<AiChatController> logger)
    {
        _orchestratorService = orchestratorService;
        _favoritePromptService = favoritePromptService;
        _rateLimitService = rateLimitService;
        _providerConfigService = providerConfigService;
        _logger = logger;
    }

    /// <summary>
    /// Process a natural language chat request through the AI Database Assistant.
    /// The AI will either respond directly (BYPASS_SQL) or generate and execute SQL queries (GENERATE_SQL).
    /// </summary>
    /// <param name="request">The chat request containing process context, user message, and user ID.</param>
    /// <returns>AI response with decision trace, generated SQL (if any), and token usage.</returns>
    [HttpPost("chat")]
    [SwaggerOperation(
        Summary = "AI Chat - Ask questions about database data",
        Description = "Send a natural language question. The AI will determine whether to answer directly or generate SQL to query the database."
    )]
    [SwaggerResponse(200, "Successful AI response", typeof(ChatResponse))]
    [SwaggerResponse(400, "Invalid request")]
    [SwaggerResponse(500, "Internal server error")]
    public async Task<ActionResult<ChatResponse>> Chat([FromBody] ChatRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ChatResponse
            {
                Success = false,
                ErrorMessage = "Invalid request. Please provide process, user_message, and user_id."
            });
        }

        _logger.LogInformation(
            "Chat request received - User: {UserId}, Process: {Process}, Message length: {Length}",
            request.UserId, request.Process, request.UserMessage.Length);

        var response = await _orchestratorService.ProcessChatAsync(request);
        return Ok(response);
    }

    /// <summary>
    /// Confirm and execute a CRUD proposal returned by the AI chat pipeline.
    /// </summary>
    /// <param name="request">CRUD confirmation payload.</param>
    /// <returns>Execution result with affected rows and status.</returns>
    [HttpPost("confirm")]
    [SwaggerOperation(
        Summary = "Confirm AI CRUD Proposal",
        Description = "Confirms a draft AI CRUD proposal and executes it in the database. Delete is executed as soft-delete (is_active = false)."
    )]
    [SwaggerResponse(200, "CRUD executed successfully", typeof(CrudConfirmResponse))]
    [SwaggerResponse(400, "Invalid request")]
    [SwaggerResponse(500, "Internal server error")]
    public async Task<ActionResult<CrudConfirmResponse>> ConfirmCrud([FromBody] CrudConfirmRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new CrudConfirmResponse
            {
                Success = false,
                ErrorMessage = "Invalid request. Please provide process, user_id, action, and table.",
                Message = "ข้อมูลยืนยันคำสั่งไม่ครบถ้วน"
            });
        }

        _logger.LogInformation(
            "CRUD confirm request received - User: {UserId}, Process: {Process}, Action: {Action}, Table: {Table}",
            request.UserId, request.Process, request.Action, request.Table);

        var result = await _orchestratorService.ConfirmCrudAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Reject a CRUD proposal returned by the AI chat pipeline without executing it.
    /// </summary>
    /// <param name="request">CRUD rejection payload.</param>
    /// <returns>Rejection result with updated status.</returns>
    [HttpPost("reject")]
    [SwaggerOperation(
        Summary = "Reject AI CRUD Proposal",
        Description = "Rejects a draft AI CRUD proposal and marks the audit status as rejected without writing to the database."
    )]
    [SwaggerResponse(200, "CRUD proposal rejected successfully", typeof(CrudConfirmResponse))]
    [SwaggerResponse(400, "Invalid request")]
    [SwaggerResponse(500, "Internal server error")]
    public async Task<ActionResult<CrudConfirmResponse>> RejectCrud([FromBody] CrudConfirmRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new CrudConfirmResponse
            {
                Success = false,
                ErrorMessage = "Invalid request. Please provide process, user_id, action, and table.",
                Message = "ข้อมูลยกเลิกคำสั่งไม่ครบถ้วน"
            });
        }

        _logger.LogInformation(
            "CRUD reject request received - User: {UserId}, Process: {Process}, Action: {Action}, Table: {Table}",
            request.UserId, request.Process, request.Action, request.Table);

        var result = await _orchestratorService.RejectCrudAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Generate AI-powered quick-pick question suggestions for a given page/process context.
    /// </summary>
    /// <param name="request">The suggestions request containing process context and desired count.</param>
    /// <returns>A list of suggested questions the user can tap to ask quickly.</returns>
    [HttpPost("suggestions")]
    [SwaggerOperation(
        Summary = "Generate Question Suggestions",
        Description = "Returns a list of AI-generated suggested questions relevant to the current page/process context. The user can tap a suggestion to send it as a quick question."
    )]
    [SwaggerResponse(200, "Suggestions generated successfully", typeof(SuggestionsResponse))]
    [SwaggerResponse(400, "Invalid request")]
    [SwaggerResponse(500, "Internal server error")]
    public async Task<ActionResult<SuggestionsResponse>> GetSuggestions([FromBody] SuggestionsRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new SuggestionsResponse
            {
                Success = false,
                ErrorMessage = "Invalid request. Please provide a valid process."
            });
        }

        _logger.LogInformation(
            "Suggestions request received - User: {UserId}, Process: {Process}, Count: {Count}",
            request.UserId, request.Process, request.Count);

        var response = await _orchestratorService.GenerateSuggestionsAsync(request);
        return Ok(response);
    }

    /// <summary>
    /// Get active favorite prompts for a user and process.
    /// </summary>
    [HttpGet("favorite-prompts")]
    [SwaggerOperation(
        Summary = "Get Favorite Prompts",
        Description = "Returns active favorite prompts for the specified user and process/page."
    )]
    [SwaggerResponse(200, "Favorite prompts retrieved", typeof(FavoritePromptListResponse))]
    [SwaggerResponse(400, "Invalid request")]
    [SwaggerResponse(500, "Internal server error")]
    public async Task<ActionResult<FavoritePromptListResponse>> GetFavoritePrompts(
        [FromQuery(Name = "process")] string process,
        [FromQuery(Name = "user_id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(process) || string.IsNullOrWhiteSpace(userId))
        {
            return BadRequest(new FavoritePromptListResponse
            {
                Success = false,
                ErrorMessage = "Invalid request. Please provide process and user_id."
            });
        }

        try
        {
            var favorites = await _favoritePromptService.GetFavoritesAsync(process, userId);
            return Ok(new FavoritePromptListResponse
            {
                Success = true,
                Favorites = favorites.Select(f => new FavoritePromptItemResponse
                {
                    AiFavId = f.AiFavId,
                    Process = f.Process,
                    UserId = f.UserId,
                    UserMessage = f.UserMessage,
                    CreateDate = f.CreateDate,
                    UpdateDate = f.UpdateDate
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve favorite prompts. User: {UserId}, Process: {Process}", userId, process);
            return StatusCode(500, new FavoritePromptListResponse
            {
                Success = false,
                ErrorMessage = "An error occurred while retrieving favorite prompts."
            });
        }
    }

    /// <summary>
    /// Toggle favorite state for a prompt (active to inactive or vice versa).
    /// </summary>
    [HttpPost("favorite-prompts/toggle")]
    [SwaggerOperation(
        Summary = "Toggle Favorite Prompt",
        Description = "Creates a favorite prompt if not found, re-activates if inactive, or deactivates if already active."
    )]
    [SwaggerResponse(200, "Favorite state updated", typeof(FavoritePromptToggleResponse))]
    [SwaggerResponse(400, "Invalid request")]
    [SwaggerResponse(500, "Internal server error")]
    public async Task<ActionResult<FavoritePromptToggleResponse>> ToggleFavoritePrompt([FromBody] FavoritePromptRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new FavoritePromptToggleResponse
            {
                Success = false,
                ErrorMessage = "Invalid request. Please provide process, user_id, and user_message."
            });
        }

        try
        {
            var (isFavorite, aiFavId) = await _favoritePromptService.ToggleFavoriteAsync(
                request.Process,
                request.UserId,
                request.UserMessage);

            return Ok(new FavoritePromptToggleResponse
            {
                Success = true,
                IsFavorite = isFavorite,
                AiFavId = aiFavId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to toggle favorite prompt. User: {UserId}, Process: {Process}",
                request.UserId,
                request.Process);

            return StatusCode(500, new FavoritePromptToggleResponse
            {
                Success = false,
                ErrorMessage = "An error occurred while updating favorite prompt."
            });
        }
    }

    /// <summary>
    /// Health check endpoint for the AI Assistant service.
    /// </summary>
    [HttpGet("health")]
    [SwaggerOperation(Summary = "Health Check", Description = "Check if the AI Assistant service is running.")]
    [SwaggerResponse(200, "Service is healthy")]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "healthy",
            service = "BS-AI-Assistance",
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Get all active page configuration processes.
    /// </summary>
    /// <returns>A list of process paths that have AI assistance enabled.</returns>
    [HttpGet("active-configs")]
    [SwaggerOperation(
        Summary = "Get Active AI Processes",
        Description = "Returns a list of UI process paths where AI assistance is active."
    )]
    [SwaggerResponse(200, "List of active processes", typeof(IEnumerable<string>))]
    [SwaggerResponse(500, "Internal server error")]
    public async Task<ActionResult<IEnumerable<string>>> GetActiveConfigs([FromServices] IPromptService promptService)
    {
        try
        {
            var activeProcesses = await promptService.GetActiveProcessesAsync();
            return Ok(activeProcesses);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve active AI configurations");
            return StatusCode(500, new { error = "An error occurred while retrieving configurations." });
        }
    }

    /// <summary>
    /// Check the current OpenRouter API key usage, credit balance, and rate limit information.
    /// </summary>
    [HttpGet("rate-limit")]
    [SwaggerOperation(
        Summary = "Check Rate Limit & Credits",
        Description = "Returns real-time API key usage (daily/weekly/monthly), remaining credits, and free-tier rate limit details from OpenRouter."
    )]
    [SwaggerResponse(200, "Rate limit information retrieved successfully", typeof(RateLimitResponse))]
    [SwaggerResponse(500, "Failed to retrieve rate limit information")]
    public async Task<ActionResult<RateLimitResponse>> GetRateLimit()
    {
        try
        {
            var result = await _rateLimitService.GetRateLimitInfoAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve rate limit info from OpenRouter");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Return the currently active AI provider config (what is in the in-process cache, or loaded fresh from DB).
    /// Useful for debugging provider switches without restarting the container.
    /// </summary>
    [HttpGet("provider-config")]
    [SwaggerOperation(
        Summary = "Get Active Provider Config",
        Description = "Returns the currently active AI provider configuration (BaseUrl, ChatEndpoint, models). " +
                      "Reads from the in-process cache; call POST /api/ai/config/refresh first to see DB changes."
    )]
    [SwaggerResponse(200, "Active provider config")]
    [SwaggerResponse(500, "Failed to load provider config")]
    public async Task<IActionResult> GetProviderConfig()
    {
        try
        {
            var config = await _providerConfigService.GetActiveConfigAsync();
            return Ok(new
            {
                providerConfigId = config.ProviderConfigId,
                providerName = config.ProviderName,
                baseUrl = config.BaseUrl,
                chatEndpoint = config.ChatEndpoint,
                fullEndpointUrl = config.FullEndpointUrl,
                timeoutSeconds = config.TimeoutSeconds,
                models = config.Models,
                allowFileAttachment = config.AllowFileAttachment,
                allowedFileTypes = config.AllowedFileTypesList
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load AI provider config");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Invalidate the in-process provider config cache so the next request reloads from DB.
    /// Call this after changing ais.t_ai_provider_config or ais.t_ai_model_priority
    /// without restarting the container.
    /// </summary>
    [HttpPost("config/refresh")]
    [SwaggerOperation(
        Summary = "Refresh Provider Config Cache",
        Description = "Clears the in-process cache for AI provider configuration. " +
                      "The next request (or GET /api/ai/provider-config) will reload fresh config from the database."
    )]
    [SwaggerResponse(200, "Cache cleared — next request will reload from DB")]
    public IActionResult RefreshProviderConfig()
    {
        _providerConfigService.InvalidateCache();
        _logger.LogInformation("AI provider config cache invalidated via API request.");
        return Ok(new
        {
            message = "Provider config cache cleared. Next request will reload from DB.",
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Get aggregated statistics for the AI Admin Console overview dashboard.
    /// </summary>
    [HttpGet("overview-stats")]
    [SwaggerOperation(
        Summary = "Get AI Overview Stats",
        Description = "Returns aggregated stats: active providers, knowledge counts, schema coverage, and recent chat activity."
    )]
    [SwaggerResponse(200, "Overview stats", typeof(OverviewStatsResponse))]
    [SwaggerResponse(500, "Failed to load stats")]
    public async Task<ActionResult<OverviewStatsResponse>> GetOverviewStats(
        [FromServices] IOverviewStatsService overviewStatsService,
        CancellationToken cancellationToken = default)
    {
        var result = await overviewStatsService.GetStatsAsync(cancellationToken);
        if (!result.Success)
        {
            return StatusCode(500, result);
        }

        return Ok(result);
    }
}

