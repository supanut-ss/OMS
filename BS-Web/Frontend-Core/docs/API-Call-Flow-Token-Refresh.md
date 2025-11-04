# BSDataGrid API Call Flow with Token Refresh

## 📊 Overview

ระบบนี้แก้ปัญหาการ call API หลายเส้นพร้อมกันใน BSDataGrid และการ refresh token ที่ทับซ้อนกัน

## 🎯 Problem Solved

### ปัญหาเดิม:

1. **BSDataGrid call API หลายเส้นพร้อมกัน** (metadata + data)
2. **เมื่อ token expired ทั้ง 2 เส้น fail 401 พร้อมกัน**
3. **Refresh token ถูกเรียกหลายครั้งซ้อนกัน**
4. **ผู้ใช้ถูกเด้งออกจากระบบ**

### Solution:

✅ **Token Refresh Lock Mechanism** - ป้องกัน refresh token ซ้ำซ้อน
✅ **Failed Request Queue** - เก็บ requests ที่ fail ไว้ retry ภายหลัง
✅ **Auto Retry** - retry requests ที่ fail หลัง refresh สำเร็จ
✅ **Single Logout** - redirect ไป login ครั้งเดียวเมื่อ refresh fail

## 🔄 Complete Flow Diagram

### 📍 Main Flow: BSDataGrid API Call with Token Refresh

```mermaid
flowchart TD
    Start[🎯 BSDataGrid Component] --> UseEffect[⚡ useEffect triggers:<br/>1. loadMetadata<br/>2. loadData/loadStoredProcedureData]
    UseEffect --> Hook[🎣 useDynamicCrud Hook<br/>getTableData / executeEnhancedSP]
    Hook --> Axios[📡 AxiosMaster.post / get]
    Axios --> ReqInterceptor[🔑 Request Interceptor<br/>Add Authorization Header]
    ReqInterceptor --> API{🌐 API Call}

    API -->|✅ Success 200| ReturnData[📦 Return Data to BSDataGrid]
    API -->|❌ Error 401| ResInterceptor[⚠️ Response Interceptor<br/>Catches 401]

    ResInterceptor --> CheckRetry{🔍 Already retried?<br/>_retry flag}
    CheckRetry -->|YES ❌| Reject[🚫 Reject Promise]
    CheckRetry -->|NO ✅| SetRetry[✏️ Set _retry = true]

    SetRetry --> CallRefresh[📞 Call TokenRefreshManager.refreshToken]
    CallRefresh --> CheckLock{🔒 isRefreshing?<br/>LOCK CHECK}

    CheckLock -->|YES 🔒| Queue[⏳ Queue in failedQueue<br/>Return Promise]
    CheckLock -->|NO 🔓| AcquireLock[🔒 Set isRefreshing = true<br/>LOCK ACQUIRED]

    AcquireLock --> RefreshAPI[🔄 Call Refresh API<br/>POST /refresh]
    RefreshAPI --> RefreshResult{❓ Refresh Success?}

    RefreshResult -->|YES ✅| SaveTokens[💾 Save new tokens<br/>to SecureStorage]
    RefreshResult -->|NO ❌| ProcessError[⚠️ processQueue with error]

    SaveTokens --> ProcessSuccess[✅ processQueue with new token<br/>Resolve all queued promises]
    ProcessError --> ClearTokens[🗑️ clearTokens]
    ClearTokens --> Redirect[🚪 redirectToLogin<br/>User logs out ONCE]

    ProcessSuccess --> ReleaseLock[🔓 Set isRefreshing = false<br/>LOCK RELEASED]
    Queue --> WaitForProcess[⏳ Wait for processQueue]
    WaitForProcess --> ReleaseLock

    ReleaseLock --> ReturnToken[🎟️ Return new token]
    ReturnToken --> UpdateHeader[🔄 Update Authorization header<br/>with new token]
    UpdateHeader --> RetryRequest[🔁 Retry original request<br/>AxiosMaster originalRequest]
    RetryRequest --> ReturnData

    Redirect --> End[🏁 End]
    ReturnData --> End
    Reject --> End

    style Start fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style AcquireLock fill:#fff9c4,stroke:#f57f17,stroke-width:3px
    style ReleaseLock fill:#c8e6c9,stroke:#388e3c,stroke-width:3px
    style Queue fill:#ffe0b2,stroke:#f57c00,stroke-width:2px
    style Redirect fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style ReturnData fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style CheckLock fill:#fff9c4,stroke:#f57f17,stroke-width:2px
```

### 🔐 Token Refresh Lock Mechanism Detail

```mermaid
sequenceDiagram
    participant API1 as 📡 API Call 1
    participant API2 as 📡 API Call 2
    participant Interceptor as ⚙️ Response Interceptor
    participant TRM as 🔐 TokenRefreshManager
    participant Queue as 📋 failedQueue[]
    participant RefreshAPI as 🔄 Refresh API

    Note over API1,API2: ⚡ Both calls happen simultaneously

    API1->>Interceptor: ❌ Gets 401 Error (t=0ms)
    API2->>Interceptor: ❌ Gets 401 Error (t=5ms)

    rect rgb(255, 249, 196)
    Note over Interceptor,TRM: 🔒 LOCK ACQUISITION
    Interceptor->>TRM: refreshToken() for Call 1
    TRM->>TRM: ✅ Check: isRefreshing = false
    TRM->>TRM: 🔒 Set isRefreshing = true
    Note over TRM: LOCK ACQUIRED by Call 1
    end

    rect rgb(255, 224, 178)
    Note over Interceptor,Queue: ⏳ QUEUEING MECHANISM
    Interceptor->>TRM: refreshToken() for Call 2
    TRM->>TRM: ⚠️ Check: isRefreshing = true
    TRM->>Queue: ➕ Add Call 2 promise to queue
    Note over Queue: Call 2 waits here
    end

    rect rgb(232, 245, 233)
    Note over TRM,RefreshAPI: 🔄 REFRESH TOKEN
    TRM->>RefreshAPI: POST /api/refresh
    RefreshAPI-->>TRM: ✅ New access + refresh tokens
    TRM->>TRM: 💾 Save new tokens to SecureStorage
    end

    rect rgb(232, 234, 246)
    Note over TRM,Queue: ✅ PROCESS QUEUE
    TRM->>Queue: processQueue(null, newToken)
    Queue-->>Interceptor: Resolve Call 1 with newToken
    Queue-->>Interceptor: Resolve Call 2 with newToken
    end

    rect rgb(200, 230, 201)
    Note over TRM: 🔓 LOCK RELEASE
    TRM->>TRM: 🔓 Set isRefreshing = false
    Note over TRM: LOCK RELEASED
    end

    rect rgb(187, 222, 251)
    Note over Interceptor,API2: 🔁 RETRY WITH NEW TOKEN
    Interceptor->>API1: Retry with new Authorization header
    Interceptor->>API2: Retry with new Authorization header
    API1-->>Interceptor: ✅ Success 200
    API2-->>Interceptor: ✅ Success 200
    end
```

## 🔒 Token Refresh Lock Mechanism

### Key Components:

1. **isRefreshing** (boolean)

   - Lock flag to prevent multiple simultaneous refreshes
   - Set to `true` when refresh starts
   - Set to `false` when refresh completes

2. **failedQueue** (array)

   - Stores { resolve, reject } promises
   - All 401 requests during refresh are queued here
   - Processed after refresh completes

3. **processQueue(error, token)**
   - Resolves or rejects all queued promises
   - Called after refresh success/failure

## 📝 Implementation Details

### 1. TokenRefreshManager.js

\`\`\`javascript
class TokenRefreshManager {
constructor() {
this.isRefreshing = false; // Lock flag
this.failedQueue = []; // Request queue
}

async refreshToken() {
// 🔒 Check if already refreshing
if (this.isRefreshing) {
// Queue this request
return new Promise((resolve, reject) => {
this.failedQueue.push({ resolve, reject });
});
}

    // 🔐 Acquire lock
    this.isRefreshing = true;

    try {
      // Refresh token API call
      const newToken = await callRefreshAPI();

      // ✅ Process all queued requests with success
      this.processQueue(null, newToken);

      return newToken;
    } catch (error) {
      // ❌ Process all queued requests with error
      this.processQueue(error, null);
      throw error;
    } finally {
      // 🔓 Release lock
      this.isRefreshing = false;
    }

}
}
\`\`\`

### 2. AxiosMaster.js Response Interceptor

\`\`\`javascript
AxiosMaster.interceptors.response.use(
response => response,
async (error) => {
const originalRequest = error.config;

    // Only handle 401 and only retry once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Use TokenRefreshManager (with lock)
        const newToken = await TokenRefreshManager.refreshToken();

        // Update request with new token
        originalRequest.headers['Authorization'] = \`Bearer \${newToken}\`;

        // Retry original request
        return AxiosMaster(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);

}
);
\`\`\`

## 🎬 Usage Scenarios

### Scenario 1: Single 401 Error

\`\`\`
Timeline:
0ms → API Call 1 starts
100ms → API Call 1 gets 401
101ms → TokenRefreshManager.refreshToken() called
102ms → isRefreshing = true (LOCK)
200ms → Refresh API returns new token
201ms → Save new tokens
202ms → processQueue() - no queued requests
203ms → isRefreshing = false (UNLOCK)
204ms → API Call 1 retries with new token
300ms → API Call 1 succeeds ✅
\`\`\`

### Scenario 2: Multiple 401 Errors (Your Case)

\`\`\`
Timeline:
0ms → API Call 1 (metadata) starts
5ms → API Call 2 (data) starts
100ms → API Call 1 gets 401
101ms → TokenRefreshManager.refreshToken() called for Call 1
102ms → isRefreshing = true (LOCK) 🔒
105ms → API Call 2 gets 401
106ms → TokenRefreshManager.refreshToken() called for Call 2
107ms → isRefreshing = true already! → Queue Call 2
200ms → Refresh API returns new token
201ms → Save new tokens
202ms → processQueue(null, newToken): - Call 1's promise resolves with newToken - Call 2's promise resolves with newToken
203ms → isRefreshing = false (UNLOCK) 🔓
204ms → API Call 1 retries with new token
205ms → API Call 2 retries with new token
300ms → Both calls succeed ✅✅
\`\`\`

### Scenario 3: Refresh Token Failed

\`\`\`
Timeline:
0ms → API Call 1 gets 401
1ms → API Call 2 gets 401
2ms → TokenRefreshManager.refreshToken() called for Call 1
3ms → isRefreshing = true (LOCK)
4ms → TokenRefreshManager.refreshToken() called for Call 2 → Queued
100ms → Refresh API fails (refresh token expired)
101ms → processQueue(error, null): - Call 1's promise rejects - Call 2's promise rejects
102ms → clearTokens() called once
103ms → redirectToLogin() called once
104ms → User redirected to login (ONCE) ✅
\`\`\`

## ✅ Benefits

1. **No Duplicate Refresh Requests**

   - Only one refresh happens at a time
   - Saves API calls and prevents rate limiting

2. **All Failed Requests Auto-Retry**

   - No need to manually refresh page
   - Seamless user experience

3. **Single Logout**

   - User redirected to login only once
   - No multiple alert dialogs

4. **Race Condition Safe**
   - Lock mechanism prevents concurrent refreshes
   - Queue ensures all requests are handled

## 🧪 Testing

### Test Case 1: Verify Lock Works

\`\`\`javascript
// In browser console
const status = TokenRefreshManager.getQueueStatus();
console.log(status);
// Expected: { isRefreshing: false, queueLength: 0 }
\`\`\`

### Test Case 2: Simulate Multiple 401s

1. Open Network tab in DevTools
2. Navigate to a page with BSDataGrid
3. Wait for token to expire (or manually delete token)
4. Refresh page
5. Observe:
   - Only 1 refresh API call
   - Multiple retries with new token
   - ✅ No multiple login redirects

### Test Case 3: Refresh Token Expired

1. Delete refresh_token from localStorage
2. Make an API call
3. Observe:
   - Single redirect to login
   - Clean error handling

## 📚 Files Modified

1. ✅ **TokenRefreshManager.js** (NEW)

   - Token refresh logic with lock
   - Failed request queue management

2. ✅ **AxiosMaster.js** (UPDATED)

   - Uses TokenRefreshManager
   - Implements retry logic
   - Removed duplicate refresh code

3. ✅ **useDynamicCrud.js** (NO CHANGES NEEDED)

   - Works automatically with updated AxiosMaster

4. ✅ **BSDataGrid.js** (NO CHANGES NEEDED)
   - Benefits from improved API handling

## 🎯 Summary

Before:

- ❌ Multiple token refreshes
- ❌ Race conditions
- ❌ Multiple login redirects
- ❌ Poor user experience

After:

- ✅ Single token refresh with lock
- ✅ Queue mechanism for failed requests
- ✅ Auto retry with new token
- ✅ Single login redirect
- ✅ Seamless user experience
