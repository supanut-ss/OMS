# 🚪 Ocelot API Gateway Configuration for BS-Platform

## 📋 ภาพรวม

เอกสารนี้อธิบายการตั้งค่า Ocelot API Gateway สำหรับ BS-Platform โดยจะรวม routing สำหรับ DynamicController และ Authentication endpoints

---

## 🏗️ สถาปัตยกรรม Gateway

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 Client Applications                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Web Browser │ │ Mobile App  │ │    Third-party Apps     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               🚪 Ocelot API Gateway (Port 8080)             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 Request Routing                         │ │
│  │  • Authentication: /gateway/v1/api/login               │ │
│  │  • Dynamic CRUD: /gateway/v1/api/dynamic/*             │ │
│  │  │  • Rate Limiting   • Load Balancing                 │ │
│  │  • Security Headers  • CORS                            │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│    🔐 Authentication API    │ │      🎯 BS-API-Core        │
│       (Port 8080)           │ │       (Port 8080)          │
│  • Login/Logout             │ │  • DynamicController       │
│  • Token Management        │ │  • AutoCompleteController  │
│  • User Management         │ │  • Database Operations     │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 🎯 Dynamic Controller Routes

### 📊 **DataGrid Operations**

| Endpoint                   | Gateway Route                         | Method | Purpose              |
| -------------------------- | ------------------------------------- | ------ | -------------------- |
| `/api/dynamic/datagrid`    | `/gateway/v1/api/dynamic/datagrid`    | POST   | Standard DataGrid    |
| `/api/dynamic/bs-datagrid` | `/gateway/v1/api/dynamic/bs-datagrid` | POST   | BS Platform DataGrid |
| `/api/dynamic/combobox`    | `/gateway/v1/api/dynamic/combobox`    | POST   | ComboBox Data        |

### 🔧 **CRUD Operations**

| Endpoint                          | Gateway Route                                | Method | Purpose       |
| --------------------------------- | -------------------------------------------- | ------ | ------------- |
| `/api/dynamic/create`             | `/gateway/v1/api/dynamic/create`             | POST   | Create Record |
| `/api/dynamic/update`             | `/gateway/v1/api/dynamic/update`             | POST   | Update Record |
| `/api/dynamic/delete`             | `/gateway/v1/api/dynamic/delete`             | POST   | Delete Record |
| `/api/dynamic/record/{tableName}` | `/gateway/v1/api/dynamic/record/{tableName}` | POST   | Get Record    |

### 📦 **Bulk Operations**

| Endpoint                   | Gateway Route                         | Method | Rate Limit | Purpose     |
| -------------------------- | ------------------------------------- | ------ | ---------- | ----------- |
| `/api/dynamic/bulk-create` | `/gateway/v1/api/dynamic/bulk-create` | POST   | 10/10s     | Bulk Create |
| `/api/dynamic/bulk-update` | `/gateway/v1/api/dynamic/bulk-update` | POST   | 10/10s     | Bulk Update |
| `/api/dynamic/bulk-delete` | `/gateway/v1/api/dynamic/bulk-delete` | POST   | 10/10s     | Bulk Delete |

### 🗄️ **Schema & Metadata**

| Endpoint                            | Gateway Route                                  | Method | Purpose            |
| ----------------------------------- | ---------------------------------------------- | ------ | ------------------ |
| `/api/dynamic/schema`               | `/gateway/v1/api/dynamic/schema`               | POST   | Get DB Schema      |
| `/api/dynamic/metadata/{tableName}` | `/gateway/v1/api/dynamic/metadata/{tableName}` | GET    | Table Metadata     |
| `/api/dynamic/exists/{tableName}`   | `/gateway/v1/api/dynamic/exists/{tableName}`   | GET    | Check Table Exists |

### 🔍 **Advanced Operations**

| Endpoint                                          | Gateway Route                                                | Method | Rate Limit | Purpose      |
| ------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- | ------------ |
| `/api/dynamic/procedure/{procedureName}`          | `/gateway/v1/api/dynamic/procedure/{procedureName}`          | POST   | 20/10s     | Execute SP   |
| `/api/dynamic/procedure-metadata/{procedureName}` | `/gateway/v1/api/dynamic/procedure-metadata/{procedureName}` | GET    | -          | SP Metadata  |
| `/api/dynamic/query`                              | `/gateway/v1/api/dynamic/query`                              | POST   | 20/10s     | Custom Query |

---

## 🔒 Security Configuration

### 🛡️ **Authentication Requirements**

ทุก DynamicController endpoints ต้องมี JWT Bearer Token:

```json
"AuthenticationOptions": {
  "AuthenticationProviderKey": "Bearer",
  "AllowedScopes": []
}
```

### ⚡ **Rate Limiting**

การจำกัดการเรียก API เพื่อป้องกัน abuse:

| Operation Type      | Rate Limit   | Period     | Purpose           |
| ------------------- | ------------ | ---------- | ----------------- |
| DataGrid Operations | 100 requests | 1 second   | Fast UI updates   |
| CRUD Operations     | 50 requests  | 1 second   | Normal operations |
| Bulk Operations     | 10 requests  | 10 seconds | Heavy operations  |
| Schema Operations   | 50 requests  | 10 seconds | Metadata queries  |
| Advanced Operations | 20 requests  | 10 seconds | Complex queries   |

---

## 🚀 การใช้งาน

### 1. **Frontend API Calls**

```javascript
// ใช้งานผ่าน Gateway
const apiBaseUrl = "http://localhost:8080/gateway/v1/api";

// DataGrid Request
const response = await fetch(`${apiBaseUrl}/dynamic/bs-datagrid`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    tableName: "t_customer",
    page: 1,
    pageSize: 25,
  }),
});

// ComboBox Request
const comboResponse = await fetch(`${apiBaseUrl}/dynamic/combobox`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    tableName: "t_customer_status",
    valueField: "id",
    displayField: "name",
  }),
});
```

### 2. **useDynamicCrud Hook Integration**

```javascript
// hooks/useDynamicCrud.js
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080/gateway/v1/api";

export const useDynamicCrud = () => {
  const fetchDataGrid = async (request) => {
    const response = await apiClient.post("/dynamic/bs-datagrid", request);
    return response.data;
  };

  const fetchComboBox = async (request) => {
    const response = await apiClient.post("/dynamic/combobox", request);
    return response.data;
  };

  const bulkCreate = async (tableName, dataItems) => {
    const response = await apiClient.post("/dynamic/bulk-create", {
      tableName,
      dataItems,
    });
    return response.data;
  };

  return {
    fetchDataGrid,
    fetchComboBox,
    bulkCreate,
    // ... other methods
  };
};
```

### 3. **Docker Configuration**

```yaml
# docker-compose.yml
services:
  api-gateway:
    image: bs-platform/api-gateway
    ports:
      - "8080:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    depends_on:
      - auth-api
      - core-api
    networks:
      - bs-platform-network

  auth-api:
    image: bs-platform/auth-api
    container_name: auth_api
    networks:
      - bs-platform-network

  core-api:
    image: bs-platform/core-api
    container_name: bs_core_api
    networks:
      - bs-platform-network

networks:
  bs-platform-network:
    driver: bridge
```

---

## 📊 Monitoring และ Logging

### 📈 **Rate Limiting Monitoring**

```json
// Rate limit headers ที่ Gateway จะส่งกลับ
{
  "X-Rate-Limit-Limit": "100",
  "X-Rate-Limit-Remaining": "95",
  "X-Rate-Limit-Reset": "1640995200"
}
```

### 📝 **Logging Configuration**

```json
// appsettings.json for Gateway
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Ocelot": "Debug",
      "Microsoft": "Warning"
    }
  },
  "Ocelot": {
    "EnableDetailedLogging": true,
    "LogHeaders": true
  }
}
```

### 🔍 **Health Check Endpoints**

```bash
# Check Gateway Health
GET /gateway/health

# Check Service Discovery
GET /gateway/configuration

# Check Rate Limits Status
GET /gateway/rate-limits
```

---

## 🛠️ Configuration Details

### 🎯 **Service Discovery**

```json
{
  "GlobalConfiguration": {
    "BaseUrl": "http://172.19.0.1:8080",
    "ServiceDiscoveryProvider": {
      "Host": "consul",
      "Port": 8500
    }
  }
}
```

### 🔄 **Load Balancing**

```json
{
  "LoadBalancerOptions": {
    "Type": "RoundRobin"
  }
}
```

### 🛡️ **CORS Configuration**

```json
{
  "GlobalConfiguration": {
    "RequestIdKey": "OcRequestId",
    "AdministrationPath": "/administration"
  }
}
```

---

## 🚨 Error Handling

### 📋 **Common Error Responses**

```json
// Rate Limit Exceeded
{
  "status": 429,
  "message": "Rate limit exceeded. Try again later.",
  "retryAfter": "10"
}

// Authentication Required
{
  "status": 401,
  "message": "Authentication required. Please provide valid JWT token."
}

// Service Unavailable
{
  "status": 503,
  "message": "Service temporarily unavailable. Please try again later."
}
```

### 🔧 **Troubleshooting**

1. **Rate Limit Issues**:

   - ตรวจสอบ rate limit headers
   - ปรับ request frequency
   - ใช้ batch operations สำหรับ bulk data

2. **Authentication Issues**:

   - ตรวจสอบ JWT token validity
   - ตรวจสอบ token expiration
   - Refresh token ถ้าจำเป็น

3. **Service Discovery Issues**:
   - ตรวจสอบ container network connectivity
   - ตรวจสอบ service names ใน Docker Compose
   - ตรวจสอบ health check endpoints

---

## 📚 Related Documentation

- [DynamicController API Documentation](../BS-API-Core/docs/DynamicController-API.md)
- [BSDataGrid Integration Guide](../BS-Web/Frontend-Core/docs/BSDataGrid-Integration.md)
- [Authentication Service Guide](./Authentication/README.md)
- [Docker Deployment Guide](../BS-API-Core/ApiCore/DOCKER.md)

---

## 🔮 Future Enhancements

### Phase 1: Enhanced Security

- [ ] JWT refresh token rotation
- [ ] API key authentication for service-to-service
- [ ] Request/response encryption
- [ ] Advanced rate limiting per user/role

### Phase 2: Performance Optimization

- [ ] Response caching
- [ ] Request compression
- [ ] Connection pooling
- [ ] Load balancing algorithms

### Phase 3: Enterprise Features

- [ ] Service mesh integration
- [ ] Distributed tracing
- [ ] Advanced monitoring
- [ ] Multi-tenant support

---

**🚪 BS-Platform Ocelot Gateway** | **Version 1.0** | **September 2025**

_Configured for production-ready enterprise API gateway with comprehensive security and performance features._
