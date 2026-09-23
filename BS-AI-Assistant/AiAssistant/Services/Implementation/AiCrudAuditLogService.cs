using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Writes CRUD proposal/confirmation audit records into ais.t_ai_crud_audit_log.
/// </summary>
public class AiCrudAuditLogService : IAiCrudAuditLogService
{
    private readonly string _connectionString;
    private readonly ILogger<AiCrudAuditLogService> _logger;

    public AiCrudAuditLogService(IConfiguration configuration, ILogger<AiCrudAuditLogService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _logger = logger;
    }

    public async Task<long?> CreateAsync(
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
        string? createdBy)
    {
        const string sql = @"
INSERT INTO ais.t_ai_crud_audit_log
(
    process,
    user_id,
    ai_chat_log_id,
    request_id,
    ai_decision,
    action,
    [table],
    is_proposal,
    confirm_status,
    generated_sql,
    executed_sql,
    affected_rows,
    is_success,
    error_message,
    fields_json,
    where_json,
    proposal_payload_json,
    confirm_payload_json,
    created_by
)
OUTPUT INSERTED.ai_crud_audit_log_id
VALUES
(
    @Process,
    @UserId,
    @AiChatLogId,
    @RequestId,
    @AiDecision,
    @Action,
    @Table,
    @IsProposal,
    @ConfirmStatus,
    @GeneratedSql,
    @ExecutedSql,
    @AffectedRows,
    @IsSuccess,
    @ErrorMessage,
    @FieldsJson,
    @WhereJson,
    @ProposalPayloadJson,
    @ConfirmPayloadJson,
    @CreatedBy
);";

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var id = await connection.ExecuteScalarAsync<long?>(sql, new
            {
                Process = process,
                UserId = userId,
                AiChatLogId = aiChatLogId,
                RequestId = requestId,
                AiDecision = aiDecision,
                Action = action,
                Table = table,
                IsProposal = isProposal,
                ConfirmStatus = confirmStatus,
                GeneratedSql = generatedSql,
                ExecutedSql = executedSql,
                AffectedRows = affectedRows,
                IsSuccess = isSuccess,
                ErrorMessage = errorMessage,
                FieldsJson = fieldsJson,
                WhereJson = whereJson,
                ProposalPayloadJson = proposalPayloadJson,
                ConfirmPayloadJson = confirmPayloadJson,
                CreatedBy = createdBy ?? userId
            });

            return id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create CRUD audit log. Process={Process}, User={UserId}, Action={Action}, Table={Table}", process, userId, action, table);
            return null;
        }
    }

    public async Task UpdateConfirmationAsync(
        long aiCrudAuditLogId,
        string confirmStatus,
        string? executedSql,
        int? affectedRows,
        bool isSuccess,
        string? errorMessage,
        string? confirmPayloadJson,
        string? updatedBy)
    {
        const string sql = @"
UPDATE ais.t_ai_crud_audit_log
SET
    confirm_status = @ConfirmStatus,
    executed_sql = @ExecutedSql,
    affected_rows = @AffectedRows,
    is_success = @IsSuccess,
    error_message = @ErrorMessage,
    confirm_payload_json = @ConfirmPayloadJson
WHERE ai_crud_audit_log_id = @AiCrudAuditLogId;";

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await connection.ExecuteAsync(sql, new
            {
                AiCrudAuditLogId = aiCrudAuditLogId,
                ConfirmStatus = confirmStatus,
                ExecutedSql = executedSql,
                AffectedRows = affectedRows,
                IsSuccess = isSuccess,
                ErrorMessage = errorMessage,
                ConfirmPayloadJson = confirmPayloadJson,
                UpdatedBy = updatedBy
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update CRUD audit log. AuditId={AuditId}, Status={Status}", aiCrudAuditLogId, confirmStatus);
        }
    }
}
