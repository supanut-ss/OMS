namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Service for AI-powered dashboard generation
/// </summary>
public interface IAiDashboardService
{   
    /// <summary>
    /// NEW: Fully AI-powered auto-dashboard generation
    /// AI analyzes schema, generates insights, creates questions, generates SQL, queries data, and builds widgets
    /// NO HARDCODED LOGIC - 100% AI-driven
    /// </summary>
    Task<object> GenerateAutoDashboardAsync(string context);

    /// <summary>
    /// Generate forecast dashboard from a question using 2-step AI process
    /// Step 1: AI generates SQL query from natural language question
    /// Step 2: Execute query to get REAL data from database
    /// Step 3: AI analyzes real data and creates forecast
    /// Step 4: Generate dashboard widget with insights
    /// NO MOCK DATA - uses actual database data
    /// </summary>
    Task<object> GenerateDashboardAsync(string question);
}
