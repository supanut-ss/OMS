namespace AiAssistant.Models.Responses
{
    /// <summary>
    /// Response model for confirming and executing an AI-generated CRUD proposal.
    /// </summary>
    public class CrudConfirmResponse
    {
        /// <summary>
        /// CRUD audit log identifier for traceability.
        /// </summary>
        public long? AiCrudAuditLogId { get; set; }

        /// <summary>
        /// Indicates whether execution was successful.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Business-friendly message describing the result.
        /// </summary>
        public string? Message { get; set; }

        /// <summary>
        /// Final executed action (insert, update, or delete).
        /// </summary>
        public string? Action { get; set; }

        /// <summary>
        /// Target table for this action.
        /// </summary>
        public string? Table { get; set; }

        /// <summary>
        /// Number of rows affected by the command.
        /// </summary>
        public int? AffectedRows { get; set; }

        /// <summary>
        /// The SQL command executed by the server.
        /// </summary>
        public string? ExecutedSql { get; set; }

        /// <summary>
        /// Error details when execution fails.
        /// </summary>
        public string? ErrorMessage { get; set; }
    }
}
