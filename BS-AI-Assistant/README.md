# BS-AI-Assistant

Last updated: 2026-06-30

`BS-AI-Assistant` is the AI service for MyInventory. It powers the floating AI chat, AI admin console, knowledge/RAG tooling, and dashboard generation endpoints used by the React frontend through the API Gateway.

## Runtime Shape

- Service root: `BS-AI-Assistant/AiAssistant`
- Framework: ASP.NET Core Web API
- Main route group: `/api/ai`
- Dashboard route group: `/api/AiDashboard`
- Gateway upstream: `/gateway/v1/api/ai/{everything}`
- Gateway dashboard aliases:
  - `/gateway/v1/api/dashboard/generate-forecast`
  - `/gateway/v1/api/dashboard/auto-generate`
- Frontend base app: `BS-Web/Frontend-Core`
- AI frontend surfaces:
  - Floating chat: `src/components/AiChatPopover.js`
  - Admin console: `src/pages/AI/AIAdminConsole.js`
  - AI menu config: `src/config/aiMenu.js`
  - Forecast dashboard: `src/pages/Dashboard/ForecastDashboard.js`
  - Auto dashboard: `src/pages/Dashboard/DashboardAI.js`

## What It Does

The current implementation supports:

1. Page-aware AI chat keyed by `process`, such as `/master/item` or `/dashboard`.
2. Prompt assembly from `ais.t_ai_system_prompt` and `ais.t_ai_page_config`.
3. RAG context retrieval from knowledge chunks, schema catalog rows, and schema relations.
4. OpenRouter-compatible chat completion with database-driven provider/model priority.
5. Provider config caching with manual refresh.
6. Optional image attachments controlled by provider config.
7. Suggested questions and user favorite prompts.
8. Read-only SQL generation and execution for reporting questions.
9. Draft CRUD proposals that require explicit user confirm/reject before execution.
10. RBAC checks against menu permissions before view/CRUD operations.
11. Chat, CRUD, and retrieval audit logging.
12. AI admin console for provider, prompt, page config, knowledge, schema, and logs.
13. Dashboard widget generation for forecast and auto-dashboard pages.

## Chat Flow

1. Frontend sends `POST /api/ai/chat` through the gateway.
2. `AiChatController` validates the request and calls `AiOrchestratorService`.
3. The orchestrator checks RBAC `view` permission for the requested `process`.
4. `PromptService` loads the active system prompt and page config.
5. `KnowledgeRetrievalService` builds RAG context:
   - Parses `allowed_tables` from page config.
   - Loads schema context from `ais.t_ai_schema_catalog`.
   - Loads joins from `ais.t_ai_schema_relation`.
   - Loads knowledge chunks from `ais.t_ai_knowledge_chunk`.
   - Prefilters with `ais.t_ai_knowledge_chunk_token` when available.
   - Scores keyword and vector similarity.
6. `FallbackChatService` calls the configured provider/model chain.
7. AI output is parsed as either:
   - `BYPASS_SQL`: answer directly.
   - `GENERATE_SQL`: generate SQL for select/report or generate a CRUD proposal.
8. Select SQL is validated, compile-checked, limited with `TOP`, executed, and summarized.
9. CRUD responses are returned as proposals with `requires_confirmation = true`; execution only happens through `/api/ai/confirm`.
10. Chat and retrieval details are written to audit tables.

## API Endpoints

Base route: `/api/ai`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/chat` | Main AI chat endpoint. |
| `POST` | `/confirm` | Execute a previously returned CRUD proposal. |
| `POST` | `/reject` | Reject a CRUD proposal without writing data. |
| `POST` | `/suggestions` | Generate quick-pick questions for a process. |
| `GET` | `/favorite-prompts` | List active favorite prompts for `process` and `user_id`. |
| `POST` | `/favorite-prompts/toggle` | Create, reactivate, or deactivate a favorite prompt. |
| `GET` | `/health` | Service health check. |
| `GET` | `/active-configs` | List active page config process paths. |
| `GET` | `/rate-limit` | Read OpenRouter usage/rate-limit data. |
| `GET` | `/provider-config` | Return active provider config from cache/DB. |
| `POST` | `/config/refresh` | Clear provider config cache. |
| `GET` | `/overview-stats` | Aggregated stats for AI admin overview. |

Knowledge route: `/api/ai/knowledge`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/documents` | Create a knowledge document and optionally chunk it. |
| `GET` | `/documents` | List knowledge documents with chunk counts. |
| `POST` | `/documents/{documentId}/chunks` | Build chunks for one document. |
| `POST` | `/rebuild-chunks` | Rebuild chunks for all active documents or one document. |
| `POST` | `/rebuild-embeddings` | Rebuild embeddings for active chunks. |
| `POST` | `/sync-schema` | Sync SQL Server metadata and descriptions into AI schema tables. |
| `GET` | `/schema-catalog` | Preview schema catalog rows. |
| `GET` | `/retrieval-preview` | Preview RAG context without calling the LLM. |

Dashboard route: `/api/AiDashboard`

| Method | Endpoint | Gateway alias | Purpose |
| --- | --- | --- | --- |
| `POST` | `/generate-forecast` | `/gateway/v1/api/dashboard/generate-forecast` | Generate one forecast dashboard widget from a question. |
| `POST` | `/auto-generate` | `/gateway/v1/api/dashboard/auto-generate` | Generate a multi-widget AI dashboard from context. |

## Chat Request

The API uses snake_case JSON at the wire level.

```json
{
  "process": "/master/item",
  "user_message": "Show items created by me",
  "user_id": "U001",
  "user_name": "John Smith",
  "conversation_history": [
    { "role": "user", "content": "show active items" },
    { "role": "assistant", "content": "Which warehouse?" }
  ],
  "system_prompt_id": null,
  "attachment_base64": null,
  "attachment_mime_type": null
}
```

Important fields:

- `process`: current page/menu path. Used for prompt config, RAG filtering, RBAC, and audit.
- `user_id`: required for RBAC and audit.
- `user_name`: injected into AI context so words like "I", "me", and "my" can map to the logged-in user.
- `system_prompt_id`: optional admin-chat override.
- `attachment_base64` and `attachment_mime_type`: used only when active provider allows file attachments.

## Chat Response

```json
{
  "success": true,
  "ai_response": "Found 2 matching rows.",
  "ai_decision": "GENERATE_SQL",
  "generated_sql": "SELECT TOP 1000 ...",
  "action": "select",
  "table": null,
  "fields": null,
  "where": null,
  "business_plan": null,
  "requires_confirmation": false,
  "ai_crud_audit_log_id": null,
  "report_data": {
    "columns": ["item_code", "item_name"],
    "rows": [{ "item_code": "A001", "item_name": "Item A" }],
    "row_count": 1,
    "is_truncated": false
  },
  "data_rows": [{ "item_code": "A001", "item_name": "Item A" }],
  "model_used": "openai/gpt-4o-mini",
  "fallback_info": null,
  "tokens": {
    "prompt_tokens": 120,
    "completion_tokens": 80,
    "total_tokens": 200
  },
  "processing_time_ms": 1450,
  "error_message": null
}
```

For CRUD proposals, `requires_confirmation` is `true`, `action/table/fields/where/business_plan` are populated, and the frontend must call `/api/ai/confirm` or `/api/ai/reject`.

## CRUD Confirm/Reject

CRUD is a two-step workflow:

1. `/api/ai/chat` returns a non-executed proposal.
2. User confirms or rejects it in the UI.

Confirm request:

```json
{
  "ai_crud_audit_log_id": 123,
  "request_id": "optional-correlation-id",
  "process": "/master/item",
  "user_id": "U001",
  "action": "update",
  "table": "dbo.t_wms_item",
  "fields": { "item_name": "New Name" },
  "where": { "item_id": 10 },
  "user_message": "Change item name"
}
```

Safety behavior:

- `insert`, `update`, and `delete` require RBAC permission for the process.
- Delete is implemented as soft delete when the generated SQL path uses `is_active = false`.
- Server builds parameterized SQL for confirm execution.
- Confirm/reject updates `ais.t_ai_crud_audit_log`.

## SQL Safety

`SqlExecutionService` enforces:

- Normal AI report queries must start with `SELECT` or `WITH`.
- Multiple SQL statements are blocked.
- Configured blocked keywords are rejected.
- `TOP {AiSafety:MaxRowLimit}` is injected when missing.
- Syntax is compile-checked with `SET NOEXEC ON` before execution.
- Query timeout comes from `AiSafety:QueryTimeoutSeconds`.
- CRUD execution is only allowed through the confirm path and still blocks dangerous keywords.

Default `AiSafety` settings live in `AiAssistant/appsettings.json`.

## RBAC

`RbacPermissionService` authorizes AI access from `sec.t_com_user`, `sec.t_com_user_group_menu`, and `sec.t_com_menu`.

Action mapping:

- `view` -> `is_view`
- `insert` -> `is_add_view`
- `update` -> `is_edit_view`
- `delete` -> `is_delete_view`

Permission snapshots are cached for `AiSecurity:RbacCacheMinutes`, clamped to 1-5 minutes.

## Provider Configuration

Chat provider config is loaded from:

- `ais.t_ai_provider_config`
- `ais.t_ai_model_priority`

Behavior:

- Active provider rows are cached in memory for 5 minutes.
- Models are tried by `priority_order`.
- `POST /api/ai/config/refresh` clears the cache.
- `api_key` is stored encrypted in DB and decrypted server-side.
- If DB config is missing or unreadable, fallback values come from `OpenRouter:*` appsettings/environment.
- `allow_file_attachment` and `allowed_file_types` control frontend attachment UI and backend validation.

Embedding provider config is loaded from `ais.t_ai_embedding_provider_config`.

- External providers must expose an OpenAI-compatible embeddings response.
- API key is resolved from `api_key_env_name`.
- If no external provider exists, provider is `local`/blank, or the external call fails, the system falls back to `bs-ai-local-hashing-v1`.

## RAG Knowledge Base

The current RAG pipeline uses:

- `ais.t_ai_knowledge_document`: source documents.
- `ais.t_ai_knowledge_chunk`: chunked searchable text with embeddings.
- `ais.t_ai_knowledge_chunk_token`: optional inverted token index for faster candidate filtering.
- `ais.t_ai_schema_catalog`: synced schema/table/column metadata.
- `ais.t_ai_schema_relation`: synced foreign-key relationships.
- `ais.t_ai_knowledge_retrieval_log`: retrieval audit.

Retrieval order:

1. Parse tokens from user message, process, and allowed table names.
2. Load schema candidates from `t_ai_schema_catalog`.
3. Load relation candidates connected to matched tables.
4. Load knowledge candidates, using `t_ai_knowledge_chunk_token` when available.
5. Score knowledge with process match, token matches, keyword hits, and vector similarity.
6. Format the selected context into the prompt.
7. Log retrieved context rows after chat logging succeeds.

If knowledge tables/views are missing, retrieval is skipped and chat continues without RAG context.

## AI Admin Console

Frontend route group: `/ai`

Menu sections:

- `/ai/overview`: provider, model, knowledge, schema, and usage stats.
- `/ai/admin-chat`: embedded AI chat using process `/ai/admin-chat` and system prompt override `1009`.
- `/ai/provider-config`: provider config, model priority, and embedding provider grids.
- `/ai/page-config`: system prompt and page config grids.
- `/ai/knowledge-documents`: document creation, chunk rebuild, embedding rebuild, document/chunk/token grids.
- `/ai/schema-knowledge`: schema sync, retrieval preview, schema catalog, schema relations.
- `/ai/logs`: chat log and retrieval log.

The admin grids use `BSDataGrid` against Dynamic CRUD, so the core API/gateway must allow schema `ais` in Dynamic CRUD configuration.

## Database Objects

Core tables:

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

Important views/procedures from SQL scripts:

- `ais.v_ai_schema_metadata_source`
- `ais.v_ai_schema_relation_source`
- schema sync/upsert logic in `create_ai_knowledge_base.sql`

Main SQL scripts:

- `create_ai_tables.sql`
- `create_ai_provider_config.sql`
- `create_ai_favorite_prompts.sql`
- `create_ai_knowledge_base.sql`
- `extend_ai_embedding_provider_vector_index.sql`
- `add_api_key_to_ai_provider_config.sql`
- `add_file_attachment_config.sql`
- `migrate_rename_audit_columns.sql`
- `migrate_ai_knowledge_base_standard_audit_columns.sql`
- `add_ai_knowledge_base_field_descriptions.sql`
- `update_openrouter_models.sql`
- `seed_master_data_prompt.sql`
- `seed_item_master_prompt.sql`
- `seed_master_page_config_all.sql`
- `seed_transaction_page_config_all.sql`

## Configuration

Required:

- `ConnectionStrings:DefaultConnection`

Important settings:

- `AiSafety:MaxRowLimit`
- `AiSafety:QueryTimeoutSeconds`
- `AiSafety:BlockedKeywords`
- `AiSecurity:RbacCacheMinutes`
- `OpenRouter:BaseUrl` fallback
- `OpenRouter:ChatEndpoint` fallback
- `OpenRouter:DefaultModel` or `OpenRouter:Models` fallback
- `AI_PROVIDER_SECRET_KEY` for DB API-key encryption/decryption
- embedding provider API key environment variable named by `ais.t_ai_embedding_provider_config.api_key_env_name`

`Program.cs` loads `../.env` with `DotNetEnv.Env.NoClobber()`, so Docker/production environment variables are not overwritten by local `.env`.

## Gateway Notes

Ocelot routes the authenticated AI API:

```text
/gateway/v1/api/ai/{everything}
  -> bs_ai_assistance:8080/api/ai/{everything}
```

Dashboard aliases:

```text
/gateway/v1/api/dashboard/generate-forecast
  -> bs_ai_assistance:8080/api/AiDashboard/generate-forecast

/gateway/v1/api/dashboard/auto-generate
  -> bs_ai_assistance:8080/api/AiDashboard/auto-generate
```

The frontend generally calls `/ai/...` via `AxiosMaster`/`Config.API_URL`, which adds the gateway base URL.

## Local Run

```powershell
cd BS-AI-Assistant/AiAssistant
dotnet restore
dotnet build
dotnet run
```

Swagger is available at `/swagger`.

## Validation Commands

Backend:

```powershell
cd BS-AI-Assistant/AiAssistant
dotnet build
```

Frontend after AI UI changes:

```powershell
cd BS-Web/Frontend-Core
npm.cmd run build
```

Gateway/core config after admin Dynamic CRUD changes:

```powershell
dotnet build BS-API-Secure/ApiGateway/ApiGateway.csproj
dotnet build BS-API-Core/ApiCore/ApiCore.csproj
```

## Related Docs

- `docs/AI_DB_Assistant_Requirements_EN.md`
- `docs/AI_DB_Assistant_Requirements_v1.md`
- `docs/implementation_plan.md`
- `docs/rag_knowledge_base_schema_description_plan.md`
- `docs/rag_knowledge_base_implementation_summary.md`
- `docs/ai_knowledge_tables_explanation.md`
- `docs/walkthrough.md`
