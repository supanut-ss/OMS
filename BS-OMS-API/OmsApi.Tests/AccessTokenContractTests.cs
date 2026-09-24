using System.Text.Json;
using OmsApi.Controllers;
using OmsApi.Models.Common;
using OmsApi.Models.Inventory;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;

namespace OmsApi.Tests;

public class AccessTokenContractTests
{
    [Fact]
    public void PlatformRequests_DoNotSerializeAccessTokens()
    {
        object[] requests =
        {
            new ShippingLabelRequest { AccessToken = "secret" },
            new ShipOrderRequest { AccessToken = "secret" },
            new OrderFilter { AccessToken = "secret" },
            new PlatformCredentialInput { AccessToken = "secret" },
            new ProductFilter { AccessToken = "secret" },
            new UpdateStockRequest { AccessToken = "secret" },
            new SplitPlatformOrderRequest { AccessToken = "secret" }
        };

        foreach (var request in requests)
        {
            var json = JsonSerializer.Serialize(request, request.GetType());
            Assert.DoesNotContain("AccessToken", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("secret", json, StringComparison.Ordinal);
        }
    }

    [Theory]
    [InlineData(typeof(ShippingController))]
    [InlineData(typeof(OrderController))]
    [InlineData(typeof(InventoryController))]
    public void PublicPlatformEndpoints_DoNotExposeAccessTokenParameters(Type controllerType)
    {
        var accessTokenParameters = controllerType
            .GetMethods()
            .SelectMany(method => method.GetParameters())
            .Where(parameter =>
                string.Equals(parameter.Name, "accessToken", StringComparison.OrdinalIgnoreCase))
            .ToList();

        Assert.Empty(accessTokenParameters);
    }
}
