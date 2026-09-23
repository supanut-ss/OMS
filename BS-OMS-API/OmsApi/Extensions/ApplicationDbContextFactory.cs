using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace OmsApi.Extensions;

// Used only by `dotnet ef` at design time (migrations), so it doesn't need
// the full Program.cs host (data protection keys, CORS, etc.).
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();
        var envFilePath = Path.Combine(basePath, ".env");
        if (File.Exists(envFilePath))
        {
            DotNetEnv.Env.Load(envFilePath);
        }

        var connectionString = Environment.GetEnvironmentVariable("OMS_DB_CONNECTION_STRING")
            ?? throw new InvalidOperationException("OMS_DB_CONNECTION_STRING is not set.");

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
