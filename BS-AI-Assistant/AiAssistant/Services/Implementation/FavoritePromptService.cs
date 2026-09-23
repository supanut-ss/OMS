using System.Text.RegularExpressions;
using AiAssistant.Models.Entities;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

public class FavoritePromptService : IFavoritePromptService
{
    private readonly string _connectionString;
    private readonly ILogger<FavoritePromptService> _logger;

    public FavoritePromptService(IConfiguration configuration, ILogger<FavoritePromptService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _logger = logger;
    }

    public async Task<IReadOnlyList<FavoritePrompt>> GetFavoritesAsync(string process, string userId)
    {
        const string sql = @"
            SELECT
                ai_fav_id AS AiFavId,
                process AS Process,
                user_id AS UserId,
                user_message AS UserMessage,
                create_date AS CreateDate,
                update_date AS UpdateDate,
                is_active AS IsActive
            FROM ais.t_ai_favorite_prompts
            WHERE process = @Process
              AND user_id = @UserId
              AND is_active = 1
            ORDER BY ISNULL(update_date, create_date) DESC, ai_fav_id DESC";

        using var connection = new SqlConnection(_connectionString);
        var result = await connection.QueryAsync<FavoritePrompt>(sql, new
        {
            Process = process,
            UserId = userId
        });

        return result.ToList();
    }

    public async Task<(bool isFavorite, long aiFavId)> ToggleFavoriteAsync(string process, string userId, string userMessage)
    {
        if (string.IsNullOrWhiteSpace(process))
            throw new ArgumentException("Process is required.", nameof(process));
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(userMessage))
            throw new ArgumentException("UserMessage is required.", nameof(userMessage));

        var normalizedInput = NormalizeForComparison(userMessage);

        const string findSql = @"
            SELECT
                ai_fav_id AS AiFavId,
                process AS Process,
                user_id AS UserId,
                user_message AS UserMessage,
                create_date AS CreateDate,
                update_date AS UpdateDate,
                is_active AS IsActive
            FROM ais.t_ai_favorite_prompts
            WHERE process = @Process
              AND user_id = @UserId
            ORDER BY ai_fav_id DESC";

        using var connection = new SqlConnection(_connectionString);
        var existingRows = (await connection.QueryAsync<FavoritePrompt>(findSql, new
        {
            Process = process,
            UserId = userId
        })).ToList();

        var existing = existingRows.FirstOrDefault(row =>
            NormalizeForComparison(row.UserMessage) == normalizedInput);

        if (existing is null)
        {
            const string insertSql = @"
                INSERT INTO ais.t_ai_favorite_prompts
                    (process, user_id, user_message, create_date, update_date, is_active)
                VALUES
                    (@Process, @UserId, @UserMessage, GETDATE(), NULL, 1);
                SELECT CAST(SCOPE_IDENTITY() AS BIGINT);";

            var newId = await connection.ExecuteScalarAsync<long>(insertSql, new
            {
                Process = process.Trim(),
                UserId = userId.Trim(),
                UserMessage = userMessage.Trim()
            });

            return (true, newId);
        }

        var nextIsFavorite = existing.IsActive != true;

        const string updateSql = @"
            UPDATE ais.t_ai_favorite_prompts
            SET is_active = @IsActive,
                update_date = GETDATE()
            WHERE ai_fav_id = @AiFavId";

        await connection.ExecuteAsync(updateSql, new
        {
            IsActive = nextIsFavorite,
            existing.AiFavId
        });

        _logger.LogDebug("Favorite prompt toggled. Process={Process}, UserId={UserId}, AiFavId={AiFavId}, IsFavorite={IsFavorite}",
            process, userId, existing.AiFavId, nextIsFavorite);

        return (nextIsFavorite, existing.AiFavId);
    }

    private static string NormalizeForComparison(string text)
    {
        return Regex.Replace(text.Trim().ToLowerInvariant(), @"\s+", " ");
    }
}
