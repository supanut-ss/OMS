using ApiCore.Data;
using ApiCore.Services.Implementation;
using ApiCore.Services.Implementation.Dialects;
using ApiCore.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ApiCore.Extensions
{
    /// <summary>
    /// Extension methods for registering database services with dependency injection.
    /// Supports multiple database providers (SQL Server, PostgreSQL, etc.)
    /// 
    /// Usage in Program.cs:
    ///   builder.Services.AddDatabase(builder.Configuration);
    /// 
    /// Configuration via environment variables:
    ///   DB_PROVIDER=SqlServer|PostgreSql  (default: SqlServer)
    ///   SERVERDB=<connection string>
    /// 
    /// Or via appsettings.json:
    ///   "Database": { "Provider": "SqlServer" }
    ///   "ConnectionStrings": { "DefaultConnection": "<connection string>" }
    /// </summary>
    public static class DatabaseServiceExtensions
    {
        /// <summary>
        /// Registers all database services (DbContext, ISqlDialect, ISqlConnectionFactory)
        /// based on the configured provider.
        /// </summary>
        public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            // Determine provider from: ENV > appsettings > default (SqlServer)
            var providerName = Environment.GetEnvironmentVariable("DB_PROVIDER")
                ?? configuration.GetValue<string>("Database:Provider")
                ?? "SqlServer";

            var provider = DatabaseSettings.ParseProvider(providerName);

            // Get connection string
            var connectionString = Environment.GetEnvironmentVariable("SERVERDB")
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("SERVERDB", "Database connection string is required.");

            // Register provider-specific services
            switch (provider)
            {
                case DatabaseProvider.PostgreSql:
                    services.AddPostgreSql(connectionString);
                    break;

                case DatabaseProvider.MySql:
                    services.AddMySql(connectionString);
                    break;

                case DatabaseProvider.SqlServer:
                default:
                    services.AddSqlServer(connectionString);
                    break;
            }

            // Register the connection factory (shared across all providers)
            services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();

            return services;
        }

        /// <summary>
        /// Registers SQL Server-specific services
        /// </summary>
        private static IServiceCollection AddSqlServer(this IServiceCollection services, string connectionString)
        {
            // Register SQL Server dialect
            services.AddSingleton<ISqlDialect, SqlServerDialect>();

            // Register EF Core with SQL Server
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            return services;
        }

        /// <summary>
        /// Registers PostgreSQL-specific services
        /// </summary>
        private static IServiceCollection AddPostgreSql(this IServiceCollection services, string connectionString)
        {
            // Register PostgreSQL dialect
            services.AddSingleton<ISqlDialect, PostgreSqlDialect>();

            // Register EF Core with PostgreSQL
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(connectionString));

            return services;
        }

        /// <summary>
        /// Registers MySQL / MariaDB-specific services
        /// </summary>
        private static IServiceCollection AddMySql(this IServiceCollection services, string connectionString)
        {
            // Register MySQL dialect
            services.AddSingleton<ISqlDialect, MySqlDialect>();

            // Register EF Core with MySQL via Pomelo
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

            return services;
        }
    }
}
