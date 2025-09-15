using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ApiCore.Services.Implementation;
using Dapper;
using ApiCore.Services.Interfaces;

namespace ApiCore.Controllers
{
    /// <summary>
    /// Example controller demonstrating SqlConnectionFactory usage with different ORMs
    /// Shows how to use ADO.NET, Dapper, and EF Core with the same connection factory
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class DatabaseExampleController : ControllerBase
    {
        private readonly DatabaseExampleService _dbService;
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly ILogger<DatabaseExampleController> _logger;

        public DatabaseExampleController(
            DatabaseExampleService dbService,
            ISqlConnectionFactory connectionFactory,
            ILogger<DatabaseExampleController> logger)
        {
            _dbService = dbService;
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        /// <summary>
        /// Test database health using Dapper
        /// </summary>
        [HttpGet("health")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 500)]
        public async Task<ActionResult> HealthCheck()
        {
            try
            {
                var isHealthy = await _dbService.HealthCheckAsync();

                if (isHealthy)
                {
                    return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
                }

                return StatusCode(500, new { status = "unhealthy", timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed");
                return StatusCode(500, new { status = "error", message = ex.Message });
            }
        }

        /// <summary>
        /// Get database version using Dapper
        /// </summary>
        [HttpGet("version")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<ActionResult> GetDatabaseVersion()
        {
            try
            {
                var version = await _dbService.QueryFirstOrDefaultAsync<string>("SELECT @@VERSION");
                var serverName = await _dbService.QueryFirstOrDefaultAsync<string>("SELECT @@SERVERNAME");
                var dbName = await _dbService.QueryFirstOrDefaultAsync<string>("SELECT DB_NAME()");

                return Ok(new
                {
                    version = version,
                    serverName = serverName,
                    databaseName = dbName,
                    connectionType = "Dapper",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get database version");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get system information using multiple approaches
        /// </summary>
        [HttpGet("system-info")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<ActionResult> GetSystemInfo()
        {
            try
            {
                // Using Dapper
                var dapperResults = await _dbService.QueryAsync<dynamic>(@"
                    SELECT 
                        'Dapper' AS Method,
                        @@VERSION AS SqlVersion,
                        GETDATE() AS CurrentTime,
                        USER_NAME() AS CurrentUser
                ");

                // Using ADO.NET
                var adoResults = await _dbService.ExecuteReaderAsync(@"
                    SELECT 
                        'ADO.NET' AS Method,
                        @@VERSION AS SqlVersion,
                        GETDATE() AS CurrentTime,
                        USER_NAME() AS CurrentUser
                ");

                // Direct connection usage (for demonstration)
                using var connection = _connectionFactory.CreateConnection();
                var directResult = await connection.QueryFirstOrDefaultAsync<dynamic>(@"
                    SELECT 
                        'Direct' AS Method,
                        @@VERSION AS SqlVersion,
                        GETDATE() AS CurrentTime,
                        USER_NAME() AS CurrentUser
                ");

                return Ok(new
                {
                    dapperResult = dapperResults.First(),
                    adoResult = adoResults.First(),
                    directResult = directResult,
                    message = "All three methods use the same SqlConnectionFactory",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get system info");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Test stored procedure execution using Dapper
        /// </summary>
        [HttpGet("stored-procedure-test")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<ActionResult> TestStoredProcedure()
        {
            try
            {
                // Example: Get database info using system stored procedure
                var results = await _dbService.ExecuteStoredProcedureAsync<dynamic>(
                    "sp_helpdb",
                    new { dbname = "master" });

                return Ok(new
                {
                    method = "Stored Procedure via Dapper",
                    results = results.Take(5), // Limit results for demo
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stored procedure test failed");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Test transaction using Dapper
        /// </summary>
        [HttpPost("transaction-test")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<ActionResult> TestTransaction()
        {
            try
            {
                var commands = new List<(string sql, object? parameters)>
                {
                    ("SELECT 1 AS TestValue", null),
                    ("SELECT 2 AS TestValue", null),
                    ("SELECT GETDATE() AS CurrentTime", null)
                };

                var success = await _dbService.ExecuteTransactionAsync(commands);

                return Ok(new
                {
                    method = "Transaction via Dapper",
                    success = success,
                    message = success ? "Transaction completed successfully" : "Transaction failed",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Transaction test failed");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Demonstrate query with parameters using Dapper
        /// </summary>
        [HttpGet("parameterized-query")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<ActionResult> ParameterizedQuery([FromQuery] string? searchTerm = "test")
        {
            try
            {
                var sql = @"
                    SELECT 
                        @SearchTerm AS SearchTerm,
                        LEN(@SearchTerm) AS SearchLength,
                        UPPER(@SearchTerm) AS SearchUpper,
                        GETDATE() AS QueryTime
                ";

                var result = await _dbService.QueryFirstOrDefaultAsync<dynamic>(sql, new { SearchTerm = searchTerm });

                return Ok(new
                {
                    method = "Parameterized Query via Dapper",
                    result = result,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Parameterized query failed");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Show connection factory capabilities
        /// </summary>
        [HttpGet("connection-factory-demo")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<ActionResult> ConnectionFactoryDemo()
        {
            try
            {
                var results = new List<object>();

                // Method 1: Create connection manually
                using (var connection1 = _connectionFactory.CreateConnection())
                {
                    await connection1.OpenAsync();
                    var result1 = await connection1.QueryFirstOrDefaultAsync<string>("SELECT 'Method 1: Manual' AS Method");
                    results.Add(new { method = result1, connectionState = connection1.State.ToString() });
                }

                // Method 2: Create and open connection automatically
                using (var connection2 = await _connectionFactory.CreateAndOpenConnectionAsync())
                {
                    var result2 = await connection2.QueryFirstOrDefaultAsync<string>("SELECT 'Method 2: Auto-Open' AS Method");
                    results.Add(new { method = result2, connectionState = connection2.State.ToString() });
                }

                // Method 3: Use IDbConnection interface
                using (var connection3 = await _connectionFactory.CreateAndOpenDbConnectionAsync())
                {
                    var result3 = await connection3.QueryFirstOrDefaultAsync<string>("SELECT 'Method 3: IDbConnection' AS Method");
                    results.Add(new { method = result3, connectionState = connection3.State.ToString() });
                }

                return Ok(new
                {
                    connectionString = _connectionFactory.ConnectionString,
                    results = results,
                    message = "SqlConnectionFactory supports multiple usage patterns",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Connection factory demo failed");
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
