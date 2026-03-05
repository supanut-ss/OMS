using System.Security.Cryptography;
using System.Text;

namespace OmsApi.Helpers
{
    /// <summary>
    /// Helper for generating HMAC-SHA256 signatures required by Shopee, Lazada, and TikTok APIs
    /// </summary>
    public static class SignatureHelper
    {
        /// <summary>
        /// Generate HMAC-SHA256 signature
        /// </summary>
        /// <param name="key">Secret key</param>
        /// <param name="data">Data to sign</param>
        /// <returns>Hex-encoded signature</returns>
        public static string HmacSha256(string key, string data)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }

        /// <summary>
        /// Generate Shopee API signature
        /// partner_id + api_path + timestamp + access_token + shop_id
        /// </summary>
        public static string GenerateShopeeSignature(string partnerKey, long partnerId, string apiPath, long timestamp, string? accessToken = null, long? shopId = null)
        {
            var baseString = $"{partnerId}{apiPath}{timestamp}";
            if (!string.IsNullOrEmpty(accessToken))
                baseString += accessToken;
            if (shopId.HasValue)
                baseString += shopId.Value;

            return HmacSha256(partnerKey, baseString);
        }

        /// <summary>
        /// Generate Lazada API signature
        /// Sort all params alphabetically, concatenate, then HMAC
        /// </summary>
        public static string GenerateLazadaSignature(string appSecret, string apiPath, Dictionary<string, string> parameters)
        {
            var sortedParams = parameters.OrderBy(p => p.Key);
            var sb = new StringBuilder(apiPath);
            foreach (var param in sortedParams)
            {
                sb.Append(param.Key);
                sb.Append(param.Value);
            }
            return HmacSha256(appSecret, sb.ToString());
        }

        /// <summary>
        /// Generate TikTok Shop API signature
        /// app_secret + path + sorted_params + body + app_secret
        /// </summary>
        public static string GenerateTikTokSignature(string appSecret, string apiPath, Dictionary<string, string> parameters, string? body = null)
        {
            var sortedParams = parameters.OrderBy(p => p.Key);
            var sb = new StringBuilder(appSecret);
            sb.Append(apiPath);
            foreach (var param in sortedParams)
            {
                sb.Append(param.Key);
                sb.Append(param.Value);
            }
            if (!string.IsNullOrEmpty(body))
                sb.Append(body);
            sb.Append(appSecret);

            return HmacSha256(appSecret, sb.ToString());
        }
    }
}
