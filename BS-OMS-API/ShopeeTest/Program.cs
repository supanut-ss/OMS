using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

long   PARTNER_ID   = 1238945;
string PARTNER_KEY  = "shpk61526e7861774354526876554343514a566a6463676f4f546a517463564c";
string API_BASE_URL = "https://openplatform.sandbox.test-stable.shopee.sg";
string ACCESS_TOKEN = "49695270634f766c424e476870776252";
long   SHOP_ID      = 227762129;

string[] orders = new[] { "260722BC0143HR", "260722BBYKRPDM", "260722BBXWTXPU" };

using var http = new HttpClient();

Console.WriteLine("=== FETCHING TRACKING NUMBERS FOR ALL ORDERS ===\n");

foreach (var orderSn in orders)
{
    Console.WriteLine($"📦 Order SN: {orderSn}");

    // 1. get_tracking_number
    {
        var ts      = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var apiPath = "/api/v2/logistics/get_tracking_number";
        var sign    = SignShop(PARTNER_KEY, PARTNER_ID, apiPath, ts, ACCESS_TOKEN, SHOP_ID);
        var url     = $"{API_BASE_URL}{apiPath}?partner_id={PARTNER_ID}&timestamp={ts}&access_token={ACCESS_TOKEN}&shop_id={SHOP_ID}&sign={sign}&order_sn={orderSn}";

        var resp = await http.GetAsync(url);
        var body = await resp.Content.ReadAsStringAsync();
        Console.WriteLine("  [logistics/get_tracking_number]:");
        Console.WriteLine("  " + FormatJson(body));
    }

    // 2. get_order_detail (shipping_carrier, tracking_number)
    {
        var ts      = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var apiPath = "/api/v2/order/get_order_detail";
        var sign    = SignShop(PARTNER_KEY, PARTNER_ID, apiPath, ts, ACCESS_TOKEN, SHOP_ID);
        var url     = $"{API_BASE_URL}{apiPath}?partner_id={PARTNER_ID}&timestamp={ts}&access_token={ACCESS_TOKEN}&shop_id={SHOP_ID}&sign={sign}&order_sn_list={orderSn}&response_optional_fields=shipping_carrier,package_list";

        var resp = await http.GetAsync(url);
        var body = await resp.Content.ReadAsStringAsync();
        Console.WriteLine("  [order/get_order_detail (package_list)]:");
        Console.WriteLine("  " + FormatJson(body));
    }

    Console.WriteLine(new string('-', 60));
}

static string SignShop(string key, long partnerId, string path, long ts, string token, long shopId)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
    var baseStr = $"{partnerId}{path}{ts}{token}{shopId}";
    return BitConverter.ToString(hmac.ComputeHash(Encoding.UTF8.GetBytes(baseStr))).Replace("-", "").ToLowerInvariant();
}

static string FormatJson(string json)
{
    try { return JsonSerializer.Serialize(JsonDocument.Parse(json), new JsonSerializerOptions { WriteIndented = true }); }
    catch { return json; }
}
