using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ApiCore.Data;
using ApiCore.Data.Repositories;
using ApiCore.Services.Interfaces;
using ApiCore.Services.Implementation;
using DotNetEnv;
using System.Text;

// Load .env file
var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
if (!File.Exists(envPath))
{
    // Try parent directory (development scenario)
    var parentEnvPath = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory())?.FullName ?? "", ".env");
    if (File.Exists(parentEnvPath))
    {
        envPath = parentEnvPath;
    }
    else
    {
        // Try project root
        var projectRoot = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
        while (projectRoot != null && !File.Exists(Path.Combine(projectRoot, "ApiCore.csproj")))
        {
            projectRoot = Directory.GetParent(projectRoot)?.FullName;
        }
        if (projectRoot != null)
        {
            var rootEnvPath = Path.Combine(projectRoot, ".env");
            if (File.Exists(rootEnvPath))
            {
                envPath = rootEnvPath;
            }
        }
    }
}

if (File.Exists(envPath))
{
    Env.Load(envPath);
}
else
{
    Console.WriteLine($"Warning: .env file not found. Checked paths: {envPath}");
}

var builder = WebApplication.CreateBuilder(args);

// Add CORS - Allow all origins (Development only)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// Add Database - Using SQL Server with Multi-Database Architecture
var connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// Add SQL Connection Factory for Multi-Database operations (Main + Security)
builder.Services.AddSingleton<ISqlConnectionFactory>(provider =>
    new SqlConnectionFactory(provider.GetRequiredService<IConfiguration>()));

// Add Repository Pattern
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Add Services
builder.Services.AddScoped<IDynamicCrudService, DynamicCrudService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<DatabaseExampleService>();


// Add JWT Authentication
var jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
    ?? throw new InvalidOperationException("JWT Secret Key not found in .env file.");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "TimesheetAPI";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "TimesheetUsers";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Add Controllers
builder.Services.AddControllers();

// Add API Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Timesheet Management API",
        Version = "v1.0",
        Description = @"A comprehensive RESTful API with dynamic CRUD operations for any database table, view, or stored procedure.",
        License = new()
        {
            Name = "MIT License",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });

    // Include XML comments for better documentation
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }

    // Add response examples and schemas
    c.EnableAnnotations();

    // Group endpoints by tags
    c.TagActionsBy(api =>
    {
        if (api.ActionDescriptor is Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor controllerActionDescriptor)
        {
            return new[] { controllerActionDescriptor.ControllerName };
        }
        return new[] { api.GroupName ?? "Default" };
    });
    c.DocInclusionPredicate((name, api) => true);

    // Order tags alphabetically
    c.OrderActionsBy((apiDesc) => $"{apiDesc.ActionDescriptor.RouteValues["controller"]}_{apiDesc.RelativePath}");

    // Add security definitions for JWT authentication
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new()
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Timesheet Management API V1");
        c.RoutePrefix = string.Empty; // Makes Swagger available at root
        c.DocumentTitle = "Timesheet API Documentation";
        c.DefaultModelsExpandDepth(-1); // Disable swagger models on load
        c.DefaultModelRendering(Swashbuckle.AspNetCore.SwaggerUI.ModelRendering.Model);
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
        c.EnableDeepLinking();
        c.EnableFilter();
        c.EnableValidator();
        c.DisplayRequestDuration();
    });
}
else
{
    // Enable Swagger in production for API documentation (optional)
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Timesheet Management API V1");
        c.RoutePrefix = "docs"; // Makes Swagger available at /docs
        c.DocumentTitle = "Timesheet API Documentation";
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Initialize Database (Optional)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        await context.Database.EnsureCreatedAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while creating the database");
    }
}

app.Run();
