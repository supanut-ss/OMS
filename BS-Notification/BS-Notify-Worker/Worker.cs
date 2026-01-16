using BS_Notify_Worker.Interfaces;
using BS_Notify_Worker.Logging;

public class Worker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<Worker> _logger;

    public Worker(
        IServiceScopeFactory scopeFactory,
        ILogger<Worker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification Worker started");
        FileLogger.WriteLog("=== Notification Worker started ===");

        var intervalMinutes = int.TryParse(
            Environment.GetEnvironmentVariable("WORKER_INTERVAL_MINUTES"),
            out var m) ? m : 1;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();

                var repo = scope.ServiceProvider
                                .GetRequiredService<INotificationRepository>();

                var pusher = scope.ServiceProvider
                                  .GetRequiredService<INotificationPusher>();

                var jobs = await repo.PickForDispatchAsync(20);

                foreach (var n in jobs)
                {
                    try
                    {
                        await pusher.PushAsync(n);
                        await repo.MarkDispatchedAsync(n.id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Dispatch failed id={Id}", n.id);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Worker loop error");
            }

            await Task.Delay(
                TimeSpan.FromMinutes(intervalMinutes),
                stoppingToken);
        }

        FileLogger.WriteLog("=== Notification Worker stopped ===");
        _logger.LogInformation("Notification Worker stopped");
    }
}
