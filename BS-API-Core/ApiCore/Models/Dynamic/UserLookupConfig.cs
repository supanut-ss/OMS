namespace ApiCore.Models.Dynamic
{
    /// <summary>
    /// Configuration for looking up user details in audit fields (create_by, update_by)
    /// </summary>
    public class UserLookupConfig
    {
        /// <summary>
        /// User table name with schema (e.g., "sec.t_com_user")
        /// </summary>
        public string? Table { get; set; }

        /// <summary>
        /// User ID field name (e.g., "user_id")
        /// </summary>
        public string? IdField { get; set; }

        /// <summary>
        /// Display fields to show (e.g., ["first_name", "last_name"])
        /// </summary>
        public List<string>? DisplayFields { get; set; }

        /// <summary>
        /// Separator between display fields (default: " ")
        /// </summary>
        public string? Separator { get; set; }
    }
}
