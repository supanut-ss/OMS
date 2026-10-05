using ApiCore.Services.Interfaces;
using ApiCore.Services.Implementation;
using ApiCore.Extensions;
using TokenManagement.Extensions;
using TokenManagement.Interfaces;
using TokenManagement.Services;
using TokenManagement.Middleware;
using Microsoft.AspNetCore.DataProtection;
var builder = WebApplication.CreateBuilder(args);
// IIS may start the process from C:\Windows\System32\inetsrv.  Resolve the
// deployed .env from the application content root so Data Protection uses the
// same key ring as BS-OMS-API when encrypting App Master credentials.
var envFilePath = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFilePath))
{
    DotNetEnv.Env.Load(envFilePath);
}

// Credentials are encrypted here and decrypted by BS-OMS-API.  Do not allow a
// server to silently create a machine-local key ring, because that produces
// records which BS-OMS-API cannot decrypt.
var dataProtectionAppName = Environment.GetEnvironmentVariable("OMS_DATA_PROTECTION_APP_NAME");
var dataProtectionKeysPath = Environment.GetEnvironmentVariable("OMS_DATA_PROTECTION_KEYS_PATH");
if (string.IsNullOrWhiteSpace(dataProtectionAppName) || string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    throw new InvalidOperationException(
        "OMS_DATA_PROTECTION_APP_NAME and OMS_DATA_PROTECTION_KEYS_PATH must be configured.");
}

var keyDirectory = Path.GetFullPath(dataProtectionKeysPath.Trim());
Directory.CreateDirectory(keyDirectory);
builder.Services
    .AddDataProtection()
    .SetApplicationName(dataProtectionAppName.Trim())
    .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

// Register database services (provider determined by DB_PROVIDER env var: SqlServer | PostgreSql)
builder.Services.AddDatabase(builder.Configuration);

// Register TokenManagement.Database.IDbConnectionFactory (used by TokenValidatorService)
builder.Services.AddScoped<TokenManagement.Database.IDbConnectionFactory>(sp =>
{
    var providerName = Environment.GetEnvironmentVariable("DB_PROVIDER") ?? "SqlServer";
    var connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY")
        ?? Environment.GetEnvironmentVariable("SERVERDB")
        ?? throw new ArgumentNullException("SERVERDB", "Database connection string is required.");
    var provider = Enum.TryParse<TokenManagement.Database.DatabaseProvider>(providerName, true, out var parsed)
        ? parsed
        : TokenManagement.Database.DatabaseProvider.SqlServer;
    return new TokenManagement.Database.DbConnectionFactory(connectionString, provider);
});
//string allowIPEnv = Environment.GetEnvironmentVariable("ALLOWIP_WEB") ?? "";
string KEY = Environment.GetEnvironmentVariable("API_KEY_WEB") ?? "";
//List<string> allows = new List<string>();
//allows = allowIPEnv
//    .Split(',', StringSplitOptions.RemoveEmptyEntries)
//    .Select(a => a.Trim())
//    .ToList();
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: KEY,
        builder =>
        {
            builder.WithOrigins("*")
                                .AllowAnyHeader()
                     .AllowAnyMethod();
        });
});
builder.Services.AddCustomJwtAuthentication(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IDynamicCrudService, DynamicCrudService>();
builder.Services.AddScoped<IAutoComplete, AutoCompleteServices>();
builder.Services.AddScoped<ITokenValidatorService, TokenValidatorService>();
builder.Services.AddScoped<IDashboard, DashboardService>();
builder.Services.AddScoped<IGanttService, GanttService>();
builder.Services.AddScoped<IMyTaskService, MyTaskService>();
builder.Services.AddScoped<IProjectsService, ProjectService>();
builder.Services.AddScoped<IOutbound, OutboundService>();
builder.Services.AddScoped<IInbound, InboundService>();
builder.Services.AddScoped<ICount, CountService>();
builder.Services.AddScoped<IInventory, InventoryService>();
builder.Services.AddScoped<IPartAttachmentService, PartAttachmentService>();
builder.Services.AddScoped<IConnectorService, ConnectorService>();

builder.Services.AddHttpClient();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                            Id = "Bearer"
                    }
                },
              Array.Empty<string>()
        }
    });

    options.UseAllOfToExtendReferenceSchemas();
});
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (Environment.GetEnvironmentVariable("IS_USE_SCARLA") == "true")
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
}

app.UseCors(KEY);
app.UseMiddleware<JwtBlacklistMiddleware>();
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();

app.Run();
