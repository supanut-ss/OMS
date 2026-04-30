using OmsApi.Helpers;

namespace OmsApi.Tests;

public class DateTimeHelperTests
{
    // ─── ToUnixTimestamp ──────────────────────────────────

    [Fact]
    public void ToUnixTimestamp_UnixEpoch_ReturnsZero()
    {
        var epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        Assert.Equal(0L, DateTimeHelper.ToUnixTimestamp(epoch));
    }

    [Fact]
    public void ToUnixTimestamp_KnownDate_ReturnsCorrectValue()
    {
        var dt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        Assert.Equal(1704067200L, DateTimeHelper.ToUnixTimestamp(dt));
    }

    [Fact]
    public void ToUnixTimestamp_ConvertsLocalToUtcFirst()
    {
        var utcDt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);
        var localDt = TimeZoneInfo.ConvertTimeFromUtc(utcDt, TimeZoneInfo.Local);
        Assert.Equal(DateTimeHelper.ToUnixTimestamp(utcDt), DateTimeHelper.ToUnixTimestamp(localDt));
    }

    // ─── FromUnixTimestamp ────────────────────────────────

    [Fact]
    public void FromUnixTimestamp_Zero_ReturnsEpoch()
    {
        var result = DateTimeHelper.FromUnixTimestamp(0);
        Assert.Equal(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc), result);
    }

    [Fact]
    public void FromUnixTimestamp_KnownTimestamp_ReturnsCorrectDate()
    {
        var result = DateTimeHelper.FromUnixTimestamp(1704067200L);
        Assert.Equal(new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), result);
    }

    // ─── Round-trip ───────────────────────────────────────

    [Fact]
    public void RoundTrip_ToThenFrom_ReturnsSameSecond()
    {
        var original = new DateTime(2025, 5, 15, 10, 30, 0, DateTimeKind.Utc);
        var ts = DateTimeHelper.ToUnixTimestamp(original);
        var result = DateTimeHelper.FromUnixTimestamp(ts);
        Assert.Equal(original, result);
    }

    // ─── CurrentUnixTimestamp ────────────────────────────

    [Fact]
    public void CurrentUnixTimestamp_IsPositive()
    {
        Assert.True(DateTimeHelper.CurrentUnixTimestamp() > 0);
    }

    [Fact]
    public void CurrentUnixTimestamp_IsReasonablyRecent()
    {
        var now = DateTimeHelper.CurrentUnixTimestamp();
        var year2020 = DateTimeHelper.ToUnixTimestamp(new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var year2030 = DateTimeHelper.ToUnixTimestamp(new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        Assert.InRange(now, year2020, year2030);
    }

    // ─── ToThailandTime ───────────────────────────────────

    [Fact]
    public void ToThailandTime_AddsSevenHoursFromUtc()
    {
        // UTC midnight = Thailand 07:00
        var midnight = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var ts = DateTimeHelper.ToUnixTimestamp(midnight);
        var thai = DateTimeHelper.ToThailandTime(ts);
        Assert.Equal(7, thai.Hour);
    }
}
