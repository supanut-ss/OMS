using BS_Notify_Worker;
using BS_Notify_Worker.Interfaces;
using BS_Notify_Worker.Pushers;
using BS_Notify_Worker.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(args);

// 🔐 Load .env
//DotNetEnv.Env.Load(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".env"));
DotNetEnv.Env.Load();
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
