using System.Reflection;
using OmsApi.Controllers;
using OmsApi.Models.Shipping;

namespace OmsApi.Tests;

public class ShopeeFlowDecisionTests
{
    [Fact]
    public void ProcessedPackageWithoutArrangeFlag_DoesNotArrangeAgain()
    {
        Assert.False(NeedsArrange(new ShippingPackage
        {
            Status = "PROCESSED",
            IsShipmentArranged = null
        }));
    }

    [Fact]
    public void LogisticsReadyPackageWithFalseArrangeFlag_IsArranged()
    {
        Assert.True(NeedsArrange(new ShippingPackage
        {
            Status = "LOGISTICS_READY",
            IsShipmentArranged = false
        }));
    }

    [Fact]
    public void LogisticsReadyPackageWithMissingArrangeFlag_IsArrangedWhenOmsHasNotAcceptedIt()
    {
        Assert.True(NeedsArrange(new ShippingPackage
        {
            Status = "LOGISTICS_READY",
            IsShipmentArranged = null
        }));
    }

    [Fact]
    public void SavedArrangedPackage_IsRecognizedAsAlreadyAccepted()
    {
        var packageRef = Guid.NewGuid();
        var package = new ShippingPackage
        {
            PackageId = "PACKAGE-1",
            Status = "LOGISTICS_READY",
            IsShipmentArranged = null
        };
        var savedPackages = new List<PlatformPackageRecordResult>
        {
            new()
            {
                WmsPackageRef = packageRef,
                PlatformPackageId = "PACKAGE-1",
                PackageStatus = "ARRANGED"
            }
        };
        var manifest = new WmsPackageManifest
        {
            Packages =
            {
                new WmsPackageManifestPackage
                {
                    WmsPackageRef = packageRef,
                    BoxNumber = 1
                },
                new WmsPackageManifestPackage
                {
                    WmsPackageRef = Guid.NewGuid(),
                    BoxNumber = 2
                }
            }
        };

        Assert.True(WasArrangeAccepted(package, savedPackages, manifest));
    }

    private static bool NeedsArrange(ShippingPackage package)
    {
        var method = typeof(ShippingController).GetMethod(
            "ShopeePackageNeedsArrange",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);
        return Assert.IsType<bool>(method.Invoke(null, new object[] { package }));
    }

    private static bool WasArrangeAccepted(
        ShippingPackage package,
        IReadOnlyCollection<PlatformPackageRecordResult> savedPackages,
        WmsPackageManifest manifest)
    {
        var method = typeof(ShippingController).GetMethod(
            "ShopeeArrangeWasAccepted",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);
        return Assert.IsType<bool>(method.Invoke(
            null,
            new object[] { package, savedPackages, manifest }));
    }
}
