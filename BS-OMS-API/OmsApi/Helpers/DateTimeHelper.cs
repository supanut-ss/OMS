namespace OmsApi.Helpers
{
    /// <summary>
    /// Helper for Unix timestamp conversions (platform APIs use Unix timestamps)
    /// </summary>
    public static class DateTimeHelper
    {
        private static readonly DateTime UnixEpoch = new(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        private static readonly Lazy<TimeZoneInfo> ThailandTimeZone = new(() =>
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            }
            catch (TimeZoneNotFoundException)
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");
            }
        });

        /// <summary>Convert DateTime to Unix timestamp (seconds)</summary>
        public static long ToUnixTimestamp(DateTime dateTime)
        {
            return (long)(dateTime.ToUniversalTime() - UnixEpoch).TotalSeconds;
        }

        /// <summary>Convert Unix timestamp (seconds) to DateTime UTC</summary>
        public static DateTime FromUnixTimestamp(long timestamp)
        {
            return DateTimeOffset.FromUnixTimeSeconds(timestamp).UtcDateTime;
        }

        /// <summary>Get current Unix timestamp</summary>
        public static long CurrentUnixTimestamp()
        {
            return ToUnixTimestamp(DateTime.UtcNow);
        }

        /// <summary>Convert Unix timestamp to Thailand time (UTC+7)</summary>
        public static DateTime ToThailandTime(long timestamp)
        {
            return ToThailandTime(DateTimeOffset.FromUnixTimeSeconds(timestamp));
        }

        /// <summary>
        /// Convert an absolute platform timestamp to Thailand marketplace time.
        /// SQL Server datetime has no offset, so return Kind=Unspecified to keep
        /// the persisted wall-clock value unambiguous inside OMS.
        /// </summary>
        public static DateTime ToThailandTime(DateTimeOffset instant)
        {
            var thailand = TimeZoneInfo.ConvertTime(instant, ThailandTimeZone.Value);
            return DateTime.SpecifyKind(thailand.DateTime, DateTimeKind.Unspecified);
        }
    }
}
