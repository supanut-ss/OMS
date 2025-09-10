using Ocelot.Middleware;
using Ocelot.DependencyInjection;
using TokenManagement.Extensions;
using TokenManagement.Interfaces;
using TokenManagement.Services;
using TokenManagement.Middleware;

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

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Configuration.AddJsonFile("ocelot.json", optional: true, reloadOnChange: true);
builder.Services.AddOcelot(builder.Configuration);
builder.Services.AddCustomJwtAuthentication(builder.Configuration);
builder.Services.AddScoped<ITokenValidatorService, TokenValidatorService>();
var app = builder.Build();


app.UseRouting();
app.UseCors(KEY);
app.UseMiddleware<JwtBlacklistMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
await app.UseOcelot();
app.Run();
