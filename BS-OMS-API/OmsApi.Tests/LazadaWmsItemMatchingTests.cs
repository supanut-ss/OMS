using System.Net;
using System.Reflection;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Common;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class LazadaWmsItemMatchingTests
{
    [Fact]
    public async Task OrderItems_MapProductIdAndMatchWmsProductNumbers()
    {
        var client = new LazadaClient(
            new StubHttpClientFactory(new HttpClient(new OrderHandler())
            {
                BaseAddress = new Uri("https://api.lazada.co.th/rest/")
            }),
            NullLogger<LazadaClient>.Instance);

        var order = await client.GetOrderDetailAsync(
            "token",
            "seller-1",
            "1117729602964242");

        Assert.NotNull(order);
        Assert.Equal(4, order.Items.Count);
        Assert.Equal(
            2,
            order.Items.Count(item => item.ItemId == "16275649164"));
        Assert.Equal(
            2,
            order.Items.Count(item => item.ItemId == "16277521262"));
        Assert.All(order.Items, item => Assert.True(item.OrderItemId > 0));

        InvokeMarketplaceValidation(
            order,
            new List<WmsPackageManifestPackage>
            {
                Box(1, "16275649164", 2),
                Box(2, "16277521262", 2)
            });
    }

    private static WmsPackageManifestPackage Box(
        int boxNumber,
        string itemNumber,
        decimal quantity) => new()
    {
        WmsPackageRef = Guid.NewGuid(),
        BoxNumber = boxNumber,
        IsCloseBox = "YES",
        Items =
        {
            new WmsPackageManifestItem
            {
                ItemNumber = itemNumber,
                Quantity = quantity
            }
        }
    };

    private static void InvokeMarketplaceValidation(
        UnifiedOrder order,
        IReadOnlyCollection<WmsPackageManifestPackage> packages)
    {
        var method = typeof(ShippingService).GetMethod(
            "ValidateMarketplaceItemAllocation",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);
        method.Invoke(
            null,
            new object[] { PlatformType.Lazada, order, packages });
    }

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class OrderHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var json = request.RequestUri!.AbsolutePath.EndsWith(
                "/order/items/get",
                StringComparison.Ordinal)
                ? """
                  {
                    "code": "0",
                    "data": [
                      {
                        "order_item_id": 101,
                        "product_id": 16275649164,
                        "shop_sku": "16275649164_TH-127602487591",
                        "seller_sku": "KTEST01003X",
                        "paid_price": "85.00"
                      },
                      {
                        "order_item_id": 102,
                        "product_id": 16275649164,
                        "shop_sku": "16275649164_TH-127602487591",
                        "seller_sku": "KTEST01003X",
                        "paid_price": "85.00"
                      },
                      {
                        "order_item_id": 201,
                        "product_id": 16277521262,
                        "shop_sku": "16277521262_TH-127602487592",
                        "seller_sku": "1003937(3)",
                        "paid_price": "300.00"
                      },
                      {
                        "order_item_id": 202,
                        "product_id": 16277521262,
                        "shop_sku": "16277521262_TH-127602487592",
                        "seller_sku": "1003937(3)",
                        "paid_price": "300.00"
                      }
                    ]
                  }
                  """
                : """
                  {
                    "code": "0",
                    "data": {
                      "order_id": 1117729602964242,
                      "price": "1683.00",
                      "statuses": ["packed"]
                    }
                  }
                  """;

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json")
            });
        }
    }
}
