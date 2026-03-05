using OmsApi.Services.Interfaces;
using OmsApi.Services.Implementation;
using OmsApi.Services.Implementation.Platforms;

var builder = WebApplication.CreateBuilder(args);
DotNetEnv.Env.Load();

// ─── CORS ───────────────────────────────────────────────
string corsKey = Environment.GetEnvironmentVariable("API_KEY_OMS") ?? "OMS-API";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: corsKey,
        policy =>
        {
            policy.WithOrigins("*")
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
    client.BaseAddress = new Uri(Environment.GetEnvironmentVariable("LAZADA_API_URL") ?? "https://api.lazada.co.th/rest");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddHttpClient("TikTok", client =>
{
    client.BaseAddress = new Uri(Environment.GetEnvironmentVariable("TIKTOK_API_URL") ?? "https://open-api.tiktokglobalshop.com");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// ─── Dependency Injection ───────────────────────────────
builder.Services.AddSingleton<IPlatformClientFactory, PlatformClientFactory>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IPlatformAuthService, PlatformAuthService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IShippingService, ShippingService>();
builder.Services.AddScoped<ShopeeClient>();
builder.Services.AddScoped<LazadaClient>();
builder.Services.AddScoped<TikTokClient>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ─── Swagger ────────────────────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "BS-OMS-API",
        Version = "v1",
        Description = "Order Management System API for Shopee, Lazada, TikTok Shop integration"
    });
    options.UseAllOfToExtendReferenceSchemas();
});
builder.Services.AddOpenApi();

var app = builder.Build();

// ─── Middleware Pipeline ────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "BS-OMS-API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors(corsKey);
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
