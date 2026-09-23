using AiAssistant.Models.Requests;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace AiAssistant.Controllers;

/// <summary>
/// Admin endpoints for BS-AI-KnowledgeBase schema metadata.
/// </summary>
[ApiController]
[Route("api/ai/knowledge")]
[Produces("application/json")]
public class AiKnowledgeController : ControllerBase
{
    private readonly ISchemaMetadataService _schemaMetadataService;
    private readonly IKnowledgeRetrievalService _knowledgeRetrievalService;
    private readonly IKnowledgeIngestionService _knowledgeIngestionService;
    private readonly IPromptService _promptService;
    private readonly ILogger<AiKnowledgeController> _logger;

    public AiKnowledgeController(
        ISchemaMetadataService schemaMetadataService,
        IKnowledgeRetrievalService knowledgeRetrievalService,
        IKnowledgeIngestionService knowledgeIngestionService,
        IPromptService promptService,
        ILogger<AiKnowledgeController> logger)
    {
        _schemaMetadataService = schemaMetadataService;
        _knowledgeRetrievalService = knowledgeRetrievalService;
        _knowledgeIngestionService = knowledgeIngestionService;
        _promptService = promptService;
        _logger = logger;
    }

    /// <summary>
    /// Add a KnowledgeBase source document and optionally generate searchable chunks.
    /// </summary>
    [HttpPost("documents")]
    [SwaggerOperation(
        Summary = "Create Knowledge Document",
        Description = "Inserts a source document into the AI KnowledgeBase. By default, the document is chunked immediately for RAG retrieval."
    )]
    [SwaggerResponse(200, "Knowledge document created", typeof(CreateKnowledgeDocumentResponse))]
    [SwaggerResponse(400, "Invalid request", typeof(CreateKnowledgeDocumentResponse))]
    [SwaggerResponse(500, "Knowledge document creation failed", typeof(CreateKnowledgeDocumentResponse))]
    public async Task<ActionResult<CreateKnowledgeDocumentResponse>> CreateDocument(
        [FromBody] CreateKnowledgeDocumentRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new CreateKnowledgeDocumentResponse
            {
                Success = false,
                ErrorMessage = "Invalid knowledge document request."
            });
        }

        var response = await _knowledgeIngestionService.CreateDocumentAsync(request);
        if (!response.Success)
        {
            return StatusCode(500, response);
        }

        return Ok(response);
    }

    /// <summary>
    /// List KnowledgeBase source documents and current active chunk counts.
    /// </summary>
    [HttpGet("documents")]
    [SwaggerOperation(
        Summary = "List Knowledge Documents",
        Description = "Returns KnowledgeBase source documents with active chunk counts. Use filters to inspect process-specific knowledge."
    )]
    [SwaggerResponse(200, "Knowledge document list", typeof(KnowledgeDocumentListResponse))]
    [SwaggerResponse(500, "Failed to read knowledge documents", typeof(KnowledgeDocumentListResponse))]
    public async Task<ActionResult<KnowledgeDocumentListResponse>> GetDocuments(
        [FromQuery] string? process,
        [FromQuery] string? docType,
        [FromQuery] int limit = 100)
    {
        var response = await _knowledgeIngestionService.GetDocumentsAsync(process, docType, limit);
        if (!response.Success)
        {
            return StatusCode(500, response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Build chunks for one KnowledgeBase document.
    /// </summary>
    [HttpPost("documents/{documentId:long}/chunks")]
    [SwaggerOperation(
        Summary = "Build Document Chunks",
        Description = "Splits one active KnowledgeBase document into searchable chunks. Existing chunk indexes are updated and stale chunks are deactivated."
    )]
    [SwaggerResponse(200, "Knowledge chunks built", typeof(KnowledgeChunkBuildResponse))]
    [SwaggerResponse(500, "Knowledge chunk build failed", typeof(KnowledgeChunkBuildResponse))]
    public async Task<ActionResult<KnowledgeChunkBuildResponse>> BuildDocumentChunks(
        [FromRoute] long documentId,
        [FromBody] BuildKnowledgeChunksRequest? request = null)
    {
        request ??= new BuildKnowledgeChunksRequest();
        request.KnowledgeDocumentId = documentId;

        var response = await _knowledgeIngestionService.BuildChunksAsync(request);
        if (!response.Success)
        {
            return StatusCode(500, response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Rebuild chunks for all active KnowledgeBase documents, or one document if an ID is provided.
    /// </summary>
    [HttpPost("rebuild-chunks")]
    [SwaggerOperation(
        Summary = "Rebuild Knowledge Chunks",
        Description = "Builds searchable chunks for every active KnowledgeBase document, or for one document when knowledgeDocumentId is provided."
    )]
    [SwaggerResponse(200, "Knowledge chunks rebuilt", typeof(KnowledgeChunkBuildResponse))]
    [SwaggerResponse(500, "Knowledge chunk rebuild failed", typeof(KnowledgeChunkBuildResponse))]
    public async Task<ActionResult<KnowledgeChunkBuildResponse>> RebuildChunks(
        [FromBody] BuildKnowledgeChunksRequest? request = null)
    {
        var response = await _knowledgeIngestionService.BuildChunksAsync(request ?? new BuildKnowledgeChunksRequest());
        if (!response.Success)
        {
            return StatusCode(500, response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Rebuild vector embeddings for existing active chunks.
    /// </summary>
    [HttpPost("rebuild-embeddings")]
    [SwaggerOperation(
        Summary = "Rebuild Knowledge Embeddings",
        Description = "Builds local vector embeddings for every active KnowledgeBase chunk, or for one document when knowledgeDocumentId is provided."
    )]
    [SwaggerResponse(200, "Knowledge embeddings rebuilt", typeof(KnowledgeEmbeddingBuildResponse))]
    [SwaggerResponse(500, "Knowledge embedding rebuild failed", typeof(KnowledgeEmbeddingBuildResponse))]
    public async Task<ActionResult<KnowledgeEmbeddingBuildResponse>> RebuildEmbeddings(
        [FromBody] BuildKnowledgeEmbeddingsRequest? request = null)
    {
        var response = await _knowledgeIngestionService.BuildEmbeddingsAsync(request ?? new BuildKnowledgeEmbeddingsRequest());
        if (!response.Success)
        {
            return StatusCode(500, response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Sync SQL Server schema/table/column descriptions into AI schema catalog.
    /// </summary>
    [HttpPost("sync-schema")]
    [SwaggerOperation(
        Summary = "Sync Schema Metadata",
        Description = "Reads SQL Server metadata and MS_Description extended properties, then upserts them into the AI schema catalog."
    )]
    [SwaggerResponse(200, "Schema metadata synced", typeof(SchemaSyncResponse))]
    [SwaggerResponse(500, "Schema metadata sync failed", typeof(SchemaSyncResponse))]
    public async Task<ActionResult<SchemaSyncResponse>> SyncSchema()
    {
        var response = await _schemaMetadataService.SyncSchemaCatalogAsync();
        if (!response.Success)
        {
            _logger.LogWarning("Schema metadata sync endpoint failed: {Error}", response.ErrorMessage);
            return StatusCode(500, response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Preview active schema catalog rows that AI can use as schema context.
    /// </summary>
    [HttpGet("schema-catalog")]
    [SwaggerOperation(
        Summary = "Preview Schema Catalog",
        Description = "Returns active schema catalog rows. Use schemaName/tableName filters to inspect AI-visible schema descriptions."
    )]
    [SwaggerResponse(200, "Schema catalog preview", typeof(SchemaCatalogPreviewResponse))]
    [SwaggerResponse(500, "Failed to read schema catalog", typeof(SchemaCatalogPreviewResponse))]
    public async Task<ActionResult<SchemaCatalogPreviewResponse>> GetSchemaCatalog(
        [FromQuery] string? schemaName,
        [FromQuery] string? tableName,
        [FromQuery] int limit = 100)
    {
        var response = await _schemaMetadataService.GetSchemaCatalogPreviewAsync(schemaName, tableName, limit);
        if (!response.Success)
        {
            return StatusCode(500, response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Preview RAG context for a process/query without calling the LLM.
    /// </summary>
    [HttpGet("retrieval-preview")]
    [SwaggerOperation(
        Summary = "Preview RAG Retrieval",
        Description = "Returns the formatted knowledge/schema context that would be injected into the AI prompt for a process and query."
    )]
    [SwaggerResponse(200, "RAG retrieval preview", typeof(KnowledgeRetrievalPreviewResponse))]
    [SwaggerResponse(500, "Failed to retrieve RAG context", typeof(KnowledgeRetrievalPreviewResponse))]
    public async Task<ActionResult<KnowledgeRetrievalPreviewResponse>> GetRetrievalPreview(
        [FromQuery] string process,
        [FromQuery] string query)
    {
        try
        {
            var pageConfig = await _promptService.GetPageConfigAsync(process);
            var result = await _knowledgeRetrievalService.RetrieveContextAsync(
                process,
                query,
                pageConfig?.AllowedTables,
                pageConfig?.AllowedColumns);

            return Ok(new KnowledgeRetrievalPreviewResponse
            {
                Success = true,
                Process = process,
                Query = query,
                KnowledgeChunkCount = result.KnowledgeChunkCount,
                SchemaColumnCount = result.SchemaColumnCount,
                SchemaRelationCount = result.SchemaRelationCount,
                FormattedContext = result.FormattedContext
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to preview RAG retrieval context");
            return StatusCode(500, new KnowledgeRetrievalPreviewResponse
            {
                Success = false,
                Process = process,
                Query = query,
                ErrorMessage = ex.Message
            });
        }
    }
}
