using OmsApi.Middleware;
using OmsApi.Services.Interfaces;
using OmsApi.Services.Implementation;
using OmsApi.Services.Implementation.Platforms;
using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;
using OmsApi.Extensions;

var builder = WebApplication.CreateBuilder(args);

// IIS can start the process with a working directory such as
// C:\\Windows\\System32\\inetsrv. Load the deployed .env from the
// application content root so the server does not silently fall back to
// production/default platform endpoints.
var envFilePath = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFilePath))
{
    DotNetEnv.Env.Load(envFilePath);
}
var dataProtection = builder.Services
    .AddDataProtection()
    .SetApplicationName(
        Environment.GetEnvironmentVariable("OMS_DATA_PROTECTION_APP_NAME")
        ?? "OmsApi");

var dataProtectionKeysPath = Environment.GetEnvironmentVariable("OMS_DATA_PROTECTION_KEYS_PATH");
if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    var keyDirectory = Path.GetFullPath(dataProtectionKeysPath.Trim());
    // ─── ดูการเชื่อมต่อ ได้ที่ docs/Connected.md ───────────────────────────────────────────────
    Directory.CreateDirectory(keyDirectory);
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));
}

var dbConnectionString = Environment.GetEnvironmentVariable("OMS_DB_CONNECTION_STRING");
if (!string.IsNullOrWhiteSpace(dbConnectionString))
    builder.Services.AddDbContext<ApplicationDbContext>(o => o.UseSqlServer(dbConnectionString));

// ─── CORS ───────────────────────────────────────────────
const string corsKey = "OmsApiCors";
string[] allowedOrigins = (Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS") ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

if (allowedOrigins.Length == 0)
    allowedOrigins = new[] { "http://localhost:3000", "http://localhost:5173", "http://localhost:8080" , "https://localhost:53954/" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: corsKey,
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// ─── HttpClient Factory ─────────────────────────────────
builder.Services.AddHttpClient("Shopee", client =>
{
    client.BaseAddress = new Uri(Environment.GetEnvironmentVariable("SHOPEE_API_URL") ?? "https://partner.shopeemobile.com");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddHttpClient("Lazada", client =>
{
    // A trailing slash is required when Lazada API paths are sent as relative
    // URIs. Without it, System.Uri treats `rest` as a file segment and drops it.
    var lazadaApiUrl = Environment.GetEnvironmentVariable("LAZADA_API_URL")
        ?? "https://api.lazada.co.th/rest";
    client.BaseAddress = new Uri($"{lazadaApiUrl.TrimEnd('/')}/");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddHttpClient("TikTok", client =>
{
    client.BaseAddress = new Uri(Environment.GetEnvironmentVariable("TIKTOK_API_URL") ?? "https://open-api.tiktokglobalshop.com");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// ─── Dependency Injection ───────────────────────────────
builder.Services.AddScoped<IPlatformClientFactory, PlatformClientFactory>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IPlatformAuthService, PlatformAuthService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IShippingService, ShippingService>();
builder.Services.AddScoped<IPlatformPackageService, PlatformPackageService>();
builder.Services.AddScoped<IPlatformDocumentService, PlatformDocumentService>();
builder.Services.AddScoped<ShopeeClient>();
builder.Services.AddScoped<LazadaClient>();
builder.Services.AddScoped<TikTokClient>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ─── Swagger ────────────────────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BS-OMS-API",
        Version = "v1",
        Description = "Order Management System API for Shopee, Lazada, TikTok Shop integration"
    });

    // API Key security definition
    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Description = "API Key — ใส่ใน header: X-Api-Key: {your-key}",
        Name = "X-Api-Key",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "ApiKeyScheme"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "ApiKey" }
            },
            Array.Empty<string>()
        }
    });

    options.UseAllOfToExtendReferenceSchemas();
});
var app = builder.Build();

// ─── Middleware Pipeline ────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    // Keep this relative so Swagger also works when IIS hosts the app under
    // a virtual path such as /WM3_OMS.
    c.SwaggerEndpoint("v1/swagger.json", "BS-OMS-API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors(corsKey);
app.UseMiddleware<ApiKeyMiddleware>();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", (HttpRequest request) =>
    Results.Redirect($"{request.PathBase}/swagger/index.html"));

app.Run();
