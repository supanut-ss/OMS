# 🚀 Dynamic CRUD - Frontend Integration Guide

## Overview

คู่มือการใช้งาน Dynamic CRUD API กับ React Frontend และ MUI X DataGrid

---

## 📋 Table of Contents

1. [Setup และ Installation](#setup-และ-installation)
2. [React Hook สำหรับ Dynamic CRUD](#react-hook-สำหรับ-dynamic-crud)
3. [MUI X DataGrid Integration](#mui-x-datagrid-integration)
4. [CRUD Operations](#crud-operations)
5. [Advanced Features](#advanced-features)
6. [Performance Optimization](#performance-optimization)

---

## 🔧 Setup และ Installation

### 1. Install Required Packages

```bash
npm install @mui/x-data-grid @mui/material @emotion/react @emotion/styled
npm install axios react-query @tanstack/react-query
```

### 2. API Configuration

```typescript
// config/api.ts
export const API_BASE_URL = "https://localhost:5083/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🪝 React Hook สำหรับ Dynamic CRUD

### 1. Dynamic CRUD Hook

```typescript
// hooks/useDynamicCrud.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../config/api";

export interface DynamicTableRequest {
  tableName: string;
  pageSize?: number;
  page?: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  filters?: Array<{
    field: string;
    operator:
      | "eq"
      | "ne"
      | "gt"
      | "gte"
      | "lt"
      | "lte"
      | "contains"
      | "startswith"
      | "endswith";
    value: any;
  }>;
}

export const useDynamicCrud = (tableName: string) => {
  const queryClient = useQueryClient();

  // Get table metadata
  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ["metadata", tableName],
    queryFn: async () => {
      const { data } = await apiClient.get(`/dynamic/metadata/${tableName}`);
      return data;
    },
    enabled: !!tableName,
  });

  // Get table data with DataGrid support
  const getTableData = async (request: DynamicTableRequest) => {
    const { data } = await apiClient.post("/dynamic/datagrid", request);
    return data;
  };

  // Create record
  const createMutation = useMutation({
    mutationFn: async (recordData: any) => {
      const { data } = await apiClient.post("/dynamic/create", {
        tableName,
        data: recordData,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tableData", tableName] });
    },
  });

  // Update record
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: recordData }: { id: any; data: any }) => {
      const { data } = await apiClient.put("/dynamic/update", {
        tableName,
        id,
        data: recordData,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tableData", tableName] });
    },
  });

  // Delete record
  const deleteMutation = useMutation({
    mutationFn: async (id: any) => {
      const { data } = await apiClient.delete("/dynamic/delete", {
        data: { tableName, id },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tableData", tableName] });
    },
  });

  return {
    metadata,
    metadataLoading,
    getTableData,
    createRecord: createMutation.mutateAsync,
    updateRecord: updateMutation.mutateAsync,
    deleteRecord: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
```

---

## 📊 MUI X DataGrid Integration

### 1. Dynamic DataGrid Component

```typescript
// components/DynamicDataGrid.tsx
import React, { useState, useCallback, useMemo } from "react";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridFilterModel,
  GridRowParams,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import { IconButton, Box, Chip } from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import { useDynamicCrud } from "../hooks/useDynamicCrud";
import { useQuery } from "@tanstack/react-query";

interface DynamicDataGridProps {
  tableName: string;
  onEdit?: (row: any) => void;
  onDelete?: (id: any) => void;
  onAdd?: () => void;
  readOnly?: boolean;
}

export const DynamicDataGrid: React.FC<DynamicDataGridProps> = ({
  tableName,
  onEdit,
  onDelete,
  onAdd,
  readOnly = false,
}) => {
  const { metadata, metadataLoading, getTableData } = useDynamicCrud(tableName);

  // DataGrid state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
  });

  // Build API request from DataGrid state
  const buildRequest = useCallback(() => {
    const filters = filterModel.items.map((item) => ({
      field: item.field,
      operator: item.operator as any,
      value: item.value,
    }));

    return {
      tableName,
      page: paginationModel.page + 1, // API uses 1-based pagination
      pageSize: paginationModel.pageSize,
      sortField: sortModel[0]?.field,
      sortDirection: sortModel[0]?.sort as "asc" | "desc",
      filters: filters.length > 0 ? filters : undefined,
    };
  }, [tableName, paginationModel, sortModel, filterModel]);

  // Fetch data
  const { data: tableData, isLoading } = useQuery({
    queryKey: ["tableData", tableName, paginationModel, sortModel, filterModel],
    queryFn: () => getTableData(buildRequest()),
    enabled: !!tableName && !metadataLoading,
  });

  // Build columns from metadata
  const columns = useMemo((): GridColDef[] => {
    if (!metadata?.columns) return [];

    const dataColumns: GridColDef[] = metadata.columns.map((col: any) => ({
      field: col.columnName,
      headerName: col.displayName || col.columnName,
      width: getColumnWidth(col.dataType),
      type: getGridColumnType(col.dataType),
      editable: !col.isIdentity && !col.isReadOnly,
      sortable: true,
      filterable: true,
      renderCell: (params) => {
        if (col.dataType === "bit") {
          return <Chip label={params.value ? "Yes" : "No"} size="small" />;
        }
        return params.value;
      },
    }));

    // Add actions column if not read-only
    if (!readOnly) {
      dataColumns.push({
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 100,
        getActions: (params: GridRowParams) => [
          <GridActionsCellItem
            key="edit"
            icon={<Edit />}
            label="Edit"
            onClick={() => onEdit?.(params.row)}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<Delete />}
            label="Delete"
            onClick={() => onDelete?.(params.row[metadata.primaryKey])}
          />,
        ],
      });
    }

    return dataColumns;
  }, [metadata, readOnly, onEdit, onDelete]);

  // Helper functions
  const getColumnWidth = (dataType: string): number => {
    switch (dataType) {
      case "bit":
        return 80;
      case "int":
      case "smallint":
      case "tinyint":
        return 100;
      case "bigint":
        return 120;
      case "decimal":
      case "float":
      case "real":
        return 120;
      case "datetime":
      case "datetime2":
      case "date":
        return 150;
      case "varchar":
      case "nvarchar":
        return 200;
      case "text":
      case "ntext":
        return 300;
      default:
        return 150;
    }
  };

  const getGridColumnType = (dataType: string): string => {
    switch (dataType) {
      case "int":
      case "smallint":
      case "tinyint":
      case "bigint":
        return "number";
      case "decimal":
      case "float":
      case "real":
        return "number";
      case "bit":
        return "boolean";
      case "datetime":
      case "datetime2":
      case "date":
        return "dateTime";
      default:
        return "string";
    }
  };

  return (
    <Box sx={{ height: 600, width: "100%" }}>
      <DataGrid
        rows={tableData?.data || []}
        columns={columns}
        loading={isLoading || metadataLoading}
        // Pagination
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        rowCount={tableData?.totalCount || 0}
        pageSizeOptions={[10, 25, 50, 100]}
        // Sorting
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        // Filtering
        filterMode="server"
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        // Other props
        disableRowSelectionOnClick
        getRowId={(row) => row[metadata?.primaryKey || "id"]}
      />
    </Box>
  );
};
```

### 2. Table Selector Component

```typescript
// components/TableSelector.tsx
import React from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../config/api";

interface TableSelectorProps {
  value?: string;
  onChange: (tableName: string | null) => void;
  allowedSchemas?: string[];
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  value,
  onChange,
  allowedSchemas = ["dbo", "app", "data"],
}) => {
  const { data: schemas, isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: async () => {
      const { data } = await apiClient.get("/dynamic/schemas");
      return data.schemas;
    },
  });

  const availableTables =
    schemas
      ?.filter((schema: any) => allowedSchemas.includes(schema.schemaName))
      .flatMap((schema: any) =>
        schema.tables.map((table: string) => ({
          label: `${schema.schemaName}.${table}`,
          value: `${schema.schemaName}.${table}`,
        }))
      ) || [];

  return (
    <Autocomplete
      options={availableTables}
      value={availableTables.find((option) => option.value === value) || null}
      onChange={(_, option) => onChange(option?.value || null)}
      loading={isLoading}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Table/View"
          variant="outlined"
          placeholder="Search tables..."
        />
      )}
      isOptionEqualToValue={(option, value) => option.value === value.value}
    />
  );
};
```

---

## 🔧 CRUD Operations

### 1. Create/Edit Dialog

```typescript
// components/DynamicFormDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Grid,
  Autocomplete,
} from "@mui/material";
import { useDynamicCrud } from "../hooks/useDynamicCrud";

interface DynamicFormDialogProps {
  open: boolean;
  onClose: () => void;
  tableName: string;
  editData?: any;
  mode: "create" | "edit";
}

export const DynamicFormDialog: React.FC<DynamicFormDialogProps> = ({
  open,
  onClose,
  tableName,
  editData,
  mode,
}) => {
  const { metadata, createRecord, updateRecord, isCreating, isUpdating } =
    useDynamicCrud(tableName);

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (editData && mode === "edit") {
      setFormData(editData);
    } else {
      setFormData({});
    }
  }, [editData, mode]);

  const handleSubmit = async () => {
    try {
      if (mode === "create") {
        await createRecord(formData);
      } else {
        await updateRecord({
          id: formData[metadata?.primaryKey],
          data: formData,
        });
      }
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderField = (column: any) => {
    const value = formData[column.columnName] || "";

    if (column.isIdentity && mode === "edit") {
      return (
        <TextField
          key={column.columnName}
          label={column.displayName || column.columnName}
          value={value}
          disabled
          fullWidth
        />
      );
    }

    switch (column.dataType) {
      case "bit":
        return (
          <FormControlLabel
            key={column.columnName}
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) =>
                  handleFieldChange(column.columnName, e.target.checked)
                }
              />
            }
            label={column.displayName || column.columnName}
          />
        );

      case "int":
      case "smallint":
      case "tinyint":
      case "bigint":
      case "decimal":
      case "float":
      case "real":
        return (
          <TextField
            key={column.columnName}
            label={column.displayName || column.columnName}
            type="number"
            value={value}
            onChange={(e) =>
              handleFieldChange(column.columnName, e.target.value)
            }
            required={!column.isNullable}
            fullWidth
          />
        );

      case "datetime":
      case "datetime2":
      case "date":
        return (
          <TextField
            key={column.columnName}
            label={column.displayName || column.columnName}
            type={column.dataType === "date" ? "date" : "datetime-local"}
            value={value ? new Date(value).toISOString().slice(0, -1) : ""}
            onChange={(e) =>
              handleFieldChange(column.columnName, e.target.value)
            }
            required={!column.isNullable}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        );

      default:
        return (
          <TextField
            key={column.columnName}
            label={column.displayName || column.columnName}
            value={value}
            onChange={(e) =>
              handleFieldChange(column.columnName, e.target.value)
            }
            required={!column.isNullable}
            multiline={column.maxLength > 255}
            rows={column.maxLength > 255 ? 3 : 1}
            fullWidth
          />
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === "create" ? "Create New Record" : "Edit Record"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {metadata?.columns
            ?.filter((col) => !col.isReadOnly || mode === "edit")
            .map((column) => (
              <Grid item xs={12} sm={6} key={column.columnName}>
                {renderField(column)}
              </Grid>
            ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isCreating || isUpdating}
        >
          {mode === "create" ? "Create" : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

## 🚀 Advanced Features

### 1. Stored Procedure Execution

```typescript
// hooks/useStoredProcedure.ts
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../config/api";

export const useStoredProcedure = () => {
  const executeProcedure = useMutation({
    mutationFn: async ({
      procedureName,
      parameters,
    }: {
      procedureName: string;
      parameters?: Record<string, any>;
    }) => {
      const { data } = await apiClient.post("/dynamic/execute-procedure", {
        procedureName,
        parameters,
      });
      return data;
    },
  });

  return {
    execute: executeProcedure.mutateAsync,
    isExecuting: executeProcedure.isPending,
    error: executeProcedure.error,
  };
};
```

### 2. Custom Query Component

```typescript
// components/CustomQueryBuilder.tsx
import React, { useState } from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../config/api";
import { DynamicDataGrid } from "./DynamicDataGrid";

export const CustomQueryBuilder: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);

  const executeQuery = useMutation({
    mutationFn: async (sqlQuery: string) => {
      const { data } = await apiClient.post("/dynamic/execute-query", {
        query: sqlQuery,
      });
      return data;
    },
    onSuccess: (data) => {
      setResults(data);
    },
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Custom Query Builder
      </Typography>

      <TextField
        multiline
        rows={4}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SELECT * FROM YourTable WHERE..."
        fullWidth
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={() => executeQuery.mutate(query)}
        disabled={!query.trim() || executeQuery.isPending}
      >
        Execute Query
      </Button>

      {results && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Results ({results.totalCount} rows)
          </Typography>
          {/* Render results in a simple table or grid */}
        </Box>
      )}
    </Box>
  );
};
```

---

## ⚡ Performance Optimization

### 1. Query Client Configuration

```typescript
// config/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 2. Virtualized DataGrid

```typescript
// For large datasets, enable virtualization
<DataGrid
  // ... other props
  density="compact"
  disableVirtualization={false}
  rowHeight={32}
  columnHeaderHeight={40}
/>
```

### 3. Debounced Search

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from "react";

export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

---

## 🎯 Complete Example

```typescript
// pages/DynamicCrudPage.tsx
import React, { useState } from "react";
import { Box, Paper, Typography, Button, Grid } from "@mui/material";
import { Add } from "@mui/icons-material";
import { TableSelector } from "../components/TableSelector";
import { DynamicDataGrid } from "../components/DynamicDataGrid";
import { DynamicFormDialog } from "../components/DynamicFormDialog";
import { useDynamicCrud } from "../hooks/useDynamicCrud";

export const DynamicCrudPage: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const { deleteRecord } = useDynamicCrud(selectedTable);

  const handleAdd = () => {
    setEditData(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (row: any) => {
    setEditData(row);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDelete = async (id: any) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteRecord(id);
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dynamic CRUD Management
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TableSelector
              value={selectedTable}
              onChange={(table) => setSelectedTable(table || "")}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              disabled={!selectedTable}
              fullWidth
            >
              Add Record
            </Button>
          </Grid>
        </Grid>

        {selectedTable && (
          <Box sx={{ mt: 3 }}>
            <DynamicDataGrid
              tableName={selectedTable}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          </Box>
        )}
      </Paper>

      <DynamicFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tableName={selectedTable}
        editData={editData}
        mode={dialogMode}
      />
    </Box>
  );
};
```

---

## 🔐 Security Best Practices

1. **API Authorization**: Always include JWT tokens in requests
2. **Schema Restrictions**: Only allow access to approved schemas (dbo, app, data)
3. **Input Validation**: Validate all user inputs on frontend before sending
4. **Error Handling**: Never expose sensitive database information in error messages
5. **Rate Limiting**: Implement request throttling for production use

---

## 📈 Production Considerations

1. **Caching**: Implement proper cache invalidation strategies
2. **Error Boundaries**: Add React error boundaries for better UX
3. **Loading States**: Provide meaningful loading indicators
4. **Accessibility**: Ensure DataGrid is keyboard navigable
5. **Mobile Responsive**: Test on various screen sizes

---

## 🎉 ผลลัพธ์ที่ได้

- **Zero Configuration**: ไม่ต้องสร้าง Entity หรือ Controller สำหรับแต่ละตาราง
- **Auto DataGrid**: สร้าง DataGrid ที่รองรับ pagination, sorting, filtering อัตโนมัติ
- **Type Safety**: TypeScript support ครบถ้วน
- **High Performance**: Server-side processing และ virtualization
- **Production Ready**: Security, error handling, และ optimization ครบถ้วน
