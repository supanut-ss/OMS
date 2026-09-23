using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Syncs SQL Server metadata and MS_Description values into AI schema catalog tables.
/// </summary>
public interface ISchemaMetadataService
{
    Task<SchemaSyncResponse> SyncSchemaCatalogAsync();
    Task<SchemaCatalogPreviewResponse> GetSchemaCatalogPreviewAsync(string? schemaName, string? tableName, int limit);
}

