using Microsoft.AspNetCore.Http;
using OmsApi.Middleware;

namespace OmsApi.Tests;

public class ApiKeyMiddlewareTests
{
    private static DefaultHttpContext CreateContext(string? apiKey = null)
    {
        var context = new DefaultHttpContext();
        if (apiKey != null)
            context.Request.Headers["X-Api-Key"] = apiKey;
        context.Response.Body = new MemoryStream();
        return context;
    }

    [Fact]
    public async Task Invoke_WhenNoEnvKeyConfigured_AllowsAllRequests()
    {
        Environment.SetEnvironmentVariable("OMS_API_KEY", null);
        bool nextCalled = false;
        var middleware = new ApiKeyMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext(); // no header

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Assert.Equal(200, context.Response.StatusCode);
    }

    [Fact]
    public async Task Invoke_WhenSwaggerPath_SkipsApiKeyCheck()
    {
        Environment.SetEnvironmentVariable("OMS_API_KEY", "valid-key");
        bool nextCalled = false;
        var middleware = new ApiKeyMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext(); // no header
        context.Request.Path = "/swagger/index.html";

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Environment.SetEnvironmentVariable("OMS_API_KEY", null);
    }

    [Fact]
    public async Task Invoke_WhenValidApiKey_AllowsRequest()
    {
        Environment.SetEnvironmentVariable("OMS_API_KEY", "my-secret-key");
        bool nextCalled = false;
        var middleware = new ApiKeyMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext("my-secret-key");

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Environment.SetEnvironmentVariable("OMS_API_KEY", null);
    }

    [Fact]
    public async Task Invoke_WhenInvalidApiKey_Returns401()
    {
        Environment.SetEnvironmentVariable("OMS_API_KEY", "correct-key");
        bool nextCalled = false;
        var middleware = new ApiKeyMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext("wrong-key");

        await middleware.InvokeAsync(context);

        Assert.False(nextCalled);
        Assert.Equal(401, context.Response.StatusCode);
        Environment.SetEnvironmentVariable("OMS_API_KEY", null);
    }

    [Fact]
    public async Task Invoke_WhenMissingApiKeyHeader_Returns401()
    {
        Environment.SetEnvironmentVariable("OMS_API_KEY", "required-key");
        bool nextCalled = false;
        var middleware = new ApiKeyMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext(); // no header at all

        await middleware.InvokeAsync(context);

        Assert.False(nextCalled);
        Assert.Equal(401, context.Response.StatusCode);
        Environment.SetEnvironmentVariable("OMS_API_KEY", null);
    }

    [Fact]
    public async Task Invoke_WhenInvalidKey_WritesJsonResponse()
    {
        Environment.SetEnvironmentVariable("OMS_API_KEY", "secret");
        var middleware = new ApiKeyMiddleware(_ => Task.CompletedTask);
        var context = CreateContext("bad-key");

        await middleware.InvokeAsync(context);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        Assert.Contains("Unauthorized", body);
        Assert.Contains("application/json", context.Response.ContentType);
        Environment.SetEnvironmentVariable("OMS_API_KEY", null);
    }
}
