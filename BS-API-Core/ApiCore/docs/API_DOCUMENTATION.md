# 📖 API Documentation

## 🌐 **API Base Information**

- **Base URL**: `https://localhost:7140` (Development)
- **API Version**: v1.0
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`
- **Swagger UI**: `https://localhost:7140/swagger`

---

## 🔐 **Authentication**

### **获取 JWT Token**

```http
POST /api/Auth/login
Content-Type: application/json

{
  "username": "demo@example.com",
  "password": "Demo123!"
}
```

**Response:**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600
  },
  "success": true,
  "message": "Login successful"
}
```

### **การใช้ Token**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👥 **Customer API**

### **📋 Get Customer Summary**

```http
GET /api/Customers/summary
Authorization: Bearer {token}
```

**Response:**

```json
{
  "data": [
    {
      "id": "cust-001",
      "code": "CUST001",
      "name": "Demo Customer",
      "email": "demo@customer.com",
      "phone": "02-123-4567"
    }
  ],
  "success": true,
  "message": "Data retrieved successfully"
}
```

### **📊 Get Customer DataGrid**

```http
POST /api/Customers/datagrid
Authorization: Bearer {token}
Content-Type: application/json

{
  "page": 0,
  "pageSize": 10,
  "sortField": "name",
  "sortDir": "asc",
  "filters": {
    "name": "Demo",
    "isActive": "YES"
  }
}
```

**Response:**

```json
{
  "rows": [
    {
      "id": "cust-001",
      "code": "CUST001",
      "name": "Demo Customer",
      "email": "demo@customer.com",
      "phone": "02-123-4567",
      "address": "123 Demo Street",
      "isActive": "YES",
      "createDate": "2024-01-01T00:00:00Z"
    }
  ],
  "rowCount": 58,
  "success": true,
  "message": "Data retrieved successfully",
  "metadata": {
    "start": 0,
    "end": 10,
    "pageSize": 10,
    "currentPage": 1,
    "totalPages": 6,
    "queryExecutionTimeMs": 32
  }
}
```

### **🔍 Get Customer by ID**

```http
GET /api/Customers/{id}
Authorization: Bearer {token}
```

### **➕ Create Customer**

```http
POST /api/Customers
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "CUST002",
  "name": "New Customer",
  "description": "Customer description",
  "email": "new@customer.com",
  "phone": "02-987-6543",
  "address": "456 New Street",
  "city": "Bangkok",
  "province": "Bangkok",
  "postalCode": "10200",
  "createBy": "admin"
}
```

### **✏️ Update Customer**

```http
PUT /api/Customers/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "id": "cust-001",
  "code": "CUST001",
  "name": "Updated Customer",
  "description": "Updated description",
  "email": "updated@customer.com",
  "phone": "02-111-2222",
  "address": "789 Updated Street",
  "city": "Bangkok",
  "province": "Bangkok",
  "postalCode": "10300",
  "isActive": "YES",
  "updateBy": "admin"
}
```

### **🗑️ Delete Customer**

```http
DELETE /api/Customers/{id}
Authorization: Bearer {token}
```

---

## 📋 **Project API**

### **📋 Get Project Summary**

```http
GET /api/Projects/summary
Authorization: Bearer {token}
```

### **📊 Get Project DataGrid**

```http
POST /api/Projects/datagrid
Authorization: Bearer {token}
Content-Type: application/json

{
  "page": 0,
  "pageSize": 10,
  "sortField": "projectNo",
  "sortDir": "asc",
  "filters": {
    "status": "ACTIVE",
    "customerId": "cust-001"
  }
}
```

### **🔍 Get Projects by Customer**

```http
GET /api/Projects/customer/{customerId}
Authorization: Bearer {token}
```

**Response:**

```json
{
  "data": [
    {
      "id": "proj-001",
      "projectNo": "PRJ001",
      "title": "Demo Project",
      "description": "Project description",
      "customerId": "cust-001",
      "customerName": "Demo Customer",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T00:00:00Z",
      "status": "ACTIVE",
      "budget": 100000.0,
      "estimatedHours": 500.0,
      "projectManager": "John Doe"
    }
  ],
  "success": true,
  "message": "Projects retrieved successfully"
}
```

### **➕ Create Project**

```http
POST /api/Projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "projectNo": "PRJ002",
  "title": "New Project",
  "description": "New project description",
  "customerId": "cust-001",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-08-31T00:00:00Z",
  "budget": 150000.00,
  "estimatedHours": 750.0,
  "projectManager": "Jane Smith",
  "createBy": "admin"
}
```

---

## ⏰ **TimeEntry API**

### **📋 Get TimeEntry Summary**

```http
GET /api/TimeEntries/summary
Authorization: Bearer {token}
```

### **📊 Get TimeEntry DataGrid**

```http
POST /api/TimeEntries/datagrid
Authorization: Bearer {token}
Content-Type: application/json

{
  "page": 0,
  "pageSize": 10,
  "sortField": "workDate",
  "sortDir": "desc",
  "filters": {
    "projectId": "proj-001",
    "status": "APPROVED"
  }
}
```

### **🔍 Get TimeEntries by Project**

```http
GET /api/TimeEntries/project/{projectId}
Authorization: Bearer {token}
```

### **📅 Get TimeEntries by Date Range**

```http
GET /api/TimeEntries/daterange?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

### **📊 Get TimeEntry Report**

```http
GET /api/TimeEntries/report?startDate=2024-01-01&endDate=2024-01-31&projectId=proj-001
Authorization: Bearer {token}
```

**Response:**

```json
{
  "data": [
    {
      "customerName": "Demo Customer",
      "projectNo": "PRJ001",
      "projectTitle": "Demo Project",
      "workDate": "2024-01-15T00:00:00Z",
      "hours": 8.0,
      "taskName": "Development",
      "assignedTo": "John Developer",
      "status": "APPROVED"
    }
  ],
  "success": true,
  "message": "Report generated successfully"
}
```

### **➕ Create TimeEntry**

```http
POST /api/TimeEntries
Authorization: Bearer {token}
Content-Type: application/json

{
  "projectId": "proj-001",
  "workDate": "2024-01-15T00:00:00Z",
  "hours": 8.0,
  "taskName": "Development Work",
  "taskDescription": "Implementing new features",
  "taskType": "Development",
  "assignedTo": "John Developer",
  "createBy": "admin"
}
```

---

## 📊 **DataGrid Request Format**

### **Standard DataGrid Request**

```json
{
  "page": 0,
  "pageSize": 10,
  "sortField": "fieldName",
  "sortDir": "asc|desc",
  "filters": {
    "field1": "value1",
    "field2": "value2",
    "dateField": "2024-01-01"
  }
}
```

### **Advanced Filtering**

```json
{
  "page": 0,
  "pageSize": 25,
  "sortField": "createDate",
  "sortDir": "desc",
  "filters": {
    "name": "partial_name_search",
    "status": "ACTIVE",
    "isActive": "YES",
    "createDateFrom": "2024-01-01",
    "createDateTo": "2024-12-31"
  }
}
```

### **DataGrid Response Format**

```json
{
  "rows": [
    /* array of data */
  ],
  "rowCount": 1234,
  "success": true,
  "message": "Data retrieved successfully",
  "metadata": {
    "start": 0,
    "end": 25,
    "pageSize": 25,
    "currentPage": 1,
    "totalPages": 50,
    "appliedSort": [
      {
        "field": "createDate",
        "sort": "desc"
      }
    ],
    "appliedFilters": [
      {
        "field": "status",
        "operator": "equals",
        "value": "ACTIVE"
      }
    ],
    "queryExecutionTimeMs": 245,
    "fetchedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 📝 **Standard Response Format**

### **Success Response**

```json
{
  "data": {
    /* response data */
  },
  "success": true,
  "message": "Operation completed successfully",
  "metadata": {
    /* additional information */
  }
}
```

### **Error Response**

```json
{
  "data": null,
  "success": false,
  "message": "Error description here",
  "metadata": {
    "errorCode": "VALIDATION_ERROR",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🚨 **HTTP Status Codes**

| Code | Description           | Usage                                             |
| ---- | --------------------- | ------------------------------------------------- |
| 200  | OK                    | Successful GET, PUT, DELETE                       |
| 201  | Created               | Successful POST (resource created)                |
| 400  | Bad Request           | Invalid request format or parameters              |
| 401  | Unauthorized          | Missing or invalid authentication                 |
| 403  | Forbidden             | Valid authentication but insufficient permissions |
| 404  | Not Found             | Resource not found                                |
| 409  | Conflict              | Resource conflict (duplicate key, etc.)           |
| 422  | Unprocessable Entity  | Validation errors                                 |
| 500  | Internal Server Error | Server-side errors                                |

---

## 🔧 **Common Query Parameters**

### **Pagination**

- `page` - Page number (0-based)
- `pageSize` - Number of records per page (default: 10, max: 100)

### **Sorting**

- `sortField` - Field name to sort by
- `sortDir` - Sort direction (`asc` or `desc`)

### **Filtering**

- `filters` - Object containing field-value pairs for filtering

### **Date Ranges**

- `startDate` - Start date (ISO format: YYYY-MM-DD)
- `endDate` - End date (ISO format: YYYY-MM-DD)

---

## 📋 **Request/Response Examples**

### **ตัวอย่างการเรียกใช้ API แบบครบชุด**

```javascript
// 1. Login
const loginResponse = await fetch("/api/Auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "demo@example.com",
    password: "Demo123!",
  }),
});
const {
  data: { token },
} = await loginResponse.json();

// 2. Get Customer List
const customersResponse = await fetch("/api/Customers/summary", {
  headers: { Authorization: `Bearer ${token}` },
});
const customers = await customersResponse.json();

// 3. Get Customer DataGrid with Filtering
const dataGridResponse = await fetch("/api/Customers/datagrid", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    page: 0,
    pageSize: 10,
    sortField: "name",
    sortDir: "asc",
    filters: { isActive: "YES" },
  }),
});
const dataGrid = await dataGridResponse.json();

// 4. Create Customer
const createResponse = await fetch("/api/Customers", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    code: "CUST999",
    name: "API Created Customer",
    email: "api@customer.com",
    createBy: "api-user",
  }),
});
const newCustomer = await createResponse.json();
```

---

## 🛠️ **Testing Tools**

### **Recommended Tools**

- **Postman** - API testing and documentation
- **Swagger UI** - Built-in API documentation
- **curl** - Command line testing
- **VS Code REST Client** - HTTP files for testing

### **Sample HTTP File (VS Code)**

```http
### Login
POST https://localhost:7140/api/Auth/login
Content-Type: application/json

{
  "username": "demo@example.com",
  "password": "Demo123!"
}

### Get Customers
GET https://localhost:7140/api/Customers/summary
Authorization: Bearer {{token}}

### Create Customer
POST https://localhost:7140/api/Customers
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "code": "TEST001",
  "name": "Test Customer",
  "email": "test@example.com",
  "createBy": "tester"
}
```

---

**API นี้ถูกออกแบบให้:**

- **ใช้งานง่าย** - RESTful conventions
- **ครอบคลุม** - CRUD operations + Custom endpoints
- **มีประสิทธิภาพ** - DataGrid server-side processing
- **ปลอดภัย** - JWT authentication
- **Consistent** - Standard response format ทุก endpoint
