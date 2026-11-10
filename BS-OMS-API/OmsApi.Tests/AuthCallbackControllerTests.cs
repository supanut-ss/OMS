using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Controllers;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Services.Interfaces;

namespace OmsApi.Tests;

public class AuthCallbackControllerTests
{
    [Fact]
    public async Task Callback_returns_result_without_frontend_and_redirects_when_configured()
    {
        var previous = Environment.GetEnvironmentVariable("OMS_FRONTEND_CONNECTOR_URL");
        try
        {
            var service = new FakeAuthService();
            var controller = new AuthController(service, NullLogger<AuthController>.Instance, new TestEnvironment());
            Environment.SetEnvironmentVariable("OMS_FRONTEND_CONNECTOR_URL", null);

            var success = Assert.IsType<OkObjectResult>(await controller.Callback("lazada", "code", "shop", "state"));
            Assert.True(Assert.IsType<ApiResponse<object>>(success.Value).Success);
            Assert.Equal(1, service.CallbackCount);
            var failure = Assert.IsType<BadRequestObjectResult>(await controller.Callback("lazada", error: "denied"));
            Assert.False(Assert.IsType<ApiResponse<string>>(failure.Value).Success);
            Assert.Equal(1, service.CallbackCount);

            service.Fail = true;
            Assert.IsType<BadRequestObjectResult>(await controller.Callback("lazada", "code"));
            service.Fail = false;
            Environment.SetEnvironmentVariable("OMS_FRONTEND_CONNECTOR_URL", "https://example.test/connect?existing=1");
            var redirect = Assert.IsType<RedirectResult>(await controller.Callback("lazada", "code"));
            Assert.Contains("existing=1", redirect.Url);
            Assert.Contains("oauth=success", redirect.Url);
            Assert.Contains("platform=lazada", redirect.Url);
            var failedRedirect = Assert.IsType<RedirectResult>(await controller.Callback("lazada", error: "denied"));
            Assert.Contains("oauth=error", failedRedirect.Url);
        }
        finally { Environment.SetEnvironmentVariable("OMS_FRONTEND_CONNECTOR_URL", previous); }
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class FakeAuthService : IPlatformAuthService
    {
        public Task<string> GetAuthorizationUrlForAppAsync(PlatformType platform, long id, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public int CallbackCount { get; private set; }
        public bool Fail { get; set; }
        public Task<TokenInfo> HandleCallbackAsync(PlatformType platform, string code, string? shopId = null, string? state = null)
        {
            CallbackCount++;
            if (Fail) throw new InvalidOperationException("Callback failed");
            return Task.FromResult(new TokenInfo());
        }
        public Task<string> GetAuthorizationUrlAsync(PlatformType platform, long id, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<string> GetAuthorizationUrlAsync(PlatformType platform, string? marketCode, string? requestedBy = null, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<TokenInfo> RefreshTokenAsync(PlatformType platform, string refreshToken, string? shopId = null) => throw new NotImplementedException();
        public Task<TokenInfo> ImportSandboxTokenAsync(PlatformType platform, SandboxTokenRequest request) => throw new NotImplementedException();
    }
}
