# 🚀 Gateway API Usage Examples

## 📋 ตัวอย่างการใช้งาน API ผ่าน Ocelot Gateway

เอกสารนี้แสดงตัวอย่างการเรียกใช้ DynamicController API ผ่าน Ocelot API Gateway

---

## 🔧 Basic Setup

### Environment Variables

```bash
# .env
GATEWAY_BASE_URL=http://localhost:8080/gateway/v1/api
JWT_TOKEN=your_jwt_token_here
```

### API Client Configuration

```javascript
// apiClient.js
import axios from "axios";

const apiClient = axios.create({
  baseURL:
    process.env.REACT_APP_GATEWAY_URL || "http://localhost:8080/gateway/v1/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

## 📊 DataGrid Examples

### 1. **Basic BSDataGrid Request**

```javascript
// GET DataGrid Data
const fetchCustomerData = async () => {
  try {
    const response = await apiClient.post("/dynamic/bs-datagrid", {
      tableName: "t_customer",
      page: 1,
      pageSize: 25,
      sortModel: [{ field: "created_date", sort: "desc" }],
    });

    console.log("DataGrid Response:", response.data);
    /*
    Expected Response:
    {
      data: [
        { id: 1, name: "John Doe", email: "john@example.com" },
        { id: 2, name: "Jane Smith", email: "jane@example.com" }
      ],
      total: 150,
      page: 1,
      pageSize: 25,
      totalPages: 6,
      columns: [
        { field: "id", headerName: "ID", type: "number" },
        { field: "name", headerName: "Name", type: "string" }
      ]
    }
    */
  } catch (error) {
    console.error("Error fetching data:", error.response?.data);
  }
};
```

### 2. **Advanced BSDataGrid with Filtering**

```javascript
// Advanced DataGrid with filters and custom columns
const fetchFilteredCustomers = async () => {
  try {
    const response = await apiClient.post("/dynamic/bs-datagrid", {
      tableName: "t_customer",
      bsPreObj: "active_customers", // Use predefined view
      bsCols: "id,name,email,phone,status_name", // Custom columns
      page: 1,
      pageSize: 50,
      filterModel: {
        items: [
          {
            field: "status",
            operator: "equals",
            value: "active",
          },
          {
            field: "created_date",
            operator: "greaterThan",
            value: "2025-01-01",
          },
        ],
        logicOperator: "and",
      },
      sortModel: [{ field: "name", sort: "asc" }],
      searchText: "john", // Global search
    });

    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch customers: ${error.response?.data?.message}`
    );
  }
};
```

### 3. **Table Schema Information**

```javascript
// Get table metadata
const getTableMetadata = async (tableName) => {
  try {
    const response = await apiClient.get(
      `/dynamic/metadata/${tableName}?schemaName=dbo`
    );

    console.log("Table Metadata:", response.data);
    /*
    Expected Response:
    {
      tableName: "t_customer",
      schemaName: "dbo",
      columns: [
        {
          columnName: "id",
          dataType: "int",
          isNullable: false,
          isPrimaryKey: true,
          isIdentity: true
        },
        {
          columnName: "name",
          dataType: "nvarchar",
          maxLength: 255,
          isNullable: false
        }
      ],
      primaryKeys: ["id"],
      foreignKeys: [...]
    }
    */
  } catch (error) {
    console.error("Error fetching metadata:", error.response?.data);
  }
};
```

---

## 🔽 ComboBox Examples

### 1. **Basic ComboBox Data**

```javascript
// Get ComboBox options
const fetchStatusOptions = async () => {
  try {
    const response = await apiClient.post("/dynamic/combobox", {
      tableName: "t_customer_status",
      valueField: "id",
      displayField: "name",
      sortBy: "name",
      sortOrder: "ASC",
    });

    console.log("ComboBox Options:", response.data);
    /*
    Expected Response:
    [
      { value: 1, display: "Active", id: 1, name: "Active" },
      { value: 2, display: "Inactive", id: 2, name: "Inactive" },
      { value: 3, display: "Pending", id: 3, name: "Pending" }
    ]
    */

    return response.data;
  } catch (error) {
    console.error("Error fetching combo options:", error.response?.data);
    return [];
  }
};
```

### 2. **Filtered ComboBox with Custom WHERE**

```javascript
// Get filtered ComboBox options
const fetchActiveStatusOptions = async () => {
  try {
    const response = await apiClient.post("/dynamic/combobox", {
      tableName: "t_customer_status",
      valueField: "id",
      displayField: "name",
      whereClause: "is_active = 1 AND display_order IS NOT NULL",
      orderBy: "display_order ASC, name ASC",
      defaultOption: "Please select status...",
    });

    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch status options: ${error.response?.data?.message}`
    );
  }
};
```

---

## 🔧 CRUD Examples

### 1. **Create Record**

```javascript
// Create new customer
const createCustomer = async (customerData) => {
  try {
    const response = await apiClient.post("/dynamic/create", {
      tableName: "t_customer",
      data: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        status_id: customerData.statusId,
        created_date: new Date().toISOString(),
        created_by: "current_user",
      },
    });

    console.log("Customer created:", response.data);
    /*
    Expected Response:
    {
      success: true,
      data: {
        id: 123,
        name: "New Customer",
        email: "new@example.com",
        // ... other fields
      },
      message: "Record created successfully"
    }
    */

    return response.data;
  } catch (error) {
    console.error("Error creating customer:", error.response?.data);
    throw error;
  }
};
```

### 2. **Update Record**

```javascript
// Update existing customer
const updateCustomer = async (customerId, updateData) => {
  try {
    const response = await apiClient.post("/dynamic/update", {
      tableName: "t_customer",
      data: updateData,
      whereConditions: {
        id: customerId,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to update customer: ${error.response?.data?.message}`
    );
  }
};
```

### 3. **Delete Record**

```javascript
// Delete customer
const deleteCustomer = async (customerId) => {
  try {
    const response = await apiClient.post("/dynamic/delete", {
      tableName: "t_customer",
      whereConditions: {
        id: customerId,
      },
    });

    return response.data; // true if successful
  } catch (error) {
    throw new Error(
      `Failed to delete customer: ${error.response?.data?.message}`
    );
  }
};
```

### 4. **Get Single Record**

```javascript
// Get customer by ID
const getCustomerById = async (customerId) => {
  try {
    const response = await apiClient.post(`/dynamic/record/t_customer`, {
      id: customerId,
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Customer not found
    }
    throw error;
  }
};
```

---

## 📦 Bulk Operations Examples

### 1. **Bulk Create**

```javascript
// Create multiple customers at once
const bulkCreateCustomers = async (customersData) => {
  try {
    const response = await apiClient.post("/dynamic/bulk-create", {
      tableName: "t_customer",
      dataItems: customersData.map((customer) => ({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status_id: 1, // Active
        created_date: new Date().toISOString(),
        created_by: "bulk_import",
      })),
    });

    console.log("Bulk Create Result:", response.data);
    /*
    Expected Response:
    {
      message: "Bulk create completed: 25 successful, 2 failed",
      successful: 25,
      failed: 2,
      results: [...], // Successfully created records
      errors: ["Email already exists for john@example.com"] // Error messages
    }
    */

    return response.data;
  } catch (error) {
    console.error("Bulk create error:", error.response?.data);
    throw error;
  }
};
```

### 2. **Bulk Update**

```javascript
// Update multiple customers
const bulkUpdateCustomers = async (updates) => {
  try {
    const response = await apiClient.post("/dynamic/bulk-update", {
      tableName: "t_customer",
      updateItems: updates.map((update) => ({
        data: {
          status_id: update.newStatusId,
          updated_date: new Date().toISOString(),
          updated_by: "bulk_update",
        },
        whereConditions: {
          id: update.customerId,
        },
      })),
    });

    return response.data;
  } catch (error) {
    throw new Error(`Bulk update failed: ${error.response?.data?.message}`);
  }
};
```

### 3. **Bulk Delete**

```javascript
// Delete multiple customers
const bulkDeleteCustomers = async (customerIds) => {
  try {
    const response = await apiClient.post("/dynamic/bulk-delete", {
      tableName: "t_customer",
      whereConditions: customerIds.map((id) => ({ id: id })),
    });

    return response.data;
  } catch (error) {
    throw new Error(`Bulk delete failed: ${error.response?.data?.message}`);
  }
};
```

---

## 🎯 React Component Integration

### 1. **BSDataGrid Component with Gateway**

```jsx
import React, { useState, useEffect } from "react";
import BSDataGrid from "../components/BSDataGrid";
import apiClient from "../utils/apiClient";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState([]);

  useEffect(() => {
    loadStatusOptions();
  }, []);

  const loadStatusOptions = async () => {
    try {
      const options = await apiClient.post("/dynamic/combobox", {
        tableName: "t_customer_status",
        valueField: "id",
        displayField: "name",
      });
      setStatusOptions(options.data);
    } catch (error) {
      console.error("Failed to load status options:", error);
    }
  };

  const handleDataLoad = async (gridParams) => {
    try {
      setLoading(true);
      const response = await apiClient.post("/dynamic/bs-datagrid", {
        tableName: "t_customer",
        page: gridParams.page,
        pageSize: gridParams.pageSize,
        sortModel: gridParams.sortModel,
        filterModel: gridParams.filterModel,
      });

      setCustomers(response.data.data);
      return {
        data: response.data.data,
        total: response.data.total,
      };
    } catch (error) {
      console.error("Failed to load customers:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreate = async (newRecords) => {
    try {
      const response = await apiClient.post("/dynamic/bulk-create", {
        tableName: "t_customer",
        dataItems: newRecords,
      });

      // Reload data
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to create records: ${error.response?.data?.message}`
      );
    }
  };

  return (
    <div>
      <h1>Customer Management</h1>
      <BSDataGrid
        bsObj="t_customer"
        height={600}
        loading={loading}
        onDataLoad={handleDataLoad}
        onBulkCreate={handleBulkCreate}
        bsComboBox={[
          {
            Column: "status_id",
            Obj: "t_customer_status",
            Value: "id",
            Display: "name",
          },
        ]}
        bsBulkEdit={true}
        bsBulkAdd={true}
        bsBulkDelete={true}
      />
    </div>
  );
};

export default CustomerManagement;
```

### 2. **useDynamicCrud Hook with Gateway**

```javascript
// hooks/useDynamicCrud.js
import { useState, useCallback } from "react";
import apiClient from "../utils/apiClient";

export const useDynamicCrud = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDataGrid = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post("/dynamic/bs-datagrid", params);
      setData(response.data.data);

      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch data");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(async (tableName, recordData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post("/dynamic/create", {
        tableName,
        data: recordData,
      });

      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create record");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkOperations = {
    bulkCreate: useCallback(async (tableName, dataItems) => {
      const response = await apiClient.post("/dynamic/bulk-create", {
        tableName,
        dataItems,
      });
      return response.data;
    }, []),

    bulkUpdate: useCallback(async (tableName, updateItems) => {
      const response = await apiClient.post("/dynamic/bulk-update", {
        tableName,
        updateItems,
      });
      return response.data;
    }, []),

    bulkDelete: useCallback(async (tableName, whereConditions) => {
      const response = await apiClient.post("/dynamic/bulk-delete", {
        tableName,
        whereConditions,
      });
      return response.data;
    }, []),
  };

  return {
    data,
    loading,
    error,
    fetchDataGrid,
    createRecord,
    ...bulkOperations,
  };
};
```

---

## 🔍 Error Handling Examples

### 1. **Rate Limit Handling**

```javascript
// Handle rate limiting with retry
const fetchWithRetry = async (requestFn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = parseInt(
          error.response.headers["retry-after"] || "1"
        );
        console.log(`Rate limited. Retrying in ${retryAfter} seconds...`);

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000)
          );
          continue;
        }
      }
      throw error;
    }
  }
};

// Usage
const safeApiCall = () =>
  fetchWithRetry(async () => {
    return await apiClient.post("/dynamic/bs-datagrid", {
      tableName: "t_customer",
      page: 1,
      pageSize: 100,
    });
  });
```

### 2. **Token Refresh Handling**

```javascript
// Automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem("refresh_token");
        const response = await axios.post("/gateway/v1/api/refresh", {
          refresh_token: refreshToken,
        });

        // Update stored tokens
        localStorage.setItem("jwt_token", response.data.access_token);
        localStorage.setItem("refresh_token", response.data.refresh_token);

        // Retry original request
        const config = error.config;
        config.headers.Authorization = `Bearer ${response.data.access_token}`;
        return apiClient.request(config);
      } catch (refreshError) {
        // Redirect to login
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 📈 Performance Tips

### 1. **Request Optimization**

```javascript
// Use pagination for large datasets
const loadLargeDataset = async (tableName) => {
  const pageSize = 100; // Optimal page size
  let allData = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await apiClient.post("/dynamic/bs-datagrid", {
      tableName,
      page: currentPage,
      pageSize,
      selectColumns: ["id", "name", "status"], // Only needed columns
    });

    allData = [...allData, ...response.data.data];
    hasMore = response.data.data.length === pageSize;
    currentPage++;

    // Add delay to respect rate limits
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return allData;
};
```

### 2. **Caching Strategy**

```javascript
// Simple cache for ComboBox data
const comboBoxCache = new Map();

const getCachedComboBox = async (tableName, valueField, displayField) => {
  const cacheKey = `${tableName}_${valueField}_${displayField}`;

  if (comboBoxCache.has(cacheKey)) {
    const cached = comboBoxCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      // 5 minutes
      return cached.data;
    }
  }

  const response = await apiClient.post("/dynamic/combobox", {
    tableName,
    valueField,
    displayField,
  });

  comboBoxCache.set(cacheKey, {
    data: response.data,
    timestamp: Date.now(),
  });

  return response.data;
};
```

---

**🚀 BS-Platform Gateway API Examples** | **Version 1.0** | **September 2025**

_Complete examples for integrating with BS-Platform through Ocelot API Gateway_
