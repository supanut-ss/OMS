using BS_Notify_Worker;
using BS_Notify_Worker.Interfaces;
using BS_Notify_Worker.Pushers;
using BS_Notify_Worker.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TokenManagement.Database;

var builder = Host.CreateApplicationBuilder(args);

// 🔐 Load .env
//DotNetEnv.Env.Load(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".env"));
DotNetEnv.Env.Load();

// ---- Database Provider (central factory) ----
var workerConnectionString = Environment.GetEnvironmentVariable("SERVERDB")
    ?? throw new InvalidOperationException("Missing SERVERDB environment variable");
var workerDbProviderStr = Environment.GetEnvironmentVariable("DB_PROVIDER") ?? "SqlServer";
var workerDbProvider = Enum.TryParse<DatabaseProvider>(workerDbProviderStr, true, out var workerParsedProvider)
    ? workerParsedProvider
    : DatabaseProvider.SqlServer;
builder.Services.AddSingleton<IDbConnectionFactory>(new DbConnectionFactory(workerConnectionString, workerDbProvider));
// 🪟 Windows Service
builder.Services.AddWindowsService(o =>
{
    o.ServiceName = "BS.Notify.Worker";
});

// 📜 Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddEventLog();

// 🌐 HttpClient → Notification API
var baseUrl = Environment.GetEnvironmentVariable("BASEURL");
if (string.IsNullOrWhiteSpace(baseUrl))
{
    throw new InvalidOperationException("Environment variable BASEURL is missing");
}

builder.Services.AddHttpClient<INotificationPusher, SignalRNotificationPusher>(c =>
{
    c.BaseAddress = new Uri(baseUrl);
    c.Timeout = TimeSpan.FromSeconds(10);
});

// 🗄️ Repository
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// 🔁 Worker
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
