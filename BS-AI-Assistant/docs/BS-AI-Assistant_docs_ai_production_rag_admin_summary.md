# BS AI Assistant - Current Production RAG and Admin Console Summary

Last updated: 2026-06-30

This summary matches the current code in `BS-AI-Assistant`, `BS-Web/Frontend-Core`, and the API Gateway.

## Current Feature Set

- AI chat for MyInventory pages through `AiChatPopover`.
- Admin console under `/ai/*` for providers, prompts, page config, RAG knowledge, schema metadata, and logs.
- Database-driven chat provider and model priority through `ais.t_ai_provider_config` and `ais.t_ai_model_priority`.
- Optional image attachment controlled by provider fields `allow_file_attachment` and `allowed_file_types`.
- External embedding provider config through `ais.t_ai_embedding_provider_config`.
- Local embedding fallback `bs-ai-local-hashing-v1` when no external provider is active or the external call fails.
- Production RAG tables for documents, chunks, token index, schema catalog, schema relations, and retrieval logs.
- AI-generated dashboard endpoints for forecast and auto-dashboard pages.
- RBAC checks before AI view/CRUD actions.
- Two-step CRUD workflow: proposal from chat, then explicit confirm or reject.

## Main Runtime Flow

1. React calls `/gateway/v1/api/ai/...` through `AxiosMaster` or `Config.API_URL`.
2. Ocelot forwards requests to `bs_ai_assistance:8080`.
3. `AiChatController` handles chat, suggestions, favorites, provider config, rate limit, overview stats, and CRUD confirm/reject.
4. `AiKnowledgeController` handles document ingest, chunk rebuild, embedding rebuild, schema sync, schema preview, and retrieval preview.
5. `AiDashboardController` handles dashboard generation.
6. `AiOrchestratorService` builds prompt context, checks RBAC, calls the LLM, validates SQL/CRUD output, executes safe select queries, and logs audit records.

## Gateway Routes

- `/gateway/v1/api/ai/{everything}` -> `/api/ai/{everything}` on `bs_ai_assistance`.
- `/gateway/v1/api/dashboard/generate-forecast` -> `/api/AiDashboard/generate-forecast`.
- `/gateway/v1/api/dashboard/auto-generate` -> `/api/AiDashboard/auto-generate`.

All three gateway routes currently require Bearer authentication.

## RAG Flow

1. Admin creates a source document in `AI > Knowledge Documents`.
2. Backend inserts it into `ais.t_ai_knowledge_document`.
3. Chunk build writes to `ais.t_ai_knowledge_chunk`.
4. Embedding build writes embedding fields on chunks.
5. Token build writes searchable tokens to `ais.t_ai_knowledge_chunk_token` when that table exists.
6. Schema sync reads SQL Server metadata and `MS_Description` values into:
   - `ais.t_ai_schema_catalog`
   - `ais.t_ai_schema_relation`
7. Chat retrieval combines:
   - process-specific knowledge chunks,
   - schema rows filtered by `allowed_tables`,
   - relation rows connected to matched tables,
   - vector/keyword scoring.
8. Retrieved context is written to `ais.t_ai_knowledge_retrieval_log` after chat logging succeeds.

If RAG tables/views are missing, chat continues without retrieved context.

## AI Admin Console

Frontend file: `BS-Web/Frontend-Core/src/pages/AI/AIAdminConsole.js`

Sections:

- `Overview`: provider/model status, knowledge counts, schema coverage, chat usage.
- `Admin Chat`: embedded chat using process `/ai/admin-chat` and `system_prompt_id = 1009`.
- `Provider`: chat provider config, model priority, embedding provider config.
- `Prompt & Page`: system prompt and page config.
- `Documents`: knowledge document upload/create, chunk rebuild, embedding rebuild, chunks, token index.
- `Schema`: schema sync, retrieval preview, schema catalog, schema relations.
- `Logs`: chat log and retrieval log.

The admin console uses `BSDataGrid` for `ais.t_ai_*` tables, so Dynamic CRUD must allow schema `ais`.

## Important Tables

- `ais.t_ai_system_prompt`
- `ais.t_ai_page_config`
- `ais.t_ai_chat_log`
- `ais.t_ai_crud_audit_log`
- `ais.t_ai_provider_config`
- `ais.t_ai_model_priority`
- `ais.t_ai_favorite_prompts`
- `ais.t_ai_embedding_provider_config`
- `ais.t_ai_knowledge_document`
- `ais.t_ai_knowledge_chunk`
- `ais.t_ai_knowledge_chunk_token`
- `ais.t_ai_schema_catalog`
- `ais.t_ai_schema_relation`
- `ais.t_ai_knowledge_retrieval_log`

## Important Code Files

- `BS-AI-Assistant/AiAssistant/Program.cs`
- `BS-AI-Assistant/AiAssistant/Controllers/AiChatController.cs`
- `BS-AI-Assistant/AiAssistant/Controllers/AiKnowledgeController.cs`
- `BS-AI-Assistant/AiAssistant/Controllers/AiDashboardController.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/AiOrchestratorService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/FallbackChatService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/AiProviderConfigService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/KnowledgeRetrievalService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/KnowledgeIngestionService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/TextEmbeddingService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/SqlExecutionService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/RbacPermissionService.cs`
- `BS-Web/Frontend-Core/src/components/AiChatPopover.js`
- `BS-Web/Frontend-Core/src/pages/AI/AIAdminConsole.js`
- `BS-Web/Frontend-Core/src/config/aiMenu.js`
- `BS-API-Secure/ApiGateway/ocelot.json`

## Verification

Use these commands after touching this area:

```powershell
cd BS-AI-Assistant/AiAssistant
dotnet build
```

```powershell
cd BS-Web/Frontend-Core
npm.cmd run build
```

For gateway/core config changes:

```powershell
dotnet build BS-API-Secure/ApiGateway/ApiGateway.csproj
dotnet build BS-API-Core/ApiCore/ApiCore.csproj
```
