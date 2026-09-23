using System.Data.Common;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;

namespace ApiCore.Services.Implementation;

public sealed class PartAttachmentService : IPartAttachmentService
{
    private const long MaxFileSize = 10 * 1024 * 1024;
    private const string DownloadEndpoint = "/GtecAttachment/Download";

    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly ILogger<PartAttachmentService> _logger;
    private readonly string _attachmentRoot;

    public PartAttachmentService(
        ISqlConnectionFactory connectionFactory,
        ILogger<PartAttachmentService> logger,
        IConfiguration configuration)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
        _attachmentRoot = Environment.GetEnvironmentVariable("GTEC_ATTACHMENT_ROOT")
            ?? configuration["GtecAttachment:Root"]
            ?? throw new InvalidOperationException("GTEC_ATTACHMENT_ROOT is not configured.");
    }

    public async Task<PartAttachmentResponse?> GetAsync(long partId)
    {
        await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
        await using var command = CreateCommand(connection, null, """
            SELECT TOP (1)
                [part_attachment_id], [part_id], [attachment_type],
                [attachment_name], [mime_type], [storage_path]
            FROM [inv].[t_inv_part_attachment]
            WHERE [part_id] = @part_id;
            """);
        AddParameter(command, "@part_id", partId);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? Map(reader) : null;
    }

    public async Task<PartAttachmentResponse> UpsertAsync(long partId, IFormFile file, string createBy)
    {
        var fileInfo = await ValidateFileAsync(file);
        var relativePath = $"parts/{Guid.NewGuid():N}{fileInfo.Extension}";
        var fullPath = ResolveSafePath(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using (var output = new FileStream(
            fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await file.CopyToAsync(output);
        }

        try
        {
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            try
            {
                if (!await PartExistsAsync(connection, transaction, partId))
                    throw new KeyNotFoundException("Part was not found.");

                var existing = await GetForUpdateAsync(connection, transaction, partId);

                await using var command = existing is null
                    ? CreateCommand(connection, transaction, """
                        INSERT INTO [inv].[t_inv_part_attachment]
                        (
                            [part_id], [attachment_type], [attachment_name],
                            [mime_type], [storage_path], [create_by], [create_date]
                        )
                        OUTPUT INSERTED.[part_attachment_id]
                        VALUES
                        (
                            @part_id, @attachment_type, @attachment_name,
                            @mime_type, @storage_path, @create_by, GETDATE()
                        );
                        """)
                    : CreateCommand(connection, transaction, """
                        UPDATE [inv].[t_inv_part_attachment]
                        SET [attachment_type] = @attachment_type,
                            [attachment_name] = @attachment_name,
                            [mime_type] = @mime_type,
                            [storage_path] = @storage_path,
                            [create_by] = @create_by,
                            [create_date] = GETDATE()
                        OUTPUT INSERTED.[part_attachment_id]
                        WHERE [part_id] = @part_id;
                        """);

                AddParameter(command, "@part_id", partId);
                AddParameter(command, "@attachment_type", fileInfo.AttachmentType);
                AddParameter(command, "@attachment_name", Path.GetFileName(file.FileName));
                AddParameter(command, "@mime_type", fileInfo.MimeType);
                AddParameter(command, "@storage_path", relativePath);
                AddParameter(command, "@create_by", createBy);

                var attachmentId = Convert.ToInt64(await command.ExecuteScalarAsync());
                await transaction.CommitAsync();
                if (existing is not null &&
                    !string.Equals(existing.StoragePath, relativePath, StringComparison.OrdinalIgnoreCase))
                {
                    TryDeleteStoredFile(existing.StoragePath);
                }

                return new PartAttachmentResponse
                {
                    PartAttachmentId = attachmentId,
                    PartId = partId,
                    AttachmentType = fileInfo.AttachmentType,
                    AttachmentName = Path.GetFileName(file.FileName),
                    MimeType = fileInfo.MimeType,
                    StoragePath = relativePath,
                    ContentUrl = BuildContentUrl(relativePath)
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch
        {
            DeleteIfExists(fullPath);
            throw;
        }
    }

    public async Task<bool> DeleteAttachmentAsync(long partId)
    {
        await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        StagedFile? stagedFile = null;
        try
        {
            var existing = await GetForUpdateAsync(connection, transaction, partId);
            if (existing is null)
            {
                await transaction.RollbackAsync();
                return false;
            }

            stagedFile = StageFile(existing.StoragePath);
            await using var command = CreateCommand(connection, transaction,
                "DELETE FROM [inv].[t_inv_part_attachment] WHERE [part_id] = @part_id;");
            AddParameter(command, "@part_id", partId);
            await command.ExecuteNonQueryAsync();
            await transaction.CommitAsync();
            stagedFile?.DeleteStaged();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            stagedFile?.Restore();
            throw;
        }
    }

    public async Task<bool> DeletePartAsync(long partId)
    {
        await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        StagedFile? stagedFile = null;
        try
        {
            var existing = await GetForUpdateAsync(connection, transaction, partId);
            if (existing is not null)
                stagedFile = StageFile(existing.StoragePath);

            await using (var deleteAttachment = CreateCommand(connection, transaction,
                "DELETE FROM [inv].[t_inv_part_attachment] WHERE [part_id] = @part_id;"))
            {
                AddParameter(deleteAttachment, "@part_id", partId);
                await deleteAttachment.ExecuteNonQueryAsync();
            }

            await using var deletePart = CreateCommand(connection, transaction,
                "DELETE FROM [inv].[t_inv_part] WHERE [part_id] = @part_id;");
            AddParameter(deletePart, "@part_id", partId);
            var deleted = await deletePart.ExecuteNonQueryAsync();
            if (deleted == 0)
            {
                await transaction.RollbackAsync();
                stagedFile?.Restore();
                return false;
            }

            await transaction.CommitAsync();
            stagedFile?.DeleteStaged();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            stagedFile?.Restore();
            throw;
        }
    }

    private async Task<bool> PartExistsAsync(
        DbConnection connection, DbTransaction transaction, long partId)
    {
        await using var command = CreateCommand(connection, transaction,
            "SELECT COUNT_BIG(1) FROM [inv].[t_inv_part] WHERE [part_id] = @part_id;");
        AddParameter(command, "@part_id", partId);
        return Convert.ToInt64(await command.ExecuteScalarAsync()) > 0;
    }

    private async Task<AttachmentRecord?> GetForUpdateAsync(
        DbConnection connection, DbTransaction transaction, long partId)
    {
        await using var command = CreateCommand(connection, transaction, """
            SELECT TOP (1) [part_attachment_id], [storage_path]
            FROM [inv].[t_inv_part_attachment] WITH (UPDLOCK, HOLDLOCK)
            WHERE [part_id] = @part_id;
            """);
        AddParameter(command, "@part_id", partId);
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return new AttachmentRecord(reader.GetInt64(0), reader.GetString(1));
    }

    private static PartAttachmentResponse Map(DbDataReader reader)
    {
        var storagePath = reader.GetString(reader.GetOrdinal("storage_path"));
        return new PartAttachmentResponse
        {
            PartAttachmentId = reader.GetInt64(reader.GetOrdinal("part_attachment_id")),
            PartId = reader.GetInt64(reader.GetOrdinal("part_id")),
            AttachmentType = reader.GetString(reader.GetOrdinal("attachment_type")),
            AttachmentName = reader.GetString(reader.GetOrdinal("attachment_name")),
            MimeType = reader.GetString(reader.GetOrdinal("mime_type")),
            StoragePath = storagePath,
            ContentUrl = BuildContentUrl(storagePath)
        };
    }

    private async Task<ValidatedFile> ValidateFileAsync(IFormFile file)
    {
        if (file.Length is < 1 or > MaxFileSize)
            throw new PartAttachmentValidationException("File must be between 1 byte and 10 MB.");

        var header = new byte[8];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAsync(header.AsMemory(0, header.Length));

        if (read >= 4 && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46)
            return new ValidatedFile("PDF", "application/pdf", ".pdf");
        if (read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return new ValidatedFile("IMAGE", "image/jpeg", ".jpg");
        if (read >= 8 && header.SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return new ValidatedFile("IMAGE", "image/png", ".png");

        throw new PartAttachmentValidationException("Only valid JPG, PNG or PDF files are allowed.");
    }

    private StagedFile? StageFile(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return null;
        var original = ResolveSafePath(relativePath);
        if (!File.Exists(original)) return null;
        var staged = original + $".deleting-{Guid.NewGuid():N}";
        File.Move(original, staged);
        return new StagedFile(original, staged, _logger);
    }

    private string ResolveSafePath(string relativePath)
    {
        if (Path.IsPathRooted(relativePath))
            throw new InvalidOperationException("Attachment path must be relative.");

        var root = Path.GetFullPath(_attachmentRoot);
        var fullPath = Path.GetFullPath(Path.Combine(root,
            relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var relativeToRoot = Path.GetRelativePath(root, fullPath);
        if (relativeToRoot == ".." ||
            relativeToRoot.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) ||
            Path.IsPathRooted(relativeToRoot))
            throw new InvalidOperationException("Attachment path escapes GTEC_ATTACHMENT_ROOT.");
        return fullPath;
    }

    private DbCommand CreateCommand(
        DbConnection connection, DbTransaction? transaction, string sql)
    {
        var command = _connectionFactory.CreateCommand(sql, connection);
        command.Transaction = transaction;
        return command;
    }

    private void AddParameter(DbCommand command, string name, object value) =>
        command.Parameters.Add(_connectionFactory.CreateParameter(name, value));

    private static string BuildContentUrl(string storagePath) =>
        $"{DownloadEndpoint}?path={Uri.EscapeDataString(storagePath.Replace('\\', '/'))}";

    private static void DeleteIfExists(string path)
    {
        if (File.Exists(path)) File.Delete(path);
    }

    private void TryDeleteStoredFile(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return;
        try
        {
            DeleteIfExists(ResolveSafePath(relativePath));
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Part attachment was replaced, but the previous file could not be deleted: {Path}",
                relativePath);
        }
    }

    private sealed record AttachmentRecord(long Id, string StoragePath);
    private sealed record ValidatedFile(string AttachmentType, string MimeType, string Extension);

    private sealed class StagedFile(string originalPath, string stagedPath, ILogger logger)
    {
        public void Restore()
        {
            if (!File.Exists(stagedPath)) return;
            try { File.Move(stagedPath, originalPath); }
            catch (Exception exception)
            {
                logger.LogError(exception, "Unable to restore staged Part attachment {Path}", originalPath);
            }
        }

        public void DeleteStaged()
        {
            if (!File.Exists(stagedPath)) return;
            try { File.Delete(stagedPath); }
            catch (Exception exception)
            {
                logger.LogError(exception, "Unable to delete staged Part attachment {Path}", stagedPath);
            }
        }
    }
}

public sealed class PartAttachmentValidationException(string message) : Exception(message);
