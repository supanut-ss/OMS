# 🔒 Quick Fix Guide for 401 Unauthorized Error

## 🚨 Problem: JWT Token Valid but Still Getting 401

You're seeing:

```
🔑 Added Authorization header: Bearer eyJhbGciOiJIUzI1NiIs...
📡 API Request: POST /autocomplete
❌ POST http://10.60.10.104:8080/gateway/v1/api/autocomplete 401 (Unauthorized)
```

## 🔧 Immediate Debug Steps

### Step 1: Test in Browser Console

```javascript
// Open DevTools (F12) and run:
APITester.testAutocomplete();
```

### Step 2: Check Token Details

```javascript
// Check if token is expired or malformed:
JWTDebugger.checkTokens();
```

### Step 3: Test Other Endpoints

```javascript
// See if problem is specific to autocomplete:
APITester.runFullDiagnostic();
```

## 🔍 Common Causes & Solutions

### Cause 1: Token Expired

**Symptoms**: Token shows as expired in JWTDebugger
**Solution**:

```javascript
// Force refresh token
JWTDebugger.clearAllTokens();
// Then re-login
```

### Cause 2: Backend Service Down

**Symptoms**: Gateway can't reach `bs_core_api:8080`
**Solution**:

```bash
# Check if docker services are running
docker-compose ps

# Restart backend services
docker-compose up -d bs_core_api
```

### Cause 3: Gateway Authentication Middleware Issue

**Symptoms**: Other endpoints also fail with 401
**Solution**:

1. Check Gateway logs
2. Restart Gateway service:

```bash
docker-compose restart api_gateway
```

### Cause 4: Token Format Issue

**Symptoms**: Token exists but backend rejects it
**Solution**:

```javascript
// Check token structure
const token = localStorage.getItem("token");
console.log("Token parts:", token.split(".").length); // Should be 3

// Try to decode payload
const payload = JSON.parse(atob(token.split(".")[1]));
console.log("Payload:", payload);
```

### Cause 5: CORS or Proxy Issues

**Symptoms**: Network errors or preflight failures
**Solution**: Check network tab for CORS errors

## 🛠️ Specific Fixes

### Fix 1: Reset Authentication

```javascript
// Complete auth reset
JWTDebugger.clearAllTokens();
window.location.href = "/login";
```

### Fix 2: Manual Token Test

```javascript
// Set a test token (development only)
JWTDebugger.setDummyToken();
APITester.testAutocomplete();
```

### Fix 3: Check Service Health

```javascript
// Test Gateway health
APITester.testGatewayHealth();
```

## 🔄 Backend Service Check

### Docker Services Status

```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs bs_core_api
docker-compose logs api_gateway
```

### Gateway Configuration

Ensure in `ocelot.json`:

```json
{
  "DownstreamPathTemplate": "/autocomplete",
  "UpstreamPathTemplate": "/gateway/v1/api/autocomplete",
  "AuthenticationOptions": {
    "AuthenticationProviderKey": "Bearer",
    "AllowedScopes": []
  }
}
```

## 📊 Debug Output Analysis

### Good Token Debug:

```
🔑 JWT Token check: Token exists
🔑 Token preview: eyJhbGciOiJIUzI1NiIs...
⏰ Token Info: expires: 2025-09-26 15:00:00, isExpired: ✅ VALID
```

### Bad Token Debug:

```
🔑 JWT Token check: No token found
// OR
⏰ Token Info: isExpired: ❌ EXPIRED
```

## 💡 Pro Tips

### 1. Live Monitoring

```javascript
// Monitor all API calls in real-time
window.addEventListener("beforeunload", () => {
  console.log("🔍 Final token status:");
  JWTDebugger.checkTokens();
});
```

### 2. Automatic Recovery

The system should auto-refresh tokens, but if not working:

```javascript
// Force a refresh attempt
APITester.testTokenRefresh();
```

### 3. Service Dependencies

Check the flow: `Frontend → Gateway → bs_core_api`

- If Gateway is down: Connection refused
- If bs_core_api is down: 502 Bad Gateway
- If auth is wrong: 401 Unauthorized

## 🚨 Emergency Recovery

If nothing works:

```javascript
// Nuclear option - clear everything and restart
JWTDebugger.clearAllTokens();
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

---

**Quick Command**: `APITester.testAutocomplete()` 🚀
