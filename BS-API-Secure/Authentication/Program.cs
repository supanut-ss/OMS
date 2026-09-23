using Authentication.Interfaces;
using Authentication.Services;
using Authentication.Services.Application;
using Authentication.Services.Auth;
using Authentication.Services.Resource;
using Authentication.Services.Users;
using Microsoft.AspNetCore.Authentication;
using System.Data.Common;
using TokenManagement.Database;
using TokenManagement.Extensions;
using TokenManagement.Handler;
using TokenManagement.Interfaces;
using TokenManagement.Management.CustomsAuthentication;
using TokenManagement.Middleware;
using TokenManagement.Models;
using TokenManagement.Services;

var builder = WebApplication.CreateBuilder(args);
DotNetEnv.Env.Load();
//string allowIPEnv = Environment.GetEnvironmentVariable("ALLOWIP_WEB") ?? "";
string KEY = Environment.GetEnvironmentVariable("API_KEY_WEB") ?? "";
//List<string> allows = new List<string>();
//allows = allowIPEnv
//    .Split(',', StringSplitOptions.RemoveEmptyEntries)
//    .Select(a => a.Trim())
//    .ToList();
builder.Services.AddCors(options => {
    options.AddPolicy(name: KEY,
        builder =>
        {
            builder.WithOrigins("*")
                            .AllowAnyHeader()
                             .AllowAnyMethod();
        });
});
var defaultConnection = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") 
    ?? Environment.GetEnvironmentVariable("SERVERDB") 
    ?? throw new ArgumentNullException("SERVERDB_SECURITY or SERVERDB environment variable is required.");

// Determine database provider from environment variable
// Supports aliases: SqlServer/mssql/sql, PostgreSql/postgres/pgsql/pg, MySql/mariadb/maria
var dbProviderStr = Environment.GetEnvironmentVariable("DB_PROVIDER");
var dbProvider = DatabaseProviderParser.Parse(dbProviderStr);

// Register IDbConnectionFactory as singleton
builder.Services.AddSingleton<IDbConnectionFactory>(new DbConnectionFactory(defaultConnection, dbProvider));

// Update the registration of JwtHelper to use IOptions<JwtSettings>
builder.Services.AddSingleton<JwtHelper>();
builder.Services.AddCustomJwtAuthentication(builder.Configuration);
builder.Services.AddHttpContextAccessor();
// Add services to the container.
builder.Services.AddScoped<IAuth, AuthService>();
builder.Services.AddScoped<IUsers, UserService>();
builder.Services.AddScoped<IResource, ResourceService>();
builder.Services.AddScoped<IAlive, AliveService>();
builder.Services.AddScoped<IApplication,ApplicationService>();
builder.Services.AddScoped<IClientInfo, ClientInfoService>();
builder.Services.AddScoped<ITokenValidatorService, TokenValidatorService>();
builder.Services.AddScoped<IMenu, MenuService>();
builder.Services.AddScoped<IVersionControl, VersionService>();
builder.Services.AddScoped<IActivityLog, ActivityLogService>();
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi


builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();
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
//builder.Services.AddAuthentication(options =>
//{
//    options.DefaultAuthenticateScheme = "CustomJwtAuthentication";
//    options.DefaultChallengeScheme = "CustomJwtAuthentication";
//})
//.AddScheme<AuthenticationSchemeOptions, CustomJwtAuthenticationHandler>("CustomJwtAuthentication", null);
var app = builder.Build();
app.MapGet("/test-db", async (IDbConnectionFactory connectionFactory) =>
{
    string message;
    bool connected = false;

    try
    {
        using (DbConnection conn = connectionFactory.CreateConnection())
        {
            await conn.OpenAsync();
            connected = true;
            message = $"Connected to {conn.DataSource}, DB: {conn.Database}, Provider: {connectionFactory.CurrentProvider}";
        }
    }
    catch (Exception ex)
    {
        message = $"Error: {ex.Message}";
    }

    return Results.Json(new
    {
        connected,
        message,
        provider = connectionFactory.CurrentProvider.ToString()
    });
});
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
