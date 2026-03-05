namespace OmsApi.Helpers
{
    /// <summary>
    /// Helper for Unix timestamp conversions (platform APIs use Unix timestamps)
    /// </summary>
    public static class DateTimeHelper
    {
        private static readonly DateTime UnixEpoch = new(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        /// <summary>Convert DateTime to Unix timestamp (seconds)</summary>
        public static long ToUnixTimestamp(DateTime dateTime)
        {
            return (long)(dateTime.ToUniversalTime() - UnixEpoch).TotalSeconds;
        }

        /// <summary>Convert Unix timestamp (seconds) to DateTime UTC</summary>
        public static DateTime FromUnixTimestamp(long timestamp)
        {
            return UnixEpoch.AddSeconds(timestamp);
        }

        /// <summary>Get current Unix timestamp</summary>
        public static long CurrentUnixTimestamp()
        {
            return ToUnixTimestamp(DateTime.UtcNow);
        }

        /// <summary>Convert Unix timestamp to Thailand time (UTC+7)</summary>
        public static DateTime ToThailandTime(long timestamp)
        {
            var utcTime = FromUnixTimestamp(timestamp);
            return TimeZoneInfo.ConvertTimeFromUtc(utcTime,
                TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));
        }
    }
}
