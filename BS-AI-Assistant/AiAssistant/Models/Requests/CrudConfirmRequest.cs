using System.Collections.Generic;

namespace AiAssistant.Models.Requests
{
    /// <summary>
    /// Request model for confirming an AI-generated CRUD proposal.
    /// </summary>
    public class CrudConfirmRequest
    {
        /// <summary>
        /// Optional audit row id from the proposal step. If provided, confirmation result will update the same row.
        /// </summary>
        public long? AiCrudAuditLogId { get; set; }

        /// <summary>
        /// Optional request id/correlation id.
        /// </summary>
        public string? RequestId { get; set; }

        /// <summary>
        /// The current page/process path (e.g., "/master/item").
        /// </summary>
        public string Process { get; set; } = string.Empty;

        /// <summary>
        /// User ID that confirms the CRUD proposal.
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// CRUD action to execute: insert, update, or delete. Delete is executed as soft delete (update is_active = false).
        /// </summary>
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// Target table name. Supports schema.table format.
        /// </summary>
        public string Table { get; set; } = string.Empty;

        /// <summary>
        /// Field/value payload for insert/update. For delete, this is optional because system enforces is_active = false.
        /// </summary>
        public Dictionary<string, object>? Fields { get; set; }

        /// <summary>
        /// Condition payload for update/delete.
        /// </summary>
        public Dictionary<string, object>? Where { get; set; }

        /// <summary>
        /// Optional user message for audit log.
        /// </summary>
        public string? UserMessage { get; set; }
    }
}
