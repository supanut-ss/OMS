using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TokenManagement.Models;

namespace TokenManagement.Extensions
{
    public static class JwtAuthenticationExtensions
    {
        public static IServiceCollection AddCustomJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var jwtSettings = new JwtSettings
            {
                SecretKey = Environment.GetEnvironmentVariable("ISSUER_SIGIN_KEY") ?? "",
                Issuer = Environment.GetEnvironmentVariable("VALID_ISSUER") ?? "",
                ExpiresInMinutes = int.Parse(Environment.GetEnvironmentVariable("EXPIRES")?.ToString() ?? "30")
            };
            string validAudienceEnv = Environment.GetEnvironmentVariable("VALID_AUDIENCE") ?? "";
            jwtSettings.ValidAudiences = validAudienceEnv
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(a => a.Trim())
                .ToList();
            if (jwtSettings.ValidAudiences == null || !jwtSettings.ValidAudiences.Any())
                throw new Exception("No ValidAudiences defined. Cannot generate token.");

            // ✅ DON'T override with appsettings.json - use Environment Variables only
            // configuration.GetSection("JwtSettings").Bind(jwtSettings);

            services.Configure<JwtSettings>(options =>
            {
                options.SecretKey = jwtSettings.SecretKey;
                options.Issuer = jwtSettings.Issuer;
                options.ValidAudiences = jwtSettings.ValidAudiences;
                options.ExpiresInMinutes = jwtSettings.ExpiresInMinutes;
            });

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtSettings.Issuer,
                        ValidAudiences = jwtSettings.ValidAudiences,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
                        ClockSkew = TimeSpan.Zero
                    };
                    options.Events = new JwtBearerEvents
                    {
                        OnAuthenticationFailed = context =>
                        {
                            Console.WriteLine($"Token validation failed: {context.Exception.Message}");
                            return Task.CompletedTask;
                        }
                    };
                    //options.Events = new JwtBearerEvents
                    //{
                    //    OnTokenValidated = context =>
                    //    {
                    //        var jwtToken = context.SecurityToken as JwtSecurityToken;
                    //        Console.WriteLine(context.ToString());
                    //        return Task.CompletedTask;
                    //    },

                    //    OnAuthenticationFailed = context =>
                    //    {
                    //        Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                    //        if (context.Exception.InnerException != null)
                    //            Console.WriteLine($"Inner exception: {context.Exception.InnerException.Message}");
                    //        return Task.CompletedTask;
                    //    }
                    //};
                });

            return services;
        }
    }
}
