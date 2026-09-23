using BS_Printing_Manager.Interfaces;
using BS_Printing_Manager.Services;
using DinkToPdf;
using DinkToPdf.Contracts;
using TokenManagement.Database;
using TokenManagement.Extensions;
using TokenManagement.Interfaces;
using TokenManagement.Middleware;
using TokenManagement.Services;

var builder = WebApplication.CreateBuilder(args);
DotNetEnv.Env.Load();

// ---- Database Provider (central factory) ----
var prtConnectionString = Environment.GetEnvironmentVariable("SERVERDB")
    ?? throw new InvalidOperationException("Missing SERVERDB environment variable");
var prtDbProviderStr = Environment.GetEnvironmentVariable("DB_PROVIDER") ?? "SqlServer";
var prtDbProvider = Enum.TryParse<DatabaseProvider>(prtDbProviderStr, true, out var prtParsedProvider)
    ? prtParsedProvider
    : DatabaseProvider.SqlServer;
builder.Services.AddSingleton<IDbConnectionFactory>(new DbConnectionFactory(prtConnectionString, prtDbProvider));
// Add services to the container.
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins("*")
     .AllowAnyHeader()
     .AllowAnyMethod().AllowCredentials();

    });
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IConverter>(
    new SynchronizedConverter(new PdfTools()));
builder.Services.AddScoped<ITokenValidatorService, TokenValidatorService>();
builder.Services.AddScoped<IPrintService, PrintService>();
builder.Services.AddScoped<IReportConfigProvider, DbReportConfigService>();
builder.Services.AddScoped<IPdfGenerator, DinkToPdfGenerator>();
builder.Services.AddHttpClient();


builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
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
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
}

app.UseCors("CorsPolicy");
app.UseMiddleware<JwtBlacklistMiddleware>();
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();

app.Run();

