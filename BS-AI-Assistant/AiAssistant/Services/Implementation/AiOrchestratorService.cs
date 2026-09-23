using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using AiAssistant.Models.Entities;
using AiAssistant.Models.Requests;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Main AI orchestrator that coordinates the full chat pipeline:
/// Prompt loading → AI call (with model fallback) → SQL generation/bypass → Response assembly → Logging
/// </summary>
public class AiOrchestratorService : IAiOrchestratorService
{
    private readonly IPromptService _promptService;
    private readonly ISqlExecutionService _sqlExecutionService;
    private readonly IChatLogService _chatLogService;
    private readonly IFallbackChatService _fallbackChatService;
    private readonly IAiProviderConfigService _providerConfigService;
    private readonly IKnowledgeRetrievalService _knowledgeRetrievalService;
    private readonly IAiCrudAuditLogService _crudAuditLogService;
    private readonly IRbacPermissionService _rbacPermissionService;
    private readonly ILogger<AiOrchestratorService> _logger;

    public AiOrchestratorService(
        IPromptService promptService,
        ISqlExecutionService sqlExecutionService,
        IChatLogService chatLogService,
        IFallbackChatService fallbackChatService,
        IAiProviderConfigService providerConfigService,
        IKnowledgeRetrievalService knowledgeRetrievalService,
        IAiCrudAuditLogService crudAuditLogService,
        IRbacPermissionService rbacPermissionService,
        ILogger<AiOrchestratorService> logger)
    {
        _promptService = promptService;
        _sqlExecutionService = sqlExecutionService;
        _chatLogService = chatLogService;
        _fallbackChatService = fallbackChatService;
        _providerConfigService = providerConfigService;
        _knowledgeRetrievalService = knowledgeRetrievalService;
        _crudAuditLogService = crudAuditLogService;
        _rbacPermissionService = rbacPermissionService;
        _logger = logger;
    }

    public async Task<ChatResponse> ProcessChatAsync(ChatRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        var chatLog = new ChatLog
        {
            Process = request.Process,
            UserId = request.UserId,
            UserMessage = request.UserMessage
        };

        try
        {
            // RBAC guard: users without is_view cannot use AI to read/summarize this process.
            var viewPermission = await _rbacPermissionService.AuthorizeAsync(request.UserId, request.Process, "view");
            if (!viewPermission.IsAllowed)
            {
                const string deniedMessage = "ขออภัยครับ คุณไม่มีสิทธิ์เข้าถึงข้อมูลของหน้านี้";
                chatLog.AiDecision = "RBAC_DENY";
                chatLog.AiResponse = deniedMessage;
                chatLog.IsSuccess = false;
                chatLog.ErrorMessage = $"RBAC denied (view): {viewPermission.Reason}";
                stopwatch.Stop();
                chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
                await _chatLogService.LogChatAsync(chatLog);

                return new ChatResponse
                {
                    Success = false,
                    AiResponse = deniedMessage,
                    AiDecision = "RBAC_DENY",
                    ErrorMessage = viewPermission.Reason,
                    ProcessingTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            // Step 1: Build combined prompt (system + page config)
            _logger.LogInformation("Processing chat for user {UserId} on process {Process}", request.UserId, request.Process);
            var systemPromptOverride = GetAllowedSystemPromptOverride(request.Process, request.SystemPromptId);
            var (combinedPrompt, systemPromptId, aiConfigId) = await _promptService.BuildCombinedPromptAsync(request.Process, systemPromptOverride);
            var pageConfig = await _promptService.GetPageConfigAsync(request.Process);

            var retrievalContext = await _knowledgeRetrievalService.RetrieveContextAsync(
                request.Process,
                request.UserMessage,
                pageConfig?.AllowedTables,
                pageConfig?.AllowedColumns);

            if (retrievalContext.HasContext)
            {
                combinedPrompt = $"{combinedPrompt}\n\n{retrievalContext.FormattedContext}";
                _logger.LogInformation(
                    "RAG context injected. Knowledge chunks: {KnowledgeCount}, schema columns: {SchemaCount}, relations: {RelationCount}",
                    retrievalContext.KnowledgeChunkCount,
                    retrievalContext.SchemaColumnCount,
                    retrievalContext.SchemaRelationCount);
            }
            else
            {
                _logger.LogInformation("No RAG context found for process {Process}", request.Process);
            }

            chatLog.SystemPromptId = systemPromptId;
            chatLog.AiConfigId = aiConfigId;

            // Step 2: Send to AI with fallback support
            var messages = new List<FallbackMessage>
            {
                new("system", combinedPrompt),
            };

            // Inject current-user context so AI can resolve "ฉัน / I / me" to the right userId/name
            var userContextParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(request.UserName))
                userContextParts.Add($"ชื่อ-นามสกุล: {request.UserName}");
            if (!string.IsNullOrWhiteSpace(request.UserId))
                userContextParts.Add($"UserId: {request.UserId}");

            if (userContextParts.Count > 0)
            {
                var userContext =
                    $"[ข้อมูลผู้ใช้งานปัจจุบัน]\n{string.Join("\n", userContextParts)}\n" +
                    "เมื่อผู้ใช้พูดถึง \"ฉัน\", \"ผม\", \"หนู\", \"I\", \"me\", \"my\" ให้ใช้ข้อมูลนี้ในการ filter หรือ query ข้อมูล";
                messages.Add(new("system", userContext));
                _logger.LogInformation("User context injected for user {UserId} ({UserName})", request.UserId, request.UserName);
            }

            // Inject conversation history (context window — max 10 messages enforced by frontend)
            if (request.ConversationHistory is { Count: > 0 })
            {
                const int maxHistoryMessages = 10;
                var history = request.ConversationHistory.TakeLast(maxHistoryMessages);
                foreach (var histMsg in history)
                {
                    var role = histMsg.Role is "user" or "assistant" ? histMsg.Role : "user";
                    messages.Add(new(role, histMsg.Content));
                }
                _logger.LogInformation("Context window: {Count} history messages injected", request.ConversationHistory.Count);
            }

            // Build current user message — multimodal when an image is attached and allowed by config
            var hasAttachment = !string.IsNullOrWhiteSpace(request.AttachmentBase64)
                                && !string.IsNullOrWhiteSpace(request.AttachmentMimeType);

            if (hasAttachment)
            {
                // Load config to verify attachment is permitted for this provider
                var providerConfig = await _providerConfigService.GetActiveConfigAsync();
                if (!providerConfig.AllowFileAttachment)
                {
                    _logger.LogWarning("Attachment rejected: provider '{Provider}' has allow_file_attachment = false", providerConfig.ProviderName);
                    hasAttachment = false;
                }
                else if (!providerConfig.AllowedFileTypesList.Contains(request.AttachmentMimeType!, StringComparer.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Attachment rejected: MIME type '{MimeType}' not in allowed list", request.AttachmentMimeType);
                    hasAttachment = false;
                }
            }

            if (hasAttachment)
            {
                messages.Add(new FallbackMultimodalMessage(
                    "user",
                    request.UserMessage,
                    request.AttachmentBase64!,
                    request.AttachmentMimeType!));
                _logger.LogInformation("Multimodal message built with attachment ({MimeType})", request.AttachmentMimeType);
            }
            else
            {
                messages.Add(new("user", request.UserMessage));
            }

            var aiResult = await _fallbackChatService.CompleteAsync(messages);
            chatLog.ModelName = aiResult.ModelUsed;
            chatLog.PromptTokens = aiResult.PromptTokens;
            chatLog.CompletionTokens = aiResult.CompletionTokens;
            chatLog.TotalTokens = aiResult.TotalTokens;

            if (aiResult.FailedModels.Count > 0)
                _logger.LogWarning("Fallback used. Failed models: {Failed}, Succeeded: {Model}",
                    string.Join(", ", aiResult.FailedModels), aiResult.ModelUsed);

            // Step 3: Parse AI decision (BYPASS_SQL / GENERATE_SQL)
            var parsedResponse = ParseAiResponse(aiResult.Content);
            chatLog.AiDecision = parsedResponse.Decision;
            chatLog.GeneratedSql = parsedResponse.Sql;

            // Step 4: Route by decision
            if (parsedResponse.Decision == "GENERATE_SQL")
            {
                if (IsCrudProposalAction(parsedResponse.Action))
                {
                    return await HandleCrudProposalPathAsync(parsedResponse, chatLog, retrievalContext, stopwatch, aiResult);
                }

                if (!string.IsNullOrWhiteSpace(parsedResponse.Sql))
                {
                    return await HandleGenerateSqlPathAsync(request, parsedResponse, chatLog, retrievalContext, stopwatch);
                }

                _logger.LogWarning("GENERATE_SQL decision received without sql. Falling back to BYPASS_SQL response.");
            }

            // BYPASS_SQL — return AI response directly
            chatLog.AiDecision = "BYPASS_SQL";
            chatLog.AiResponse = parsedResponse.Response;
            chatLog.IsSuccess = true;

            stopwatch.Stop();
            chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
            await LogChatAndRetrievalAsync(chatLog, retrievalContext);

            return new ChatResponse
            {
                Success = true,
                AiResponse = parsedResponse.Response,
                AiDecision = "BYPASS_SQL",
                Action = parsedResponse.Action,
                Table = parsedResponse.Table,
                Fields = parsedResponse.Fields,
                Where = parsedResponse.Where,
                BusinessPlan = parsedResponse.BusinessPlan,
                ModelUsed = aiResult.ModelUsed,
                FallbackInfo = BuildFallbackInfo(aiResult),
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                Tokens = new TokenUsage
                {
                    PromptTokens = aiResult.PromptTokens,
                    CompletionTokens = aiResult.CompletionTokens,
                    TotalTokens = aiResult.TotalTokens
                }
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error processing chat request for user {UserId}", request.UserId);
            chatLog.IsSuccess = false;
            chatLog.ErrorMessage = ex.Message;
            chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
            await _chatLogService.LogChatAsync(chatLog);

            // Friendly message — don't expose raw exception to user
            var userFriendlyMessage = ex is InvalidOperationException && ex.Message.Contains("model")
                ? "ขออภัยครับ ระบบ AI ไม่สามารถประมวลผลได้ในขณะนี้ เนื่องจาก AI ทุกตัวใน fallback list ไม่ว่าง กรุณาลองใหม่อีกครั้งในอีกสักครู่ครับ"
                : "ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่ครับ";

            return new ChatResponse
            {
                Success = false,
                AiResponse = userFriendlyMessage,
                AiDecision = chatLog.AiDecision,
                GeneratedSql = chatLog.GeneratedSql,
                ErrorMessage = ex.Message,   // kept for debug/logging, not shown to end-user in prod
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private async Task<long?> LogChatAndRetrievalAsync(ChatLog chatLog, KnowledgeRetrievalResult retrievalContext)
    {
        var aiChatLogId = await _chatLogService.LogChatAsync(chatLog);
        if (aiChatLogId.HasValue)
        {
            await _knowledgeRetrievalService.LogRetrievalAsync(
                aiChatLogId.Value,
                chatLog.Process,
                chatLog.UserMessage,
                retrievalContext);
        }

        return aiChatLogId;
    }

    public async Task<CrudConfirmResponse> ConfirmCrudAsync(CrudConfirmRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        var chatLog = new ChatLog
        {
            Process = request.Process,
            UserId = request.UserId,
            UserMessage = string.IsNullOrWhiteSpace(request.UserMessage)
                ? $"[CRUD_CONFIRM] action={request.Action}, table={request.Table}"
                : request.UserMessage,
            AiDecision = "GENERATE_SQL"
        };

        try
        {
            var action = NormalizeCrudAction(request.Action);
            if (action is null)
            {
                return new CrudConfirmResponse
                {
                    AiCrudAuditLogId = request.AiCrudAuditLogId,
                    Success = false,
                    ErrorMessage = "Unsupported action. Allowed actions: insert, update, delete.",
                    Message = "ไม่สามารถยืนยันคำสั่งได้ เนื่องจากประเภทคำสั่งไม่ถูกต้อง"
                };
            }

            var table = ValidateAndNormalizeTableName(request.Table);
            var fields = ToNullableDictionary(request.Fields);
            var where = ToNullableDictionary(request.Where);
            ApplyCrudContextPlaceholders(fields, request.UserId);
            ApplyCrudContextPlaceholders(where, request.UserId);

            var rbacPermission = await _rbacPermissionService.AuthorizeAsync(request.UserId, request.Process, action);
            if (!rbacPermission.IsAllowed)
            {
                var rejectPayloadJson = JsonSerializer.Serialize(new
                {
                    request.Process,
                    request.UserId,
                    request.RequestId,
                    request.Action,
                    request.Table,
                    Fields = fields,
                    Where = where
                });

                if (request.AiCrudAuditLogId.HasValue)
                {
                    await _crudAuditLogService.UpdateConfirmationAsync(
                        request.AiCrudAuditLogId.Value,
                        "REJECTED",
                        null,
                        null,
                        false,
                        $"RBAC denied: {rbacPermission.Reason}",
                        rejectPayloadJson,
                        request.UserId);
                }
                else
                {
                    await _crudAuditLogService.CreateAsync(
                        request.Process,
                        request.UserId,
                        null,
                        request.RequestId,
                        "GENERATE_SQL",
                        request.Action.Trim().ToLowerInvariant(),
                        table,
                        false,
                        "REJECTED",
                        null,
                        null,
                        null,
                        false,
                        $"RBAC denied: {rbacPermission.Reason}",
                        JsonSerializer.Serialize(fields),
                        JsonSerializer.Serialize(where),
                        null,
                        rejectPayloadJson,
                        request.UserId);
                }

                return new CrudConfirmResponse
                {
                    AiCrudAuditLogId = request.AiCrudAuditLogId,
                    Success = false,
                    Action = request.Action,
                    Table = table,
                    ErrorMessage = rbacPermission.Reason,
                    Message = "ขออภัยครับ คุณไม่มีสิทธิ์ทำรายการนี้"
                };
            }

            // Enforce soft-delete convention.
            if (action == "delete")
            {
                action = "update";
                fields["is_active"] = false;
            }

            var (sql, parameters) = BuildCrudSql(action, table, fields, where);
            chatLog.GeneratedSql = sql;

            var confirmPayloadJson = JsonSerializer.Serialize(new
            {
                request.Process,
                request.UserId,
                request.RequestId,
                request.Action,
                request.Table,
                Fields = fields,
                Where = where
            });

            var affectedRows = await _sqlExecutionService.ExecuteCommandAsync(sql, parameters);

            chatLog.AiResponse = $"CRUD executed successfully. Affected rows: {affectedRows}";
            chatLog.IsSuccess = true;
            stopwatch.Stop();
            chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
            await _chatLogService.LogChatAsync(chatLog);

            long? auditLogId = request.AiCrudAuditLogId;
            if (auditLogId.HasValue)
            {
                await _crudAuditLogService.UpdateConfirmationAsync(
                    auditLogId.Value,
                    "CONFIRMED",
                    sql,
                    affectedRows,
                    true,
                    null,
                    confirmPayloadJson,
                    request.UserId);
            }
            else
            {
                auditLogId = await _crudAuditLogService.CreateAsync(
                    request.Process,
                    request.UserId,
                    null,
                    request.RequestId,
                    "GENERATE_SQL",
                    request.Action.Trim().ToLowerInvariant(),
                    table,
                    false,
                    "CONFIRMED",
                    sql,
                    sql,
                    affectedRows,
                    true,
                    null,
                    JsonSerializer.Serialize(fields),
                    JsonSerializer.Serialize(where),
                    null,
                    confirmPayloadJson,
                    request.UserId);
            }

            return new CrudConfirmResponse
            {
                AiCrudAuditLogId = auditLogId,
                Success = true,
                Action = request.Action.Trim().ToLowerInvariant(),
                Table = table,
                AffectedRows = affectedRows,
                ExecutedSql = sql,
                Message = affectedRows > 0
                    ? "ยืนยันและบันทึกข้อมูลเรียบร้อยแล้ว"
                    : "ระบบยืนยันคำสั่งแล้ว แต่ไม่พบรายการที่เข้าเงื่อนไขสำหรับการเปลี่ยนแปลง"
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            chatLog.IsSuccess = false;
            chatLog.ErrorMessage = ex.Message;
            chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
            await _chatLogService.LogChatAsync(chatLog);

            var failPayloadJson = JsonSerializer.Serialize(new
            {
                request.Process,
                request.UserId,
                request.RequestId,
                request.Action,
                request.Table,
                request.Fields,
                request.Where
            });

            if (request.AiCrudAuditLogId.HasValue)
            {
                await _crudAuditLogService.UpdateConfirmationAsync(
                    request.AiCrudAuditLogId.Value,
                    "FAILED",
                    chatLog.GeneratedSql,
                    null,
                    false,
                    ex.Message,
                    failPayloadJson,
                    request.UserId);
            }
            else
            {
                await _crudAuditLogService.CreateAsync(
                    request.Process,
                    request.UserId,
                    null,
                    request.RequestId,
                    "GENERATE_SQL",
                    request.Action.Trim().ToLowerInvariant(),
                    request.Table,
                    false,
                    "FAILED",
                    chatLog.GeneratedSql,
                    chatLog.GeneratedSql,
                    null,
                    false,
                    ex.Message,
                    JsonSerializer.Serialize(request.Fields),
                    JsonSerializer.Serialize(request.Where),
                    null,
                    failPayloadJson,
                    request.UserId);
            }

            _logger.LogError(ex, "Failed to confirm CRUD action. User: {UserId}, Process: {Process}", request.UserId, request.Process);
            return new CrudConfirmResponse
            {
                AiCrudAuditLogId = request.AiCrudAuditLogId,
                Success = false,
                Action = request.Action,
                Table = request.Table,
                ErrorMessage = ex.Message,
                Message = "ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบเงื่อนไขแล้วลองอีกครั้ง"
            };
        }
    }

    public async Task<CrudConfirmResponse> RejectCrudAsync(CrudConfirmRequest request)
    {
        try
        {
            var action = NormalizeCrudAction(request.Action) ?? request.Action?.Trim().ToLowerInvariant() ?? string.Empty;
            var table = NormalizeTableNameForAudit(request.Table);
            var fields = ToNullableDictionary(request.Fields);
            var where = ToNullableDictionary(request.Where);

            var rejectPayloadJson = JsonSerializer.Serialize(new
            {
                request.Process,
                request.UserId,
                request.RequestId,
                request.Action,
                request.Table,
                Fields = fields,
                Where = where,
                request.UserMessage
            });

            long? auditLogId = request.AiCrudAuditLogId;
            if (auditLogId.HasValue)
            {
                await _crudAuditLogService.UpdateConfirmationAsync(
                    auditLogId.Value,
                    "REJECTED",
                    null,
                    null,
                    true,
                    null,
                    rejectPayloadJson,
                    request.UserId);
            }
            else
            {
                auditLogId = await _crudAuditLogService.CreateAsync(
                    request.Process,
                    request.UserId,
                    null,
                    request.RequestId,
                    "GENERATE_SQL",
                    action,
                    table,
                    false,
                    "REJECTED",
                    null,
                    null,
                    null,
                    true,
                    null,
                    JsonSerializer.Serialize(fields),
                    JsonSerializer.Serialize(where),
                    null,
                    rejectPayloadJson,
                    request.UserId);
            }

            return new CrudConfirmResponse
            {
                AiCrudAuditLogId = auditLogId,
                Success = true,
                Action = action,
                Table = table,
                Message = "ยกเลิกรายการเรียบร้อยแล้ว"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reject CRUD action. User: {UserId}, Process: {Process}", request.UserId, request.Process);
            return new CrudConfirmResponse
            {
                AiCrudAuditLogId = request.AiCrudAuditLogId,
                Success = false,
                Action = request.Action,
                Table = request.Table,
                ErrorMessage = ex.Message,
                Message = "ไม่สามารถยกเลิกคำสั่งได้ กรุณาลองใหม่อีกครั้ง"
            };
        }
    }

    public async Task<SuggestionsResponse> GenerateSuggestionsAsync(SuggestionsRequest request)
    {
        try
        {
            _logger.LogInformation("Generating {Count} suggestions for process '{Process}', user '{UserId}', lang '{Lang}'",
                request.Count, request.Process, request.UserId, request.Lang);

            var systemPromptOverride = GetAllowedSystemPromptOverride(request.Process, request.SystemPromptId);
            var (combinedPrompt, _, _) = await _promptService.BuildCombinedPromptAsync(request.Process, systemPromptOverride);

            var isThai = string.Equals(request.Lang, "th", StringComparison.OrdinalIgnoreCase);
            var targetLanguageName = isThai ? "Thai" : "English";
            var targetLanguageInstruction = isThai
                ? "All suggested questions must be written in Thai only. Do not use English."
                : "All suggested questions must be written in English only. Do not use Thai.";

            var userContextParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(request.UserName))
                userContextParts.Add($"ชื่อ-นามสกุล: {request.UserName}");
            if (!string.IsNullOrWhiteSpace(request.UserId))
                userContextParts.Add($"UserId: {request.UserId}");

            var userContextBlock = userContextParts.Count > 0
                ? $"\n\n[ข้อมูลผู้ใช้งานปัจจุบัน]\n{string.Join("\n", userContextParts)}"
                : string.Empty;

            var systemPrompt =
                $"[LANGUAGE OVERRIDE]\n{targetLanguageInstruction}\n\n" +
                $"{combinedPrompt}{userContextBlock}\n\n" +
                $"[หน้าที่ของคุณในตอนนี้]\n" +
                (isThai
                    ? $"สร้างรายการคำถามแนะนำ {request.Count} ข้อ ที่ผู้ใช้งานอาจต้องการถามเกี่ยวกับข้อมูลในหน้านี้ " +
                      $"โดยคำถามควรสั้น กระชับ และเฉพาะเจาะจงกับบริบทของหน้านี้ " +
                      $"ตอบเป็น JSON array ของ string เท่านั้น ห้ามมี property อื่น ห้ามมี markdown และห้ามอธิบายเพิ่ม\n" +
                      $"ตัวอย่างรูปแบบ: [\"คำถาม 1\", \"คำถาม 2\", \"คำถาม 3\", \"คำถาม 4\"]"
                    : $"Create {request.Count} suggested questions that the user may want to ask about this page. " +
                      $"Keep each question short, clear, and specific to the page context. " +
                      $"Respond with a JSON array of strings only. Do not include any other properties, markdown, or extra explanation.\n" +
                      $"Example: [\"Question 1\", \"Question 2\", \"Question 3\", \"Question 4\"]");

            var messages = new List<FallbackMessage>
            {
                new("system", systemPrompt),
                new("user", isThai
                    ? $"กรุณาสร้าง {request.Count} คำถามแนะนำสำหรับหน้านี้"
                    : $"Please create {request.Count} suggested questions for this page")
            };

            var aiResult = await _fallbackChatService.CompleteAsync(messages);

            // Parse the JSON array from the AI response
            var suggestions = ParseSuggestionsArray(aiResult.Content, request.Count);

            if (!isThai && suggestions.Count > 0)
            {
                suggestions = await NormalizeSuggestionsLanguageAsync(suggestions, targetLanguageName, request.Count);
            }

            _logger.LogInformation("Generated {Count} suggestions for process '{Process}' in lang '{Lang}'", suggestions.Count, request.Process, request.Lang);

            return new SuggestionsResponse
            {
                Success = true,
                Suggestions = suggestions
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating suggestions for process '{Process}' in lang '{Lang}'", request.Process, request.Lang);
            return new SuggestionsResponse
            {
                Success = false,
                Suggestions = [],
                ErrorMessage = "ไม่สามารถสร้างคำถามแนะนำได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
            };
        }
    }

    private List<string> ParseSuggestionsArray(string aiContent, int expectedCount)
    {
        if (string.IsNullOrWhiteSpace(aiContent))
            return [];

        // Strip markdown code fences
        var cleaned = Regex.Replace(aiContent, @"```(?:json)?\s*", "", RegexOptions.IgnoreCase).Trim();

        try
        {
            // Find first JSON array in response
            var arrayMatch = Regex.Match(cleaned, @"\[[\s\S]*?\]", RegexOptions.None, TimeSpan.FromSeconds(2));
            if (arrayMatch.Success)
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(arrayMatch.Value);
                if (parsed is { Count: > 0 })
                    return parsed.Take(expectedCount).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse suggestions array. Raw content: {Content}", aiContent);
        }

        return [];
    }

    private async Task<List<string>> NormalizeSuggestionsLanguageAsync(
        List<string> suggestions,
        string targetLanguageName,
        int expectedCount)
    {
        try
        {
            var systemPrompt =
                $"Translate each item in the provided JSON array into {targetLanguageName}. " +
                "Keep the meaning, keep each item short and natural for a UI quick-pick, and output a JSON array of strings only. " +
                "Do not add markdown or any explanation.";

            var messages = new List<FallbackMessage>
            {
                new("system", systemPrompt),
                new("user", JsonSerializer.Serialize(suggestions))
            };

            var translatedResult = await _fallbackChatService.CompleteAsync(messages);
            var translatedSuggestions = ParseSuggestionsArray(translatedResult.Content, expectedCount);

            return translatedSuggestions.Count > 0 ? translatedSuggestions : suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to normalize suggestion language to {TargetLanguage}. Returning original suggestions.", targetLanguageName);
            return suggestions;
        }
    }

    private async Task<ChatResponse> HandleGenerateSqlPathAsync(
        ChatRequest request,
        AiParsedResponse parsedResponse,
        ChatLog chatLog,
        KnowledgeRetrievalResult retrievalContext,
        Stopwatch stopwatch)
    {
        // ── Step A: Safety check (keyword/DDL guard — no DB connection) ────────
        // Allow CRUD (INSERT/UPDATE/DELETE) if action indicates CRUD operation
        bool isCrudAction = IsCrudProposalAction(parsedResponse.Action);
        var (isSafe, reason) = _sqlExecutionService.ValidateSql(parsedResponse.Sql!, allowCrud: isCrudAction);
        if (!isSafe)
        {
            _logger.LogWarning("AI generated unsafe SQL: {Reason}", reason);
            const string safetyMessage =
                "ขออภัยครับ คำถามที่ถามไม่สามารถดำเนินการได้ เนื่องจากระบบอนุญาตเฉพาะการ<b>ดึงข้อมูล (SELECT)</b> เท่านั้น " +
                "ไม่รองรับการแก้ไข เพิ่ม หรือลบข้อมูล กรุณาลองถามใหม่ในรูปแบบอื่นครับ";
            chatLog.AiResponse = safetyMessage;
            chatLog.IsSuccess = false;
            chatLog.ErrorMessage = $"SQL blocked: {reason}";
            stopwatch.Stop();
            chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
            await LogChatAndRetrievalAsync(chatLog, retrievalContext);

            return new ChatResponse
            {
                Success = false,
                AiResponse = safetyMessage,
                AiDecision = "GENERATE_SQL",
                GeneratedSql = parsedResponse.Sql,
                Action = parsedResponse.Action,
                Table = parsedResponse.Table,
                Fields = parsedResponse.Fields,
                Where = parsedResponse.Where,
                ModelUsed = chatLog.ModelName,
                ErrorMessage = $"SQL blocked: {reason}",
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                Tokens = new TokenUsage
                {
                    PromptTokens = chatLog.PromptTokens,
                    CompletionTokens = chatLog.CompletionTokens,
                    TotalTokens = chatLog.TotalTokens
                }
            };
        }

        // ── Step B: Schema validation + AI self-correction loop ────────────────
        // Validates against the real DB schema (table/column names, syntax).
        // If invalid, sends the error back to AI and asks it to fix — up to MaxSqlRetries times.
        const int maxSqlRetries = 2;
        var currentSql = parsedResponse.Sql!;

        for (int attempt = 1; attempt <= maxSqlRetries + 1; attempt++)
        {
            var (isValid, sqlError) = await _sqlExecutionService.ValidateSqlSyntaxAsync(currentSql);

            if (isValid)
            {
                // SQL is valid — break and execute
                if (attempt > 1)
                    _logger.LogInformation("SQL fixed successfully on attempt {Attempt}: {Sql}", attempt, currentSql);
                break;
            }

            _logger.LogWarning("SQL schema validation failed (attempt {Attempt}/{Max}): {Error}", attempt, maxSqlRetries + 1, sqlError);

            if (attempt > maxSqlRetries)
            {
                // All retries exhausted
                _logger.LogWarning("All SQL fix attempts exhausted. Last SQL: {Sql}", currentSql);
                const string exhaustedMsg = "ขออภัยครับ ระบบไม่สามารถสร้าง SQL Query ที่ถูกต้องได้ในขณะนี้ " +
                    "กรุณาลองถามใหม่ด้วยคำที่ชัดเจนขึ้น หรือระบุชื่อ column/table ที่ต้องการให้ชัดเจนครับ";
                chatLog.AiResponse = exhaustedMsg;
                chatLog.IsSuccess = false;
                chatLog.ErrorMessage = $"SQL validation failed after {maxSqlRetries} fix attempts: {sqlError}";
                chatLog.GeneratedSql = currentSql;
                stopwatch.Stop();
                chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
                await LogChatAndRetrievalAsync(chatLog, retrievalContext);

                return new ChatResponse
                {
                    Success = false,
                    AiResponse = exhaustedMsg,
                    AiDecision = "GENERATE_SQL",
                    GeneratedSql = currentSql,
                    Action = parsedResponse.Action,
                    Table = parsedResponse.Table,
                    Fields = parsedResponse.Fields,
                    Where = parsedResponse.Where,
                    ModelUsed = chatLog.ModelName,
                    ErrorMessage = $"SQL invalid: {sqlError}",
                    ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                    Tokens = new TokenUsage
                    {
                        PromptTokens = chatLog.PromptTokens,
                        CompletionTokens = chatLog.CompletionTokens,
                        TotalTokens = chatLog.TotalTokens
                    }
                };
            }

            // Ask AI to fix the SQL
            _logger.LogInformation("Asking AI to fix SQL (attempt {Attempt})...", attempt);
            var fixMessages = new List<FallbackMessage>
            {
                new("system",
                    "You are a SQL expert for Microsoft SQL Server. " +
                    "Fix the SQL query so it compiles correctly against the database schema. " +
                    "Return ONLY a JSON object with this exact structure: " +
                    "{\"decision\": \"GENERATE_SQL\", \"sql\": \"<corrected SQL here>\", \"response\": \"\"}"),
                new("user",
                    $"The following SQL query failed validation with this error:\n\n" +
                    $"Error: {sqlError}\n\n" +
                    $"Original SQL:\n{currentSql}\n\n" +
                    $"Original user question: {request.UserMessage}\n\n" +
                    $"Fix the SQL so it is valid for Microsoft SQL Server. " +
                    $"Return ONLY the JSON with the corrected SQL.")
            };

            var fixResult = await _fallbackChatService.CompleteAsync(fixMessages);

            // Accumulate tokens from fix attempt
            chatLog.PromptTokens += fixResult.PromptTokens;
            chatLog.CompletionTokens += fixResult.CompletionTokens;
            chatLog.TotalTokens += fixResult.TotalTokens;

            var fixParsed = ParseAiResponse(fixResult.Content);
            if (fixParsed.Decision == "GENERATE_SQL" && !string.IsNullOrWhiteSpace(fixParsed.Sql))
            {
                // Keyword-safety re-check on the fixed SQL before next validation loop
                // Use same allowCrud setting as initial validation so CRUD fixes are allowed
                var (fixedSafe, fixedReason) = _sqlExecutionService.ValidateSql(fixParsed.Sql, allowCrud: isCrudAction);
                if (!fixedSafe)
                {
                    _logger.LogWarning("AI-fixed SQL failed safety check: {Reason}", fixedReason);
                    break; // Return exhausted error on next iteration
                }
                currentSql = fixParsed.Sql;
                _logger.LogInformation("AI proposed fixed SQL: {Sql}", currentSql);
            }
            else
            {
                _logger.LogWarning("AI did not return a fixed SQL. Raw response: {Content}", fixResult.Content);
                break;
            }
        }

        // ── Step C: Execute the validated SQL ──────────────────────────────────
        chatLog.GeneratedSql = currentSql;
        var queryResults = await _sqlExecutionService.ExecuteSqlAsync(currentSql);
        var resultsList = queryResults.ToList();
        var reportData = BuildReportDataPayload(resultsList);
        var dataRows = BuildDisplayDataRows(resultsList, parsedResponse.ColumnMapping, parsedResponse.ValueMapping);
        var useThai = ContainsThaiText(request.UserMessage);

        if (resultsList.Count == 0)
        {
            var emptyResponse = useThai
                ? "ไม่พบข้อมูลที่ตรงตามเงื่อนไขในขณะนี้ครับ"
                : "No matching data found at this time.";

            chatLog.AiResponse = emptyResponse;
            chatLog.IsSuccess = true;

            stopwatch.Stop();
            chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
            await LogChatAndRetrievalAsync(chatLog, retrievalContext);

            return new ChatResponse
            {
                Success = true,
                AiResponse = emptyResponse,
                AiDecision = "GENERATE_SQL",
                GeneratedSql = currentSql,
                Action = parsedResponse.Action,
                Table = parsedResponse.Table,
                Fields = parsedResponse.Fields,
                Where = parsedResponse.Where,
                ReportData = reportData,
                DataRows = dataRows,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                Tokens = new TokenUsage
                {
                    PromptTokens = chatLog.PromptTokens,
                    CompletionTokens = chatLog.CompletionTokens,
                    TotalTokens = chatLog.TotalTokens
                }
            };
        }

        // Serialize results — truncate if too large
        var resultsJson = JsonSerializer.Serialize(resultsList, new JsonSerializerOptions
        {
            WriteIndented = false,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });
        if (resultsJson.Length > 8000)
            resultsJson = resultsJson[..8000] + $"\n... (truncated, {resultsList.Count} total rows)";

        // ── Step D: Summarize results ──────────────────────────────────────────
        var plannedResponseStyle = string.IsNullOrWhiteSpace(parsedResponse.Response)
            ? string.Empty
            : $"\n\nPlanned user-facing response style (use only as wording and formatting guidance, and do not copy any unverified values):\n{parsedResponse.Response}";
        var retrievedKnowledgeForSummary = string.IsNullOrWhiteSpace(retrievalContext.FormattedContext)
            ? string.Empty
            : $"\n\nRetrieved knowledge rules that governed this request:\n{TrimForPrompt(retrievalContext.FormattedContext, 6000)}";

        var summaryMessages = new List<FallbackMessage>
        {
            new("system",
                "You are a data analyst assistant. Summarize the SQL query results in a clear, " +
                "easy-to-understand format. Use the same language as the original question. " +
                "Provide only a short business summary for executives. Do not create Markdown tables " +
                "and do not enumerate the full row-by-row details in the response because the UI will " +
                "render the data_rows payload separately. Format numbers with commas where appropriate. " +
                "Use the retrieved knowledge rules as mandatory business logic. If the executed SQL or " +
                "result rows do not apply a required business constraint from the retrieved knowledge, " +
                "state that the result is incomplete instead of drawing a final conclusion."),
            new("user",
                $"Original question: {request.UserMessage}\n\n" +
                $"SQL executed: {currentSql}\n\n" +
                $"Results ({resultsList.Count} rows):\n{resultsJson}" +
                retrievedKnowledgeForSummary +
                plannedResponseStyle)
        };

        var summaryResult = await _fallbackChatService.CompleteAsync(summaryMessages);
        var finalResponse = !string.IsNullOrWhiteSpace(summaryResult.Content)
            ? summaryResult.Content
            : useThai
                ? "ไม่สามารถสรุปผลข้อมูลได้"
                : "Unable to summarize the data at this time.";

        // Accumulate tokens
        chatLog.PromptTokens += summaryResult.PromptTokens;
        chatLog.CompletionTokens += summaryResult.CompletionTokens;
        chatLog.TotalTokens += summaryResult.TotalTokens;
        chatLog.ModelName = $"{chatLog.ModelName}→{summaryResult.ModelUsed}";
        chatLog.AiResponse = finalResponse;
        chatLog.IsSuccess = true;

        stopwatch.Stop();
        chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
        await LogChatAndRetrievalAsync(chatLog, retrievalContext);

        return new ChatResponse
        {
            Success = true,
            AiResponse = finalResponse,
            AiDecision = "GENERATE_SQL",
            GeneratedSql = currentSql,
            Action = parsedResponse.Action,
            Table = parsedResponse.Table,
            Fields = parsedResponse.Fields,
            Where = parsedResponse.Where,
            ReportData = reportData,
            DataRows = dataRows,
            ModelUsed = summaryResult.ModelUsed,
            FallbackInfo = BuildFallbackInfo(summaryResult),
            ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
            Tokens = new TokenUsage
            {
                PromptTokens = chatLog.PromptTokens,
                CompletionTokens = chatLog.CompletionTokens,
                TotalTokens = chatLog.TotalTokens
            }
        };
    }

    /// <summary>Parses the AI JSON response to extract decision, SQL, and response text.</summary>
    private AiParsedResponse ParseAiResponse(string aiResponseText)
    {
        if (string.IsNullOrWhiteSpace(aiResponseText))
            return new AiParsedResponse { Decision = "BYPASS_SQL", Response = string.Empty };

        var useThai = ContainsThaiText(aiResponseText);

        // Strip markdown code fences (```json ... ``` or ``` ... ```)
        var cleaned = Regex.Replace(aiResponseText, @"```(?:json)?\s*", "", RegexOptions.IgnoreCase).Trim();

        try
        {
            var jsonMatch = Regex.Match(cleaned, @"\{[\s\S]*\}", RegexOptions.None, TimeSpan.FromSeconds(2));
            if (jsonMatch.Success)
            {
                var parsed = JsonSerializer.Deserialize<AiJsonResponse>(jsonMatch.Value,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (parsed != null)
                {
                    var decision = parsed.Decision?.ToUpperInvariant() ?? "BYPASS_SQL";
                    var response = parsed.Response;

                    // If response is null/empty after successful parse, do NOT fall back to raw JSON text
                    if (string.IsNullOrWhiteSpace(response))
                    {
                        _logger.LogWarning("AI returned valid JSON but 'response' field is empty. Decision={Decision}", decision);
                        response = useThai
                            ? "ขออภัยครับ ระบบไม่สามารถประมวลผลคำตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
                            : "Sorry, the system could not process the response at this time. Please try again.";
                    }

                    return new AiParsedResponse
                    {
                        Decision = decision,
                        Action = parsed.Action?.Trim().ToLowerInvariant(),
                        Table = parsed.Table,
                        Fields = ParseJsonObject(parsed.Fields),
                        Where = ParseJsonObject(parsed.Where),
                        ColumnMapping = ParseStringDictionary(parsed.ColumnMapping),
                        ValueMapping = ParseNestedStringDictionary(parsed.ValueMapping),
                        BusinessPlan = ParseBusinessPlanObject(parsed.BusinessPlan),
                        Sql = parsed.Sql,
                        Response = response
                    };
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse AI response as JSON. Raw content (first 200 chars): {Preview}",
                aiResponseText.Length > 200 ? aiResponseText[..200] : aiResponseText);
        }

        // If the raw text itself looks like a JSON object (AI forgot wrapping or parse failed),
        // avoid surfacing raw JSON to the user
        if (aiResponseText.TrimStart().StartsWith('{'))
        {
            _logger.LogWarning("AI response looks like raw JSON but could not be parsed. Returning fallback message.");
            return new AiParsedResponse
            {
                Decision = "BYPASS_SQL",
                Response = useThai
                    ? "ขออภัยครับ ระบบไม่สามารถประมวลผลคำตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
                    : "Sorry, the system could not process the response at this time. Please try again."
            };
        }

        // Plain text response (no JSON structure) — treat as BYPASS_SQL
        return new AiParsedResponse
        {
            Decision = "BYPASS_SQL",
            Response = aiResponseText
        };
    }

    private static FallbackInfo? BuildFallbackInfo(FallbackChatResult result)
    {
        if (result.AttemptCount <= 1 && result.FailedModels.Count == 0) return null;
        return new FallbackInfo
        {
            AttemptCount = result.AttemptCount,
            FailedModels = result.FailedModels,
            FinalModel = result.ModelUsed
        };
    }

    private static ReportDataPayload BuildReportDataPayload(List<IDictionary<string, object>> results)
    {
        var payload = new ReportDataPayload
        {
            RowCount = results.Count,
            IsTruncated = false
        };

        if (results.Count == 0)
        {
            return payload;
        }

        payload.Columns = results[0].Keys.ToList();
        payload.Rows = results
            .Select(row => row.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value == DBNull.Value ? null : kvp.Value))
            .ToList();

        return payload;
    }

    private static List<Dictionary<string, object?>> BuildDisplayDataRows(
        List<IDictionary<string, object>> results,
        Dictionary<string, string>? columnMapping,
        Dictionary<string, Dictionary<string, string>>? valueMapping)
    {
        if (results.Count == 0)
        {
            return [];
        }

        return results
            .Select(row =>
            {
                var displayRow = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

                foreach (var (columnName, rawValue) in row)
                {
                    var normalizedValue = rawValue == DBNull.Value ? null : rawValue;
                    var displayColumnName = ResolveDisplayColumnName(columnName, columnMapping);

                    displayRow[displayColumnName] = ResolveDisplayCellValue(
                        columnName,
                        normalizedValue,
                        valueMapping);
                }

                return displayRow;
            })
            .ToList();
    }

    private static string ResolveDisplayColumnName(
        string columnName,
        Dictionary<string, string>? columnMapping)
    {
        if (columnMapping != null
            && columnMapping.TryGetValue(columnName, out var mappedColumnName)
            && !string.IsNullOrWhiteSpace(mappedColumnName))
        {
            return mappedColumnName.Trim();
        }

        return columnName;
    }

    private static object? ResolveDisplayCellValue(
        string columnName,
        object? rawValue,
        Dictionary<string, Dictionary<string, string>>? valueMapping)
    {
        if (rawValue is null)
        {
            return null;
        }

        if (valueMapping != null
            && valueMapping.TryGetValue(columnName, out var columnValueMapping))
        {
            foreach (var candidate in BuildValueLookupCandidates(rawValue))
            {
                if (columnValueMapping.TryGetValue(candidate, out var mappedValue)
                    && !string.IsNullOrWhiteSpace(mappedValue))
                {
                    return mappedValue.Trim();
                }
            }
        }

        return rawValue;
    }

    private static IEnumerable<string> BuildValueLookupCandidates(object rawValue)
    {
        var candidates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        static void AddCandidate(HashSet<string> target, string? candidate)
        {
            if (!string.IsNullOrWhiteSpace(candidate))
            {
                target.Add(candidate.Trim());
            }
        }

        AddCandidate(candidates, ConvertToInvariantString(rawValue));

        switch (rawValue)
        {
            case bool boolValue:
                AddCandidate(candidates, boolValue ? "true" : "false");
                AddCandidate(candidates, boolValue ? "1" : "0");
                break;

            case string stringValue:
                foreach (var alias in GetBooleanAliases(stringValue))
                {
                    AddCandidate(candidates, alias);
                }
                break;

            case sbyte or byte or short or ushort or int or uint or long or ulong or float or double or decimal:
                foreach (var alias in GetNumericBooleanAliases(rawValue))
                {
                    AddCandidate(candidates, alias);
                }
                break;
        }

        return candidates;
    }

    private static IEnumerable<string> GetBooleanAliases(string rawValue)
    {
        var normalized = rawValue.Trim().ToLowerInvariant();
        return normalized switch
        {
            "true" => ["true", "1"],
            "false" => ["false", "0"],
            "1" => ["1", "true"],
            "0" => ["0", "false"],
            "y" or "yes" => [normalized, "true", "1"],
            "n" or "no" => [normalized, "false", "0"],
            _ => []
        };
    }

    private static IEnumerable<string> GetNumericBooleanAliases(object rawValue)
    {
        var normalized = ConvertToInvariantString(rawValue);
        if (!decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
        {
            return [];
        }

        if (number == 1)
        {
            return ["1", "true"];
        }

        if (number == 0)
        {
            return ["0", "false"];
        }

        return [];
    }

    private static string? ConvertToInvariantString(object rawValue)
    {
        return rawValue switch
        {
            DateTime dateTime => dateTime.ToString("O", CultureInfo.InvariantCulture),
            DateTimeOffset dateTimeOffset => dateTimeOffset.ToString("O", CultureInfo.InvariantCulture),
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => rawValue.ToString()
        };
    }

    private static CrudBusinessPlan? ParseBusinessPlanObject(JsonElement? element)
    {
        if (element is null || element.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var parsed = new CrudBusinessPlan
        {
            Target = TryGetBusinessPlanText(element.Value, "target"),
            Activity = TryGetBusinessPlanText(element.Value, "activity"),
            DataSummary = TryGetBusinessPlanText(element.Value, "data_summary", "dataSummary"),
            Reference = TryGetBusinessPlanText(element.Value, "reference")
        };

        return HasBusinessPlanContent(parsed) ? parsed : null;
    }

    private static CrudBusinessPlan? BuildCrudBusinessPlan(AiParsedResponse parsedResponse)
    {
        var existingPlan = parsedResponse.BusinessPlan;
        if (!IsCrudProposalAction(parsedResponse.Action) && !HasBusinessPlanContent(existingPlan))
        {
            return existingPlan;
        }

        var useThai = ContainsThaiText(parsedResponse.Response);
        var referenceValues = ExtractBusinessPreviewValues(parsedResponse.Where);
        if (referenceValues.Count == 0)
        {
            referenceValues = ExtractBusinessPreviewValues(parsedResponse.Fields);
        }

        var mergedPlan = new CrudBusinessPlan
        {
            Target = NormalizeBusinessText(existingPlan?.Target)
                ?? (useThai ? "ข้อมูลรายการนี้" : "This business record"),
            Activity = NormalizeBusinessText(existingPlan?.Activity)
                ?? BuildCrudActivityText(parsedResponse.Action, useThai),
            DataSummary = NormalizeBusinessText(existingPlan?.DataSummary)
                ?? NormalizeBusinessText(parsedResponse.Response)
                ?? (useThai
                    ? "ระบบเตรียมดำเนินการตามรายการนี้"
                    : "The system is ready to perform this action."),
            Reference = NormalizeBusinessText(existingPlan?.Reference)
                ?? BuildCrudReferenceText(referenceValues, useThai)
        };

        return HasBusinessPlanContent(mergedPlan) ? mergedPlan : null;
    }

    private static string? TryGetBusinessPlanText(JsonElement element, params string[] propertyNames)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (!propertyNames.Any(name => string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            return NormalizeBusinessText(property.Value.ValueKind == JsonValueKind.String
                ? property.Value.GetString()
                : property.Value.ToString());
        }

        return null;
    }

    private static List<string> ExtractBusinessPreviewValues(Dictionary<string, object?>? source)
    {
        if (source is null || source.Count == 0)
        {
            return [];
        }

        return source.Values
            .Select(value => value switch
            {
                null => null,
                IEnumerable<object?> list => string.Join(", ", list
                    .Select(item => NormalizeBusinessText(item?.ToString()))
                    .Where(item => !string.IsNullOrWhiteSpace(item))),
                _ => value.ToString()
            })
            .Select(NormalizeBusinessText)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(3)
            .Select(value => value!)
            .ToList();
    }

    private static bool HasBusinessPlanContent(CrudBusinessPlan? businessPlan)
    {
        return !string.IsNullOrWhiteSpace(NormalizeBusinessText(businessPlan?.Target))
               || !string.IsNullOrWhiteSpace(NormalizeBusinessText(businessPlan?.Activity))
               || !string.IsNullOrWhiteSpace(NormalizeBusinessText(businessPlan?.DataSummary))
               || !string.IsNullOrWhiteSpace(NormalizeBusinessText(businessPlan?.Reference));
    }

    private static string BuildCrudActivityText(string? action, bool useThai)
    {
        var normalized = action?.Trim().ToLowerInvariant();
        return normalized switch
        {
            "insert" => useThai ? "เพิ่มรายการใหม่" : "Create a new record",
            "update" => useThai ? "ปรับปรุงข้อมูลรายการ" : "Update the selected record",
            "delete" => useThai ? "ยกเลิกการใช้งานรายการ" : "Deactivate the selected record",
            _ => useThai ? "ดำเนินการกับรายการนี้" : "Process this record"
        };
    }

    private static string BuildCrudReferenceText(List<string> referenceValues, bool useThai)
    {
        if (referenceValues.Count == 0)
        {
            return useThai ? "อ้างอิงจากรายการที่เลือก" : "Based on the selected record";
        }

        return useThai
            ? $"อ้างอิงจาก {string.Join(", ", referenceValues)}"
            : $"Based on {string.Join(", ", referenceValues)}";
    }

    private static bool ContainsThaiText(string? value)
    {
        return !string.IsNullOrWhiteSpace(value) && Regex.IsMatch(value, @"[\u0E00-\u0E7F]");
    }

    private static string TrimForPrompt(string value, int maxLength)
    {
        if (value.Length <= maxLength)
        {
            return value;
        }

        return value[..maxLength] + "...";
    }

    private static string? NormalizeBusinessText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = Regex.Replace(value.Replace('_', ' '), @"\s+", " ").Trim();
        return normalized.Length == 0 ? null : normalized;
    }

    private class AiJsonResponse
    {
        [JsonPropertyName("decision")]
        public string? Decision { get; set; }

        [JsonPropertyName("action")]
        public string? Action { get; set; }

        [JsonPropertyName("table")]
        public string? Table { get; set; }

        [JsonPropertyName("fields")]
        public JsonElement? Fields { get; set; }

        [JsonPropertyName("where")]
        public JsonElement? Where { get; set; }

        [JsonPropertyName("column_mapping")]
        public JsonElement? ColumnMapping { get; set; }

        [JsonPropertyName("value_mapping")]
        public JsonElement? ValueMapping { get; set; }

        [JsonPropertyName("business_plan")]
        public JsonElement? BusinessPlan { get; set; }

        [JsonPropertyName("sql")]
        public string? Sql { get; set; }

        [JsonPropertyName("response")]
        public string? Response { get; set; }
    }

    private class AiParsedResponse
    {
        public string Decision { get; set; } = "BYPASS_SQL";
        public string? Action { get; set; }
        public string? Table { get; set; }
        public Dictionary<string, object?>? Fields { get; set; }
        public Dictionary<string, object?>? Where { get; set; }
        public Dictionary<string, string>? ColumnMapping { get; set; }
        public Dictionary<string, Dictionary<string, string>>? ValueMapping { get; set; }
        public CrudBusinessPlan? BusinessPlan { get; set; }
        public string? Sql { get; set; }
        public string? Response { get; set; }
    }

    private static bool IsCrudProposalAction(string? action)
    {
        var normalized = action?.Trim().ToLowerInvariant();
        return normalized is "insert" or "update" or "delete";
    }

    private async Task<ChatResponse> HandleCrudProposalPathAsync(
        AiParsedResponse parsedResponse,
        ChatLog chatLog,
        KnowledgeRetrievalResult retrievalContext,
        Stopwatch stopwatch,
        FallbackChatResult aiResult)
    {
        // Soft-delete enforcement at proposal layer: delete maps to update is_active = false.
        if (string.Equals(parsedResponse.Action, "delete", StringComparison.OrdinalIgnoreCase))
        {
            parsedResponse.Fields ??= new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            parsedResponse.Fields["is_active"] = false;
        }

        parsedResponse.BusinessPlan = BuildCrudBusinessPlan(parsedResponse);

        chatLog.AiDecision = "GENERATE_SQL";
        chatLog.AiResponse = parsedResponse.Response;
        chatLog.IsSuccess = true;

        stopwatch.Stop();
        chatLog.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
        var aiChatLogId = await LogChatAndRetrievalAsync(chatLog, retrievalContext);

        var proposalPayloadJson = JsonSerializer.Serialize(new
        {
            Decision = "GENERATE_SQL",
            parsedResponse.Action,
            parsedResponse.Table,
            parsedResponse.Fields,
            parsedResponse.Where,
            parsedResponse.BusinessPlan,
            parsedResponse.Sql,
            parsedResponse.Response
        });

        var auditLogId = await _crudAuditLogService.CreateAsync(
            chatLog.Process,
            chatLog.UserId,
            aiChatLogId,
            null,
            "GENERATE_SQL",
            parsedResponse.Action ?? "update",
            parsedResponse.Table ?? string.Empty,
            true,
            "PENDING",
            parsedResponse.Sql,
            null,
            null,
            true,
            null,
            JsonSerializer.Serialize(parsedResponse.Fields),
            JsonSerializer.Serialize(parsedResponse.Where),
            proposalPayloadJson,
            null,
            chatLog.UserId);

        return new ChatResponse
        {
            Success = true,
            AiResponse = parsedResponse.Response,
            AiDecision = "GENERATE_SQL",
            Action = parsedResponse.Action,
            Table = parsedResponse.Table,
            Fields = parsedResponse.Fields,
            Where = parsedResponse.Where,
            BusinessPlan = parsedResponse.BusinessPlan,
            GeneratedSql = parsedResponse.Sql,
            RequiresConfirmation = true,
            AiCrudAuditLogId = auditLogId,
            ErrorMessage = auditLogId.HasValue ? null : "Failed to write CRUD audit log.",
            ModelUsed = aiResult.ModelUsed,
            FallbackInfo = BuildFallbackInfo(aiResult),
            ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
            Tokens = new TokenUsage
            {
                PromptTokens = aiResult.PromptTokens,
                CompletionTokens = aiResult.CompletionTokens,
                TotalTokens = aiResult.TotalTokens
            }
        };
    }

    private static Dictionary<string, object?>? ParseJsonObject(JsonElement? element)
    {
        if (element is null || element.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var result = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var property in element.Value.EnumerateObject())
        {
            result[property.Name] = ConvertJsonValue(property.Value);
        }

        return result;
    }

    private static Dictionary<string, string>? ParseStringDictionary(JsonElement? element)
    {
        if (element is null || element.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var property in element.Value.EnumerateObject())
        {
            var mappedHeader = property.Value.ValueKind == JsonValueKind.String
                ? property.Value.GetString()
                : property.Value.ToString();

            if (string.IsNullOrWhiteSpace(property.Name) || string.IsNullOrWhiteSpace(mappedHeader))
            {
                continue;
            }

            result[property.Name] = mappedHeader.Trim();
        }

        return result.Count > 0 ? result : null;
    }

    private static Dictionary<string, Dictionary<string, string>>? ParseNestedStringDictionary(JsonElement? element)
    {
        if (element is null || element.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var result = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var property in element.Value.EnumerateObject())
        {
            var columnName = property.Name.Trim();
            if (string.IsNullOrWhiteSpace(columnName) || property.Value.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var valueMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var mapEntry in property.Value.EnumerateObject())
            {
                var sourceValue = mapEntry.Name.Trim();
                var displayValue = mapEntry.Value.ValueKind == JsonValueKind.String
                    ? mapEntry.Value.GetString()
                    : mapEntry.Value.ToString();

                if (string.IsNullOrWhiteSpace(sourceValue) || string.IsNullOrWhiteSpace(displayValue))
                {
                    continue;
                }

                valueMap[sourceValue] = displayValue.Trim();
            }

            if (valueMap.Count > 0)
            {
                result[columnName] = valueMap;
            }
        }

        return result.Count > 0 ? result : null;
    }

    private static object? ConvertJsonValue(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number when value.TryGetInt64(out var i64) => i64,
            JsonValueKind.Number when value.TryGetDouble(out var dbl) => dbl,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Object => value.EnumerateObject().ToDictionary(p => p.Name, p => ConvertJsonValue(p.Value)),
            JsonValueKind.Array => value.EnumerateArray().Select(ConvertJsonValue).ToList(),
            _ => value.ToString()
        };
    }

    private static string? NormalizeCrudAction(string action)
    {
        if (string.IsNullOrWhiteSpace(action)) return null;
        var normalized = action.Trim().ToLowerInvariant();
        return normalized is "insert" or "update" or "delete" ? normalized : null;
    }

    private static Dictionary<string, object?> ToNullableDictionary(Dictionary<string, object>? source)
    {
        if (source is null || source.Count == 0)
        {
            return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        }

        return source.ToDictionary(
            kvp => kvp.Key,
            kvp => NormalizeCrudPayloadValue(kvp.Value),
            StringComparer.OrdinalIgnoreCase);
    }

    private static object? NormalizeCrudPayloadValue(object? value)
    {
        return value switch
        {
            null => null,
            JsonElement element => ConvertJsonValue(element),
            IDictionary<string, object?> dictionary => dictionary.ToDictionary(
                kvp => kvp.Key,
                kvp => NormalizeCrudPayloadValue(kvp.Value),
                StringComparer.OrdinalIgnoreCase),
            IEnumerable<object?> list when value is not string => list.Select(NormalizeCrudPayloadValue).ToList(),
            _ => value
        };
    }

    private static void ApplyCrudContextPlaceholders(Dictionary<string, object?> source, string currentUserId)
    {
        foreach (var key in source.Keys.ToList())
        {
            source[key] = ResolveCrudContextPlaceholder(source[key], currentUserId);
        }
    }

    private static object? ResolveCrudContextPlaceholder(object? value, string currentUserId)
    {
        if (!IsPlaceholderToken(value, "current_user"))
        {
            return value;
        }

        return currentUserId;
    }

    private static bool IsPlaceholderToken(object? value, string token)
    {
        if (value is not string text)
        {
            return false;
        }

        var normalized = text.Trim();
        if (normalized.StartsWith('{') && normalized.EndsWith('}') && normalized.Length > 2)
        {
            normalized = normalized[1..^1].Trim();
        }

        return string.Equals(normalized, token, StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeTableNameForAudit(string? tableName)
    {
        if (string.IsNullOrWhiteSpace(tableName))
        {
            return string.Empty;
        }

        try
        {
            return ValidateAndNormalizeTableName(tableName);
        }
        catch
        {
            return tableName.Trim();
        }
    }

    private static string ValidateAndNormalizeTableName(string tableName)
    {
        if (string.IsNullOrWhiteSpace(tableName))
        {
            throw new InvalidOperationException("Table name is required.");
        }

        var segments = tableName
            .Split('.', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length is < 1 or > 2)
        {
            throw new InvalidOperationException("Table name must be in 'table' or 'schema.table' format.");
        }

        foreach (var segment in segments)
        {
            if (!Regex.IsMatch(segment, @"^[A-Za-z_][A-Za-z0-9_]*$"))
            {
                throw new InvalidOperationException($"Invalid table identifier: {segment}");
            }
        }

        return string.Join('.', segments.Select(s => $"[{s}]"));
    }

    private static string ValidateAndNormalizeColumnName(string columnName)
    {
        if (string.IsNullOrWhiteSpace(columnName))
        {
            throw new InvalidOperationException("Column name is required.");
        }

        if (!Regex.IsMatch(columnName, @"^[A-Za-z_][A-Za-z0-9_]*$"))
        {
            throw new InvalidOperationException($"Invalid column identifier: {columnName}");
        }

        return $"[{columnName}]";
    }

    private static (string sql, Dictionary<string, object?> parameters) BuildCrudSql(
        string action,
        string table,
        Dictionary<string, object?> fields,
        Dictionary<string, object?> where)
    {
        return action switch
        {
            "insert" => BuildInsertSql(table, fields),
            "update" => BuildUpdateSql(table, fields, where),
            _ => throw new InvalidOperationException($"Unsupported CRUD action: {action}")
        };
    }

    private static (string sql, Dictionary<string, object?> parameters) BuildInsertSql(
        string table,
        Dictionary<string, object?> fields)
    {
        if (fields.Count == 0)
        {
            throw new InvalidOperationException("Insert action requires at least one field.");
        }

        var parameters = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        var columns = new List<string>();
        var values = new List<string>();

        var index = 0;
        foreach (var (key, value) in fields)
        {
            var column = ValidateAndNormalizeColumnName(key);
            columns.Add(column);

            if (IsPlaceholderToken(value, "current_timestamp"))
            {
                values.Add("GETDATE()");
                continue;
            }

            var parameterName = $"p{index++}";
            values.Add($"@{parameterName}");
            parameters[parameterName] = value;
        }

        var sql = $"INSERT INTO {table} ({string.Join(", ", columns)}) VALUES ({string.Join(", ", values)});";
        return (sql, parameters);
    }

    private static (string sql, Dictionary<string, object?> parameters) BuildUpdateSql(
        string table,
        Dictionary<string, object?> fields,
        Dictionary<string, object?> where)
    {
        if (fields.Count == 0)
        {
            throw new InvalidOperationException("Update action requires at least one field.");
        }

        if (where.Count == 0)
        {
            throw new InvalidOperationException("Update action requires WHERE conditions.");
        }

        var parameters = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        var setParts = new List<string>();
        var whereParts = new List<string>();

        var index = 0;
        foreach (var (key, value) in fields)
        {
            var column = ValidateAndNormalizeColumnName(key);

            if (IsPlaceholderToken(value, "current_timestamp"))
            {
                setParts.Add($"{column} = GETDATE()");
                continue;
            }

            var parameterName = $"set_{index++}";
            setParts.Add($"{column} = @{parameterName}");
            parameters[parameterName] = value;
        }

        index = 0;
        foreach (var (key, value) in where)
        {
            var column = ValidateAndNormalizeColumnName(key);
            var parameterName = $"where_{index++}";
            whereParts.Add($"{column} = @{parameterName}");
            parameters[parameterName] = value;
        }

        var sqlBuilder = new StringBuilder();
        sqlBuilder.Append($"UPDATE {table} SET ");
        sqlBuilder.Append(string.Join(", ", setParts));
        sqlBuilder.Append(" WHERE ");
        sqlBuilder.Append(string.Join(" AND ", whereParts));
        sqlBuilder.Append(';');

        return (sqlBuilder.ToString(), parameters);
    }

    private static int? GetAllowedSystemPromptOverride(string process, int? systemPromptId)
    {
        if (!systemPromptId.HasValue)
        {
            return null;
        }

        return string.Equals(process, "/ai/admin-chat", StringComparison.OrdinalIgnoreCase)
            ? systemPromptId
            : null;
    }
}
