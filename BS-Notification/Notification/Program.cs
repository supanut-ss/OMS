using Notification.Hubs;
using Notification.Services;
using TokenManagement.Extensions;
using TokenManagement.Interfaces;
using TokenManagement.Services;
using TokenManagement.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
var builder = WebApplication.CreateBuilder(args);
DotNetEnv.Env.Load();
// Add services to the container.
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(
        "http://localhost:3000",
        "http://10.10.60.60",
         "https://10.10.60.60"
     )
     .AllowAnyHeader()
     .AllowAnyMethod().AllowCredentials();

    });
});
// Configure JwtBearer options without re-registering the scheme (avoid 'Scheme already exists: Bearer')
builder.Services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            try
            {
                var accessToken = context.Request.Query["access_token"].FirstOrDefault();
                var path = context.HttpContext.Request.Path;
                var logger = context.HttpContext.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("JwtOnMessageReceived");
                logger?.LogInformation("OnMessageReceived path={Path} queryAccessTokenPresent={HasToken}", path, !string.IsNullOrEmpty(accessToken));
                if (!string.IsNullOrEmpty(accessToken) && path.Value != null && path.Value.Contains("/notificationHub"))
                {
                    context.Token = accessToken;
                    logger?.LogInformation("Set context.Token from query for path {Path}", path);
                }
            }
            catch (Exception ex)
            {
                var logger = context.HttpContext.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("JwtOnMessageReceived");
                logger?.LogError(ex, "Error in OnMessageReceived");
            }
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddCustomJwtAuthentication(builder.Configuration);
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
});
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITokenValidatorService, TokenValidatorService>();
builder.Services.AddScoped<NotificationService>();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

try
{
    var app = builder.Build();

    app.UseCors("CorsPolicy");
    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseHttpsRedirection();

    // Simple exception-logging middleware to capture errors during negotiate/upgrade
    app.Use(async (context, next) =>
    {
        try
        {
            await next();
        }
        catch (Exception ex)
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "Unhandled exception for {Path}", context.Request.Path);
            throw;
        }
    });

    app.UseMiddleware<JwtBlacklistMiddleware>();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<NotificationHub>("/notificationHub");

    app.Run();
}
catch (Exception ex)
{
    try
    {
        var msg = $"Startup failure: {ex}\n{ex.StackTrace}";
        Console.Error.WriteLine(msg);
        var path = System.IO.Path.Combine(AppContext.BaseDirectory ?? ".", "startup_error.txt");
        System.IO.File.WriteAllText(path, msg);
    }
    catch { }
    throw;
}
