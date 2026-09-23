using AiAssistant.Services.Interfaces;
using AiAssistant.Services.Implementation;

// Load .env file (local development) — existing env vars are NOT overwritten (Docker/production safe)
var envFile = Path.Combine(Directory.GetCurrentDirectory(), "..", ".env");
if (File.Exists(envFile))
    DotNetEnv.Env.NoClobber().Load(envFile);

var builder = WebApplication.CreateBuilder(args);

// ============================================================================
// Service Registration
// ============================================================================

// CORS - Allow all origins for development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("*")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Application Services
builder.Services.AddScoped<IPromptService, PromptService>();
builder.Services.AddScoped<ISqlExecutionService, SqlExecutionService>();
builder.Services.AddScoped<IChatLogService, ChatLogService>();
builder.Services.AddScoped<IAiCrudAuditLogService, AiCrudAuditLogService>();
builder.Services.AddScoped<IRbacPermissionService, RbacPermissionService>();
builder.Services.AddScoped<IFavoritePromptService, FavoritePromptService>();
builder.Services.AddScoped<IAiOrchestratorService, AiOrchestratorService>();
builder.Services.AddScoped<IFallbackChatService, FallbackChatService>();
builder.Services.AddScoped<IRateLimitService, RateLimitService>();
builder.Services.AddScoped<ISchemaMetadataService, SchemaMetadataService>();
builder.Services.AddScoped<IKnowledgeRetrievalService, KnowledgeRetrievalService>();
builder.Services.AddScoped<IAiDashboardService, AiDashboardService>();
builder.Services.AddScoped<IKnowledgeIngestionService, KnowledgeIngestionService>();
builder.Services.AddScoped<ITextEmbeddingService, TextEmbeddingService>();
builder.Services.AddScoped<IOverviewStatsService, OverviewStatsService>();

// In-process cache used by AiProviderConfigService (5-min TTL avoids per-request DB hits)
builder.Services.AddMemoryCache();

// AI provider config: loads BaseUrl/ChatEndpoint/Models from DB with IMemoryCache.
// Singleton so the cache survives across requests without re-instantiation.
builder.Services.AddSingleton<IAiProviderConfigService, AiProviderConfigService>();

// Named HttpClient for AI provider API calls.
// BaseAddress is intentionally omitted — full URL is built from DB config at request time.
builder.Services.AddHttpClient("OpenRouter", client =>
{
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    // Timeout is overridden per-request from DB config (see FallbackChatService).
    // Set a safe upper bound here in case config is unavailable.
    client.Timeout = TimeSpan.FromSeconds(120);
});

// Named HttpClient for external embedding providers. Provider URL/model come from ais.t_ai_embedding_provider_config.
builder.Services.AddHttpClient("Embeddings", client =>
{
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.Timeout = TimeSpan.FromSeconds(300);
});

// Controllers & Swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "BS AI Assistance API",
        Version = "v1",
        Description = "AI Database Assistant API - Context-aware natural language to SQL query engine powered by Semantic Kernel and OpenRouter."
    });

    options.EnableAnnotations();
    options.UseAllOfToExtendReferenceSchemas();

    // Include XML comments
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

builder.Services.AddOpenApi();

// ============================================================================
// App Pipeline
// ============================================================================

var app = builder.Build();

// Swagger - enabled in all environments
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "BS AI Assistance API v1");
    options.DocumentTitle = "BS AI Assistance - Swagger UI";
});
app.MapOpenApi();

app.UseCors("AllowAll");
app.UseHttpsRedirection();

app.MapControllers();

app.Run();
