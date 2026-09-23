using AiAssistant.Models.Entities;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Loads and assembles prompts from the ais schema tables.
/// </summary>
public class PromptService : IPromptService
{
    private readonly string _connectionString;
    private readonly ILogger<PromptService> _logger;

    public PromptService(IConfiguration configuration, ILogger<PromptService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _logger = logger;
    }

    public async Task<SystemPrompt?> GetActiveSystemPromptAsync()
    {
        const string sql = @"
            SELECT TOP 1 
                system_prompt_id AS SystemPromptId,
                prompt_name AS PromptName,
                system_prompt AS SystemPromptText,
                description AS Description,
                is_active AS IsActive,
                create_by AS CreatedBy,
                create_date AS CreatedDate,
                update_by AS UpdatedBy,
                update_date AS UpdatedDate
            FROM ais.t_ai_system_prompt
            WHERE is_active = 1
            ORDER BY system_prompt_id ASC";

        using var connection = new SqlConnection(_connectionString);
        return await connection.QueryFirstOrDefaultAsync<SystemPrompt>(sql);
    }

    public async Task<AiPageConfig?> GetPageConfigAsync(string process)
    {
        const string sql = @"
            SELECT 
                ai_config_id AS AiConfigId,
                process AS Process,
                page_name AS PageName,
                sub_system_prompt AS SubSystemPrompt,
                allowed_tables AS AllowedTables,
                allowed_columns AS AllowedColumns,
                sample_queries AS SampleQueries,
                system_prompt_id AS SystemPromptId,
                is_active AS IsActive,
                create_by AS CreatedBy,
                create_date AS CreatedDate,
                update_by AS UpdatedBy,
                update_date AS UpdatedDate
            FROM ais.t_ai_page_config
            WHERE process = @Process AND is_active = 1";

        using var connection = new SqlConnection(_connectionString);
        return await connection.QueryFirstOrDefaultAsync<AiPageConfig>(sql, new { Process = process });
    }

    public async Task<IEnumerable<string>> GetActiveProcessesAsync()
    {
        const string sql = @"
            SELECT process 
            FROM ais.t_ai_page_config 
            WHERE is_active = 1";

        using var connection = new SqlConnection(_connectionString);
        return await connection.QueryAsync<string>(sql);
    }

    public async Task<SystemPrompt?> GetSystemPromptByIdAsync(int systemPromptId)
    {
        const string sql = @"
            SELECT TOP 1 
                system_prompt_id AS SystemPromptId,
                prompt_name AS PromptName,
                system_prompt AS SystemPromptText,
                description AS Description,
                is_active AS IsActive,
                create_by AS CreatedBy,
                create_date AS CreatedDate,
                update_by AS UpdatedBy,
                update_date AS UpdatedDate
            FROM ais.t_ai_system_prompt
            WHERE system_prompt_id = @SystemPromptId AND is_active = 1";

        using var connection = new SqlConnection(_connectionString);
        return await connection.QueryFirstOrDefaultAsync<SystemPrompt>(sql, new { SystemPromptId = systemPromptId });
    }

    public async Task<(string combinedPrompt, int? systemPromptId, int? aiConfigId)> BuildCombinedPromptAsync(string process, int? systemPromptId = null)
    {
        var pageConfig = await GetPageConfigAsync(process);

        // Explicit overrides are used by broad admin chat pages. Otherwise use the page config prompt.
        SystemPrompt? systemPrompt = null;
        var requestedSystemPromptId = systemPromptId ?? pageConfig?.SystemPromptId;
        if (requestedSystemPromptId != null)
        {
            systemPrompt = await GetSystemPromptByIdAsync(requestedSystemPromptId.Value);
            if (systemPrompt == null)
            {
                _logger.LogWarning("System prompt id {Id} not found or inactive. Falling back to default.", requestedSystemPromptId);
            }
        }
        systemPrompt ??= await GetActiveSystemPromptAsync();

        var parts = new List<string>();

        if (systemPrompt != null)
        {
            parts.Add("=== SYSTEM INSTRUCTIONS ===");
            parts.Add(systemPrompt.SystemPromptText);
        }
        else
        {
            _logger.LogWarning("No active system prompt found. Using minimal default.");
            parts.Add("You are an AI Database Assistant. Only generate SELECT queries. Respond in the user's language.");
        }

        if (pageConfig != null)
        {
            parts.Add("\n=== PAGE CONTEXT ===");
            parts.Add($"Current Page: {pageConfig.PageName} ({pageConfig.Process})");
            parts.Add(pageConfig.SubSystemPrompt);

            if (!string.IsNullOrEmpty(pageConfig.AllowedTables))
            {
                parts.Add($"\nAllowed Tables: {pageConfig.AllowedTables}");
            }

            if (!string.IsNullOrEmpty(pageConfig.AllowedColumns))
            {
                parts.Add($"\nAllowed Columns: {pageConfig.AllowedColumns}");
            }

            if (!string.IsNullOrEmpty(pageConfig.SampleQueries))
            {
                parts.Add($"\nSample Queries: {pageConfig.SampleQueries}");
            }
        }
        else
        {
            _logger.LogWarning("No page config found for process: {Process}. Using system prompt only.", process);
        }

        var combinedPrompt = string.Join("\n", parts);
        return (combinedPrompt, systemPrompt?.SystemPromptId, pageConfig?.AiConfigId);
    }
}
