namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Persists AI CRUD proposal/confirmation audit events.
/// </summary>
public interface IAiCrudAuditLogService
{
    Task<long?> CreateAsync(
        string process,
        string userId,
        long? aiChatLogId,
        string? requestId,
        string aiDecision,
        string action,
        string table,
        bool isProposal,
        string confirmStatus,
        string? generatedSql,
        string? executedSql,
        int? affectedRows,
        bool isSuccess,
        string? errorMessage,
        string? fieldsJson,
        string? whereJson,
        string? proposalPayloadJson,
        string? confirmPayloadJson,
        string? createdBy);

    Task UpdateConfirmationAsync(
        long aiCrudAuditLogId,
        string confirmStatus,
        string? executedSql,
        int? affectedRows,
        bool isSuccess,
        string? errorMessage,
        string? confirmPayloadJson,
        string? updatedBy);
}
