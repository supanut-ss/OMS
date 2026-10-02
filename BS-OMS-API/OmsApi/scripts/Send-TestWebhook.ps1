<#
.SYNOPSIS
  Send a signed marketplace webhook request to a local OMS API.
.EXAMPLE
  ./Send-TestWebhook.ps1 -Platform shopee -OrderId 220810QXVJM3EX -ShopId 1274495
  ./Send-TestWebhook.ps1 -Platform lazada -OrderId 260422900198363 -Status unpaid
  ./Send-TestWebhook.ps1 -Platform tiktok -OrderId 576461413038785752 -Status ON_HOLD
  ./Send-TestWebhook.ps1 -Platform shopee -OrderId X -BadSignature   # expect rejection
#>
param(
    [Parameter(Mandatory)][ValidateSet('shopee', 'lazada', 'tiktok')][string]$Platform,
    [Parameter(Mandatory)][string]$OrderId,
    [string]$ShopId = '1000001',
    [string]$Status = '',
    [string]$BaseUrl = 'https://localhost:53954',
    [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env'),
    [switch]$BadSignature
)

# Load KEY=VALUE pairs from .env without overriding existing process variables
if (Test-Path $EnvFile) {
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$' -and $line -notmatch '^\s*#') {
            if (-not [Environment]::GetEnvironmentVariable($Matches[1])) {
                [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim('"'))
            }
        }
    }
}

function Get-Cfg([string[]]$Names) {
    foreach ($n in $Names) {
        $v = [Environment]::GetEnvironmentVariable($n)
        if ($v) { return $v }
    }
    throw "Missing env var: $($Names -join ' or ')"
}

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

switch ($Platform) {
    'shopee' {
        if (-not $Status) { $Status = 'READY_TO_SHIP' }
        $body = @{ code = 3; shop_id = [long]$ShopId; timestamp = $now
                   data = @{ ordersn = $OrderId; status = $Status; update_time = $now } } | ConvertTo-Json -Compress -Depth 5
        $prefix = Get-Cfg 'SHOPEE_WEBHOOK_URL'   # must match URL registered in Shopee console
        $key = Get-Cfg 'SHOPEE_PARTNER_KEY', 'SHOPEE_WEBHOOK_SECRET'
    }
    'lazada' {
        if (-not $Status) { $Status = 'unpaid' }
        $body = @{ seller_id = $ShopId; message_type = 0; timestamp = $now * 1000; site = 'lazada_th'
                   data = @{ order_status = $Status; trade_order_id = $OrderId; status_update_time = $now } } | ConvertTo-Json -Compress -Depth 5
        $prefix = Get-Cfg 'LAZADA_APP_KEY'
        $key = Get-Cfg 'LAZADA_APP_SECRET', 'LAZADA_WEBHOOK_SECRET'
    }
    'tiktok' {
        if (-not $Status) { $Status = 'AWAITING_SHIPMENT' }
        $body = @{ type = 1; shop_id = $ShopId; tts_notification_id = [string]$now; timestamp = $now
                   data = @{ order_id = $OrderId; order_status = $Status; update_time = $now } } | ConvertTo-Json -Compress -Depth 5
        $prefix = Get-Cfg 'TIKTOK_APP_KEY'
        $key = Get-Cfg 'TIKTOK_APP_SECRET', 'TIKTOK_WEBHOOK_SECRET'
    }
}

# HMAC-SHA256 over (prefix + exact raw body bytes), lowercase hex
$bodyBytes = [Text.Encoding]::UTF8.GetBytes($body)
$signingInput = [Text.Encoding]::UTF8.GetBytes($prefix) + $bodyBytes
$hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($key))
$signature = -join ($hmac.ComputeHash($signingInput) | ForEach-Object { $_.ToString('x2') })
if ($BadSignature) { $signature = '0' * 64 }

# The API redirects HTTP to HTTPS and a redirect drops the Authorization header,
# so use HTTPS and accept the local dev certificate (localhost only).
if ($BaseUrl -match '^https://(localhost|127\.0\.0\.1)') {
    Add-Type -TypeDefinition 'using System.Net;using System.Security.Cryptography.X509Certificates;public class TrustLocal:ICertificatePolicy{public bool CheckValidationResult(ServicePoint s,X509Certificate c,WebRequest r,int p){return true;}}' -ErrorAction SilentlyContinue
    [Net.ServicePointManager]::CertificatePolicy = New-Object TrustLocal
}
$url = "$BaseUrl/api/webhooks/$Platform"
Write-Host "POST $url"
Write-Host "Body: $body"

try {
    $resp = Invoke-WebRequest -Uri $url -Method Post -Body $bodyBytes -ContentType 'application/json' `
        -Headers @{ Authorization = $signature } -UseBasicParsing
    Write-Host "HTTP $($resp.StatusCode): $($resp.Content)" -ForegroundColor Green
}
catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "HTTP ${code}: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}
