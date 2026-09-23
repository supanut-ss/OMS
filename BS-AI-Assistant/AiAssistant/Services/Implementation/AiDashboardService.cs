using AiAssistant.Models.Responses; 
using AiAssistant.Services.Interfaces;

namespace AiAssistant.Services.Implementation
{
    public class AiDashboardService : IAiDashboardService
    {
        private readonly IPromptService _promptService;
        private readonly ISqlExecutionService _sqlExecutionService;
        private readonly IChatLogService _chatLogService;
        private readonly IFallbackChatService _fallbackChatService;
        private readonly IAiProviderConfigService _providerConfigService;
        private readonly IKnowledgeRetrievalService _knowledgeRetrievalService;
        private readonly ILogger<AiDashboardService> _logger;

        public AiDashboardService(
       IPromptService promptService,
       ISqlExecutionService sqlExecutionService,
       IChatLogService chatLogService,
       IFallbackChatService fallbackChatService,
       IAiProviderConfigService providerConfigService,
       IKnowledgeRetrievalService knowledgeRetrievalService,
       ILogger<AiDashboardService> logger)
        {
            _promptService = promptService;
            _sqlExecutionService = sqlExecutionService;
            _chatLogService = chatLogService;
            _fallbackChatService = fallbackChatService;
            _providerConfigService = providerConfigService;
            _knowledgeRetrievalService = knowledgeRetrievalService;
            _logger = logger;
        }

        /// <summary>
        /// NEW: Fully AI-powered auto-dashboard generation
        /// AI analyzes schema, generates insights, creates questions, generates SQL, queries data, and builds widgets
        /// NO HARDCODED LOGIC - 100% AI-driven
        /// </summary>
        public async Task<object> GenerateAutoDashboardAsync(string context)
        {
            var lang = DetectLanguage(context);
            _logger.LogInformation("[AutoDashboard] Starting dashboard for: {Context}", context.Substring(0, Math.Min(30, context.Length)) + "...");

            try
            {
                // ============= STEP 1: Load System Prompt & Schema Context =============
                var (combinedPrompt, systemPromptId, aiConfigId) = await _promptService.BuildCombinedPromptAsync("/dashboard");
                var pageConfig = await _promptService.GetPageConfigAsync("/dashboard");

                var retrievalContext = await _knowledgeRetrievalService.RetrieveContextAsync(
                    "/dashboard",
                    "inventory schema database analysis metrics",
                    pageConfig?.AllowedTables,
                    pageConfig?.AllowedColumns);

                string schemaInfo;
                if (retrievalContext.HasContext)
                {
                    schemaInfo = retrievalContext.FormattedContext;
                    _logger.LogInformation(
                        "[AutoDashboard] Schema loaded - Columns: {SchemaCount}, Relations: {RelationCount}",
                        retrievalContext.SchemaColumnCount,
                        retrievalContext.SchemaRelationCount);
                }
                else
                {
                    schemaInfo = "No schema information available";
                    _logger.LogWarning("[AutoDashboard] No schema context found");
                }

                // ============= STEP 2: Single AI Call - Generate Analysis Queries & Dashboard Plan =============
                // Combine data analysis + dashboard plan generation into ONE AI call
                var (dataInsights, dashboardPlan) = await GenerateCompleteAnalysisAndPlanAsync(
                    combinedPrompt, schemaInfo, context, lang);

                _logger.LogInformation(
                    "[AutoDashboard] Analysis: {TotalAssets} items, {CriticalItems} critical | Plan: {WidgetCount} widgets",
                    dataInsights.TotalAssets, dataInsights.CriticalItems, dashboardPlan.Widgets.Count);

                // ============= STEP 3: Execute AI-Generated Queries and Build Widgets =============
                var widgets = new List<object>();
                var totalDataPoints = 0;

                for (int i = 0; i < dashboardPlan.Widgets.Count; i++)
                {
                    var widgetPlan = dashboardPlan.Widgets[i];

                    try
                    {
                        // Validate and execute AI-generated SQL query
                        var (isSafe, reason) = _sqlExecutionService.ValidateSql(widgetPlan.Sql);
                        if (!isSafe)
                        {
                            _logger.LogWarning("[AutoDashboard] Widget {Index} SQL validation failed: {Reason}", i + 1, reason);
                            widgets.Add(new
                            {
                                type = "error",
                                title = widgetPlan.Title,
                                message = lang == "th" ? "ไม่สามารถโหลดข้อมูลได้" : "Unable to load data"
                            });
                            continue;
                        }

                        var data = await _sqlExecutionService.ExecuteSqlAsync(widgetPlan.Sql);
                        var dataList = data.Select(d => d.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)).ToList();
                        var columns = dataList.Count > 0 ? dataList[0].Keys.ToList() : new List<string>();
                        totalDataPoints += dataList.Count;

                        // Build widget from query results
                        var widget = BuildWidgetFromData(widgetPlan, dataList, columns, lang);
                        widgets.Add(widget);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "[AutoDashboard] Widget {Index} error", i + 1);
                        widgets.Add(new
                        {
                            type = "error",
                            title = widgetPlan.Title,
                            message = lang == "th" ? "ไม่สามารถโหลดข้อมูลได้" : "Unable to load data"
                        });
                    }
                }

                return new
                {
                    title = dashboardPlan.Title,
                    description = dashboardPlan.Description?.Length > 100
                        ? dashboardPlan.Description.Substring(0, 97) + "..."
                        : dashboardPlan.Description,

                    // 🚨 CRITICAL RISK SUMMARY
                    riskSummary = new
                    {
                        level = dataInsights.CriticalItems > 0 ? "CRITICAL" :
                                dataInsights.LowStockCount > 10 ? "WARNING" : "OK",
                        criticalCount = dataInsights.CriticalItems,
                        lowStockCount = dataInsights.LowStockCount
                    },

                    // Data Insights
                    dataInsights = new
                    {
                        total = dataInsights.TotalAssets,
                        critical = dataInsights.CriticalItems,
                        lowStock = dataInsights.LowStockCount,
                        inbound = dataInsights.BuildingCount,
                        outbound = dataInsights.FloorCount,
                        riskPercent = dataInsights.TotalAssets > 0
                            ? Math.Round((double)(dataInsights.CriticalItems + dataInsights.LowStockCount) / dataInsights.TotalAssets * 100, 1)
                            : 0
                    },

                    widgets = widgets,
                    generatedAt = DateTime.UtcNow,
                    totalDataPoints = totalDataPoints,
                    isAiGenerated = true,
                    systemPromptId = systemPromptId,
                    aiConfigId = aiConfigId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AutoDashboard] Generation failed");

                // Return user-friendly error without exposing internal details
                return new
                {
                    title = lang == "th" ? "เกิดข้อผิดพลาด" : "Error Occurred",
                    description = lang == "th" ? "ไม่สามารถสร้างแดชบอร์ดได้" : "Unable to generate dashboard",
                    riskSummary = new
                    {
                        level = "ERROR",
                        criticalCount = 0,
                        lowStockCount = 0
                    },
                    widgets = new[]
                    {
                        new
                        {
                            type = "error",
                            title = lang == "th" ? "เกิดข้อผิดพลาด" : "Error",
                            message = lang == "th" ? "เกิดข้อผิดพลาดในการสร้างแดชบอร์ด กรุณาลองใหม่อีกครั้ง" : "An error occurred while generating the dashboard. Please try again."
                        }
                    },
                    generatedAt = DateTime.UtcNow,
                    isAiGenerated = false
                };
            }
        }

        #region Helper Methods

        /// <summary>
        /// Detect language using presence of Thai characters
        /// </summary>
        private static string DetectLanguage(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "en";
            return System.Text.RegularExpressions.Regex.IsMatch(text, @"[\u0E00-\u0E7F]") ? "th" : "en";
        }

        /// <summary>
        /// OPTIMIZED: Single AI call to generate both analysis queries AND dashboard plan
        /// Reduces AI calls from 2 to 1 by combining analysis + planning
        /// </summary>
        private async Task<(DatabaseInsights insights, DashboardPlan plan)> GenerateCompleteAnalysisAndPlanAsync(
            string systemPrompt, string schemaInfo, string context, string lang)
        {
            //{systemPrompt}
            var prompt = $@"

CONTEXT: {context}
LANGUAGE: {(lang == "th" ? "Thai" : "English")}

DATABASE SCHEMA:
{schemaInfo}

Your task: Generate WMS dashboard with analysis queries and widget plans in ONE response.

Return ONLY this COMPACT JSON (NO markdown, NO extra text):

{{
  ""analysisQueries"": [
    {{""purpose"":""Count total items"",""metricName"":""TotalAssets"",""sql"":""SELECT COUNT(*) as TotalAssets FROM inv.t_inv_inventory WHERE quantity>0""}},
    {{""purpose"":""Critical items"",""metricName"":""CriticalItems"",""sql"":""SELECT COUNT(*) as CriticalItems FROM inv.t_inv_inventory WHERE quantity>0 AND quantity<5""}},
    {{""purpose"":""Low stock"",""metricName"":""LowStockCount"",""sql"":""SELECT COUNT(*) as LowStockCount FROM inv.t_inv_inventory WHERE quantity>0 AND quantity<10""}},
    {{""purpose"":""Inbound today"",""metricName"":""BuildingCount"",""sql"":""SELECT COUNT(*) as BuildingCount FROM inv.t_inv_inbound_master WHERE CAST(created_date as DATE)=CAST(GETDATE() as DATE)""}},
    {{""purpose"":""Outbound today"",""metricName"":""FloorCount"",""sql"":""SELECT COUNT(*) as FloorCount FROM inv.t_inv_outbound_master WHERE CAST(created_date as DATE)=CAST(GETDATE() as DATE)""}}
  ],
  ""dashboard"": {{
    ""title"":""Brief title ({(lang == "th" ? "Thai" : "English")})"",
    ""description"":""Short desc (max 50 chars)"",
    ""widgets"":[
      {{
        ""title"":""Widget title"",
        ""vizType"":""bar|pie|line|progress|label"",
        ""sql"":""T-SQL query (TOP 10)"",
        ""purpose"":""Brief""
      }}
    ]
  }}
}}

RULES:
- analysisQueries: 5 metrics (TotalAssets, CriticalItems, LowStockCount, BuildingCount, FloorCount)
- dashboard.widgets: 4 widgets max
- COMPACT JSON only
- Valid T-SQL
- Date: CAST(created_date as DATE)=CAST(GETDATE() as DATE)
- NO markdown, NO explanations";

            try
            {
                _logger.LogInformation("[AI Combined] Asking AI to generate analysis + plan in single call...");

                var messages = new List<FallbackMessage>
                {
                    new("user", prompt)
                };

                var result = await _fallbackChatService.CompleteAsync(messages);
                var aiResponse = result.Content?.Trim();

                if (string.IsNullOrEmpty(aiResponse))
                {
                    _logger.LogWarning("[AI Combined] AI returned empty response, using fallback");
                    return GetFallbackAnalysisAndPlan(lang);
                }

                var cleaned = CleanJsonResponse(aiResponse);
                var combined = System.Text.Json.JsonSerializer.Deserialize<CombinedResponse>(cleaned, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    AllowTrailingCommas = true
                });

                if (combined == null || combined.AnalysisQueries == null || combined.Dashboard == null)
                {
                    _logger.LogWarning("[AI Combined] Invalid response structure, using fallback");
                    return GetFallbackAnalysisAndPlan(lang);
                }

                // Execute analysis queries to get insights
                var insights = await ExecuteAnalysisQueriesAsync(combined.AnalysisQueries);

                _logger.LogInformation("[AI Combined] Successfully generated analysis + plan with {QueryCount} queries and {WidgetCount} widgets",
                    combined.AnalysisQueries.Count, combined.Dashboard.Widgets.Count);

                return (insights, combined.Dashboard);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AI Combined] Failed, using fallback");
                return GetFallbackAnalysisAndPlan(lang);
            }
        }

        /// <summary>
        /// Execute analysis queries and populate insights
        /// </summary>
        private async Task<DatabaseInsights> ExecuteAnalysisQueriesAsync(List<AnalysisQuery> queries)
        {
            var insights = new DatabaseInsights();

            foreach (var query in queries)
            {
                try
                {
                    _logger.LogInformation("[Analysis Exec] {Purpose}", query.Purpose);

                    var data = await _sqlExecutionService.ExecuteSqlAsync(query.Sql);
                    var firstRow = data.FirstOrDefault();

                    if (firstRow != null)
                    {
                        foreach (var kvp in firstRow)
                        {
                            var value = kvp.Value != null ? Convert.ToInt32(kvp.Value) : 0;
                            AssignInsightValue(insights, kvp.Key, value);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[Analysis Exec] Query failed for {Purpose}", query.Purpose);
                }
            }

            return insights;
        }

        /// <summary>
        /// Fallback if AI combined call fails
        /// </summary>
        private static (DatabaseInsights, DashboardPlan) GetFallbackAnalysisAndPlan(string lang)
        {
            var insights = new DatabaseInsights
            {
                TotalAssets = 0,
                CriticalItems = 0,
                LowStockCount = 0,
                BuildingCount = 0,
                FloorCount = 0
            };

            var plan = new DashboardPlan
            {
                Title = lang == "th" ? "แดชบอร์ดคลังสินค้า" : "Warehouse Dashboard",
                Description = lang == "th" ? "ข้อมูลไม่พร้อมใช้งาน" : "Data unavailable",
                Widgets = new List<WidgetPlan>
                {
                    new()
                    {
                        Title = lang == "th" ? "สินค้าทั้งหมด" : "Total Items",
                        VizType = "label",
                        Sql = "SELECT COUNT(*) as value FROM inv.t_inv_inventory WHERE quantity > 0",
                        Purpose = "Total count"
                    }
                }
            };

            return (insights, plan);
        }

        /// <summary>
        /// Get database schema from AI knowledge base with page config filtering
        /// </summary>
        private async Task<string> GetDatabaseSchemaAsync(string processPage)
        { 
            // Get page config for dashboard process
            var pageConfig = await _promptService.GetPageConfigAsync(processPage);

            // Retrieve schema context with allowed tables/columns filtering
            var retrievalContext = await _knowledgeRetrievalService.RetrieveContextAsync(
                processPage,
                "inventory schema database tables columns",
                pageConfig?.AllowedTables,
                pageConfig?.AllowedColumns);

            if (retrievalContext.HasContext)
            {
                _logger.LogInformation(
                    "[Schema] Retrieved context - Schema columns: {SchemaCount}, Relations: {RelationCount}",
                    retrievalContext.SchemaColumnCount,
                    retrievalContext.SchemaRelationCount);

                return retrievalContext.FormattedContext;
            }

            _logger.LogWarning("[Schema] No schema context found, using fallback message");
            return "No schema information available. Please sync schema catalog first.";
        }


        /// <summary>
        /// Assign insight values dynamically based on metric name
        /// </summary>
        private static void AssignInsightValue(DatabaseInsights insights, string metricName, int value)
        {
            switch (metricName.ToLower())
            {
                case "totalassets":
                case "total":
                    insights.TotalAssets = value;
                    break;
                case "lowstockcount":
                case "lowstock":
                    insights.LowStockCount = value;
                    break;
                case "criticalitems":
                case "critical":
                    insights.CriticalItems = value;
                    break;
                case "activeassets":
                case "active":
                    insights.ActiveAssets = value;
                    break;
                case "inactiveassets":
                case "inactive":
                    insights.InactiveAssets = value;
                    break;
                case "buildingcount":
                case "inbound":
                    insights.BuildingCount = value;
                    break;
                case "floorcount":
                case "outbound":
                    insights.FloorCount = value;
                    break;
                case "maintenanceassets":
                case "pending":
                    insights.MaintenanceAssets = value;
                    break;
                case "expiredordamaged":
                case "expired":
                    insights.ExpiredOrDamaged = value;
                    break;
                case "deadstock":
                case "nomovement":
                    insights.DeadStock = value;
                    break;
            }
        }


        /// <summary>
        /// Build widget from SQL query results using AI-specified visualization type
        /// </summary>
        private static object BuildWidgetFromData( 
            WidgetPlan widgetPlan,
            List<Dictionary<string, object>> data,
            List<string> columns,
            string lang)
        {
            var colors = new[] { "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899" };

            if (data.Count == 0)
            {
                return new
                {
                    type = "error",
                    title = widgetPlan.Title,
                    message = lang == "th" ? "ไม่มีข้อมูล" : "No data available"
                };
            }

            switch (widgetPlan.VizType.ToLower())
            {
                case "bar":
                    var barLabels = data.Select(d =>
                        d.ContainsKey("label") ? d["label"]?.ToString() :
                        d.ContainsKey("name") ? d["name"]?.ToString() :
                        d.ContainsKey(columns[0]) ? d[columns[0]]?.ToString() : "Unknown"
                    ).ToList();

                    var barValues = data.Select(d =>
                    {
                        if (d.ContainsKey("value")) return Convert.ToDouble(d["value"]);
                        if (d.ContainsKey("count")) return Convert.ToDouble(d["count"]);
                        if (d.ContainsKey("quantity")) return Convert.ToDouble(d["quantity"]);
                        foreach (var col in columns)
                        {
                            if (d.ContainsKey(col) && d[col] != null && IsNumeric(d[col]))
                                return Convert.ToDouble(d[col]);
                        }
                        return 0.0;
                    }).ToList();

                    return new
                    {
                        type = "bar",
                        title = widgetPlan.Title,
                        data = new
                        {
                            labels = barLabels,
                            datasets = new[]
                            {
                                new
                                {
                                    label = lang == "th" ? "จำนวน" : "Qty",
                                    data = barValues,
                                    backgroundColor = colors[0]
                                }
                            }
                        }
                    };

                case "pie":
                    var pieLabels = data.Select(d =>
                        d.ContainsKey("category") ? d["category"]?.ToString() :
                        d.ContainsKey("label") ? d["label"]?.ToString() :
                        d.ContainsKey(columns[0]) ? d[columns[0]]?.ToString() : "Unknown"
                    ).ToList();

                    var pieValues = data.Select(d =>
                    {
                        if (d.ContainsKey("value")) return Convert.ToDouble(d["value"]);
                        if (d.ContainsKey("count")) return Convert.ToDouble(d["count"]);
                        if (d.ContainsKey("percentage")) return Convert.ToDouble(d["percentage"]);
                        foreach (var col in columns)
                        {
                            if (d.ContainsKey(col) && d[col] != null && IsNumeric(d[col]))
                                return Convert.ToDouble(d[col]);
                        }
                        return 0.0;
                    }).ToList();

                    return new
                    {
                        type = "pie",
                        title = widgetPlan.Title,
                        data = new
                        {
                            labels = pieLabels,
                            datasets = new[]
                            {
                                new
                                {
                                    data = pieValues,
                                    backgroundColor = colors
                                }
                            }
                        }
                    };

                case "line":
                    var lineLabels = data.Select(d =>
                        d.ContainsKey("date") ? d["date"]?.ToString() :
                        d.ContainsKey("label") ? d["label"]?.ToString() :
                        d.ContainsKey(columns[0]) ? d[columns[0]]?.ToString() : "Unknown"
                    ).ToList();

                    var lineValues = data.Select(d =>
                    {
                        if (d.ContainsKey("value")) return Convert.ToDouble(d["value"]);
                        if (d.ContainsKey("count")) return Convert.ToDouble(d["count"]);
                        if (d.ContainsKey("total")) return Convert.ToDouble(d["total"]);
                        foreach (var col in columns)
                        {
                            if (d.ContainsKey(col) && d[col] != null && IsNumeric(d[col]))
                                return Convert.ToDouble(d[col]);
                        }
                        return 0.0;
                    }).ToList();

                    return new
                    {
                        type = "line",
                        title = widgetPlan.Title,
                        data = new
                        {
                            labels = lineLabels,
                            datasets = new[]
                            {
                                new
                                {
                                    label = lang == "th" ? "แนวโน้ม" : "Trend",
                                    data = lineValues,
                                    borderColor = colors[0],
                                    tension = 0.4
                                }
                            }
                        }
                    };

                case "progress":
                    var firstRow = data[0];
                    var current = firstRow.ContainsKey("current") ? Convert.ToDouble(firstRow["current"]) :
                                  firstRow.ContainsKey("completed") ? Convert.ToDouble(firstRow["completed"]) : 0.0;
                    var target = firstRow.ContainsKey("target") ? Convert.ToDouble(firstRow["target"]) :
                                 firstRow.ContainsKey("total") ? Convert.ToDouble(firstRow["total"]) : 100.0;
                    var percentage = target > 0 ? (current / target) * 100 : 0;

                    return new
                    {
                        type = "progress",
                        title = widgetPlan.Title,
                        data = new
                        {
                            current = current,
                            target = target,
                            percent = Math.Round(percentage, 1),
                            color = percentage >= 80 ? "#10B981" : percentage >= 50 ? "#F59E0B" : "#EF4444"
                        }
                    };

                case "label":
                default:
                    var value = data[0].ContainsKey("value") ? data[0]["value"] :
                               data[0].ContainsKey("count") ? data[0]["count"] :
                               data[0].ContainsKey("total") ? data[0]["total"] :
                               data[0].ContainsKey(columns[0]) ? data[0][columns[0]] : 0;

                    return new
                    {
                        type = "label",
                        title = widgetPlan.Title,
                        data = new
                        {
                            value = value,
                            color = colors[0]
                        }
                    };
            }
        }

        /// <summary>
        /// Check if object is numeric
        /// </summary>
        private static bool IsNumeric(object value)
        {
            return value is int or long or float or double or decimal;
        }

        /// <summary>
        /// Clean JSON response from AI - Remove markdown blocks, extra text, and whitespace
        /// </summary>
        private static string CleanJsonResponse(string response)
        {
            if (string.IsNullOrWhiteSpace(response))
            {
                return "[]";
            }

            // Remove markdown code blocks
            var cleaned = response
                .Replace("```json", "")
                .Replace("```javascript", "")
                .Replace("```", "")
                .Trim();

            // Find the first [ or { and last ] or }
            int startIndex = Math.Min(
                cleaned.IndexOf('[') == -1 ? int.MaxValue : cleaned.IndexOf('['),
                cleaned.IndexOf('{') == -1 ? int.MaxValue : cleaned.IndexOf('{')
            );

            if (startIndex == int.MaxValue)
            {
                return "[]";
            }

            int endIndex = Math.Max(
                cleaned.LastIndexOf(']'),
                cleaned.LastIndexOf('}')
            );

            if (endIndex <= startIndex)
            {
                // Try to fix incomplete JSON by adding closing bracket
                char startChar = cleaned[startIndex];
                if (startChar == '[')
                {
                    cleaned = cleaned + "]";
                    endIndex = cleaned.Length - 1;
                }
                else if (startChar == '{')
                {
                    cleaned = cleaned + "}";
                    endIndex = cleaned.Length - 1;
                }
                else
                {
                    return "[]";
                }
            }

            // Extract only the JSON part
            cleaned = cleaned.Substring(startIndex, endIndex - startIndex + 1);

            // Fix trailing commas before closing brackets
            cleaned = System.Text.RegularExpressions.Regex.Replace(cleaned, ",\\s*([\\]}])", "$1");

            return cleaned.Trim();
        }

        /// <summary>
        /// Generate forecast dashboard from a question using 2-step AI process
        /// Step 1: AI generates SQL query from question
        /// Step 2: Execute query to get real data
        /// Step 3: AI analyzes data and creates forecast
        /// Step 4: Generate dashboard widget
        /// NO MOCK DATA - uses real database data
        /// </summary>
        public async Task<object> GenerateDashboardAsync(string question)
        {
            var lang = DetectLanguage(question);
            _logger.LogInformation("[Dashboard] Starting AI forecast process for: {Question}", question);

            try
            {
                // Load DB-backed system prompt and AI config
                var (combinedPrompt, systemPromptId, aiConfigId) = await _promptService.BuildCombinedPromptAsync("/forecast");

                // Load page config and RAG context with schema filtering
                //var pageConfig = await _promptService.GetPageConfigAsync("/forecast");
                //var retrievalContext = await _knowledgeRetrievalService.RetrieveContextAsync(
                //    "/forecast",
                //    question,
                //    pageConfig?.AllowedTables,
                //    pageConfig?.AllowedColumns
                //);

                // ============= STEP 1: AI Generates SQL Query from Question =============
                var sqlDefinition = await GenerateSqlFromQuestionAsync(question, lang, combinedPrompt);

                _logger.LogInformation("[Dashboard] SQL generated: {Sql}", sqlDefinition.Sql.Substring(0, Math.Min(100, sqlDefinition.Sql.Length)));

                // ============= STEP 2: Execute Query to Get Real Data =============
                var (isSafe, reason) = _sqlExecutionService.ValidateSql(sqlDefinition.Sql);
                if (!isSafe)
                {
                    _logger.LogWarning("[Dashboard] SQL validation failed: {Reason}", reason);
                    return new
                    {
                        title = lang == "th" ? "ไม่สามารถประมวลผลได้" : "Processing Failed",
                        description = sqlDefinition.Description,
                        question = question,
                        widget = new
                        {
                            type = "error",
                            title = lang == "th" ? "ไม่สามารถสร้างแดชบอร์ดได้" : "Unable to generate dashboard",
                            message = lang == "th" ? "ไม่สามารถประมวลผลคำขอของคุณได้ กรุณาลองใหม่อีกครั้ง" : "Unable to process your request. Please try again."
                        },
                        generatedAt = DateTime.UtcNow,
                        systemPromptId = systemPromptId,
                        aiConfigId = aiConfigId
                    };
                }

                List<Dictionary<string, object>> rawData;
                List<string> columns;

                try
                {
                    var data = await _sqlExecutionService.ExecuteSqlAsync(sqlDefinition.Sql);
                    rawData = data.Select(d => d.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)).ToList();
                    columns = rawData.Count > 0 ? rawData[0].Keys.ToList() : new List<string>();
                    _logger.LogInformation("[Dashboard] Query returned {Count} rows", rawData.Count);
                }
                catch (Exception sqlEx)
                {
                    _logger.LogError(sqlEx, "[Dashboard] SQL execution failed");
                    return new
                    {
                        title = lang == "th" ? "เกิดข้อผิดพลาด" : "Error Occurred",
                        description = sqlDefinition.Description,
                        question = question,
                        widget = new
                        {
                            type = "error",
                            title = lang == "th" ? "ไม่สามารถดึงข้อมูลได้" : "Unable to retrieve data",
                            message = lang == "th" ? "เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง" : "An error occurred while retrieving data. Please try again."
                        },
                        generatedAt = DateTime.UtcNow,
                        systemPromptId = systemPromptId,
                        aiConfigId = aiConfigId
                    };
                }

                if (rawData.Count == 0)
                {
                    return new
                    {
                        title = lang == "th" ? "ไม่พบข้อมูล" : "No Data Found",
                        description = sqlDefinition.Description,
                        question = question,
                        widget = new
                        {
                            type = "error",
                            title = lang == "th" ? "ไม่มีข้อมูลสำหรับการวิเคราะห์" : "No data available for analysis",
                            message = lang == "th" ? "ไม่พบข้อมูลที่ตรงกับคำถามของคุณ" : "No data found matching your question"
                        },
                        generatedAt = DateTime.UtcNow,
                        systemPromptId = systemPromptId,
                        aiConfigId = aiConfigId
                    };
                }


                // Load DB-backed system prompt and AI config
                var (combinedPromptAnalysis, systemPromptIdAnalysis, aiConfigIdAnalysis) = await _promptService.BuildCombinedPromptAsync("/forecastAnly");

                // ============= STEP 3: AI Analyzes Real Data and Creates Forecast =============
                var forecastResult = await GenerateForecastFromDataAsync(question, rawData, columns, lang, combinedPrompt);

                _logger.LogInformation("[Dashboard] Forecast generated: {Title}", forecastResult.Title);

                // ============= STEP 4: Build Dashboard Widget =============
                var widget = new
                {
                    type = "forecast",
                    title = forecastResult.Title,
                    insights = new
                    {
                        summary = forecastResult.Insights?.Summary ?? "",
                        trend = forecastResult.Insights?.Trend ?? "stable",
                        prediction = forecastResult.Insights?.Prediction ?? "",
                        recommendation = forecastResult.Insights?.Recommendation ?? ""
                    },
                    chart = new
                    {
                        type = "line",
                        labels = forecastResult.ChartData?.Labels ?? new List<string>(),
                        datasets = new object[]
                        {
                            new
                            {
                                label = lang == "th" ? "ข้อมูลจริง" : "Actual",
                                data = forecastResult.ChartData?.Values ?? new List<double>(),
                                borderColor = "#3B82F6",
                                backgroundColor = "rgba(59, 130, 246, 0.1)",
                                tension = 0.4
                            },
                            new
                            {
                                label = lang == "th" ? "พยากรณ์" : "Forecast",
                                data = forecastResult.ChartData?.Forecast ?? new List<double>(),
                                borderColor = "#10B981",
                                backgroundColor = "rgba(16, 185, 129, 0.1)",
                                borderDash = new[] { 5, 5 },
                                tension = 0.4
                            }
                        }
                    },
                    rawDataSample = rawData.Take(10).ToList()
                };

                return new
                {
                    title = forecastResult.Title,
                    description = sqlDefinition.Description,
                    question = question,
                    widget = widget,
                    generatedAt = DateTime.UtcNow,
                    dataPoints = rawData.Count,
                    isAiGenerated = true,
                    systemPromptId = systemPromptId,
                    aiConfigId = aiConfigId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Dashboard] Generation failed");

                // Return user-friendly error without exposing internal details
                return new
                {
                    title = lang == "th" ? "เกิดข้อผิดพลาด" : "Error Occurred",
                    question = question,
                    widget = new
                    {
                        type = "error",
                        title = lang == "th" ? "ไม่สามารถสร้างแดชบอร์ดได้" : "Unable to generate dashboard",
                        message = lang == "th" ? "เกิดข้อผิดพลาดในการสร้างแดชบอร์ด กรุณาลองใหม่อีกครั้ง" : "An error occurred while generating the dashboard. Please try again."
                    },
                    generatedAt = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Step 1: AI generates SQL query from natural language question
        /// Uses DB-backed system prompt as foundation
        /// </summary>
        private async Task<SqlDefinition> GenerateSqlFromQuestionAsync(string question, string lang, string systemPrompt)
        {
            var prompt = systemPrompt
                .Replace("{{question}}", question)
                .Replace("{{language}}", lang == "th" ? "Thai" : "English");

            try
            {
                _logger.LogInformation("[SQL Generation] Asking AI to generate SQL...");

                var messages = new List<FallbackMessage>
                {
                    new("user", prompt)
                };

                var result = await _fallbackChatService.CompleteAsync(messages);
                var aiResponse = result.Content?.Trim();

                if (string.IsNullOrEmpty(aiResponse))
                {
                    throw new InvalidOperationException("AI returned empty SQL response");
                }

                var cleaned = CleanJsonResponse(aiResponse);
                var sqlDef = System.Text.Json.JsonSerializer.Deserialize<SqlDefinition>(cleaned, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (sqlDef == null || string.IsNullOrWhiteSpace(sqlDef.Sql))
                {
                    throw new InvalidOperationException("Failed to parse SQL definition from AI");
                }

                _logger.LogInformation("[SQL Generation] Successfully generated SQL");
                return sqlDef;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SQL Generation] Failed");
                throw new InvalidOperationException($"Failed to generate SQL: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Step 3: AI analyzes real data and generates forecast insights
        /// Uses DB-backed system prompt as foundation
        /// </summary>
        private async Task<ForecastResult> GenerateForecastFromDataAsync(
            string question, List<Dictionary<string, object>> data, List<string> columns, string lang, string systemPrompt)
        {
            var dataJson = System.Text.Json.JsonSerializer.Serialize(data.Take(50), new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = false
            });


            var prompt = systemPrompt
               .Replace("{{question}}", question)
               .Replace("{{dataJson}}", dataJson)
               .Replace("{{language}}", lang == "th" ? "Thai" : "English");
             
            try
            {
                _logger.LogInformation("[Forecast] Asking AI to analyze data and forecast...");

                var messages = new List<FallbackMessage>
                {
                    new("user", prompt)
                };

                var result = await _fallbackChatService.CompleteAsync(messages);
                var aiResponse = result.Content?.Trim();

                if (string.IsNullOrEmpty(aiResponse))
                {
                    throw new InvalidOperationException("AI returned empty forecast response");
                }

                var cleaned = CleanJsonResponse(aiResponse);
                var forecastResult = System.Text.Json.JsonSerializer.Deserialize<ForecastResult>(cleaned, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (forecastResult == null)
                {
                    throw new InvalidOperationException("Invalid forecast result");
                }

                _logger.LogInformation("[Forecast] Successfully generated forecast");
                return forecastResult;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Forecast] Failed");
                throw new InvalidOperationException($"Failed to generate forecast: {ex.Message}", ex);
            }
        }

        #endregion

        #region Helper Classes

        private class CombinedResponse
        {
            public List<AnalysisQuery> AnalysisQueries { get; set; } = new();
            public DashboardPlan Dashboard { get; set; } = new();
        }

        private class DatabaseInsights
        {
            public int TotalAssets { get; set; }
            public int ActiveAssets { get; set; }
            public int InactiveAssets { get; set; }
            public int CriticalItems { get; set; }
            public int LowStockCount { get; set; }
            public int ExpiredOrDamaged { get; set; }
            public int DeadStock { get; set; }
            public int MaintenanceAssets { get; set; }
            public int BuildingCount { get; set; }
            public int FloorCount { get; set; }
        }

        private class AnalysisQuery
        {
            public string Purpose { get; set; } = "";
            public string MetricName { get; set; } = "";
            public string Sql { get; set; } = "";
            public bool IsScalar { get; set; } = true;
        }

        private class DashboardPlan
        {
            public string Title { get; set; } = "";
            public string Description { get; set; } = "";
            public List<WidgetPlan> Widgets { get; set; } = new();
        }

        private class WidgetPlan
        {
            public string Title { get; set; } = "";
            public string VizType { get; set; } = "";
            public string Sql { get; set; } = "";
            public string Purpose { get; set; } = "";
        }

        private class SqlDefinition
        {
            public string Sql { get; set; } = "";
            public string Description { get; set; } = "";
        }

        private class ForecastResult
        {
            public string Title { get; set; } = "";
            public InsightsData? Insights { get; set; }
            public ChartDataForecast? ChartData { get; set; }
        }

        private class InsightsData
        {
            public string Summary { get; set; } = "";
            public string Trend { get; set; } = "";
            public string Prediction { get; set; } = "";
            public string Recommendation { get; set; } = "";
        }

        private class ChartDataForecast
        {
            public List<string> Labels { get; set; } = new();
            public List<double> Values { get; set; } = new();
            public List<double> Forecast { get; set; } = new();
        }

        #endregion
    }
}
