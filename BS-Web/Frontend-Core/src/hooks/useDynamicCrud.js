import { useState, useCallback } from "react";
import AxiosMaster from "../utils/AxiosMaster";
import Logger from "../utils/logger";
import { parseTableName } from "../utils/DatabaseConfig";
import { getSchemaFromPreObj } from "../utils/SchemaMapping";
import { useAuth } from "../contexts/AuthContext";

/**
 * Dynamic CRUD Hook สำหรับการจัดการข้อมูลจากตารางใดๆ ใน database
 * Updated to use API Gateway endpoints
 * @param {string} tableName - ชื่อตาราง เช่น 'dbo.Users', 'app.Products'
 */
export const useDynamicCrud = (tableName) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get current user from auth context
  const { user } = useAuth();

  // Get table metadata (columns, types, constraints)
  const loadMetadata = useCallback(
    async (preObj = null) => {
      if (!tableName) {
        Logger.warn("⚠️ useDynamicCrud: No tableName provided");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        Logger.log("🚀 useDynamicCrud: Starting metadata load for:", tableName);

        // Debug JWT token
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        Logger.log(
          "🔑 JWT Token check:",
          token ? "Token exists" : "No token found"
        );
        if (token) {
          Logger.log("🔑 Token preview:", token.substring(0, 50) + "...");
        }

        // Determine schema: use preObj mapping if provided, otherwise parse from tableName
        let schema, table;
        if (preObj) {
          // Use schema mapping from preObj
          schema = getSchemaFromPreObj(preObj);
          table = tableName; // tableName should be just the table name when preObj is used
          Logger.log("🗺️ Using preObj schema mapping:", {
            preObj,
            schema,
            table,
          });
        } else {
          // Parse tableName for schema.table format
          const parsed = parseTableName(tableName);
          schema = parsed.schema;
          table = parsed.table;
          Logger.log("📊 Using parsed tableName:", { schema, table });
        }

        const url = `/dynamic/metadata/${table}?schemaName=${schema}`;
        Logger.log(`🔍 Loading metadata for table: ${schema}.${table}`);
        Logger.log(`📡 Gateway API URL: ${url}`);
        Logger.log("📡 useDynamicCrud: Making API call to Gateway:", url);

        const response = await AxiosMaster.get(url);
        setMetadata(response.data);

        Logger.log("✅ Metadata loaded for table:", tableName, response.data);
        Logger.log(
          "✅ useDynamicCrud: Metadata loaded successfully:",
          response.data
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load metadata";
        Logger.error("❌ Failed to load metadata:", errorMsg);
        Logger.error("❌ useDynamicCrud: Metadata load failed:", err);
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableName]
  );

  // Get table data with DataGrid support (pagination, sorting, filtering)
  const getTableData = useCallback(
    async (request) => {
      try {
        // Determine schema: use preObj mapping if provided, otherwise parse from tableName
        let schema, table;
        if (request.preObj) {
          // Use schema mapping from preObj
          schema = getSchemaFromPreObj(request.preObj);
          table = tableName; // tableName should be just the table name when preObj is used
          Logger.log("🗺️ Using preObj schema mapping for data:", {
            preObj: request.preObj,
            schema,
            table,
          });
        } else {
          // Parse tableName for schema.table format
          const parsed = parseTableName(tableName);
          schema = parsed.schema;
          table = parsed.table;
          Logger.log("📊 Using parsed tableName for data:", { schema, table });
        }

        // Remove tableName from request to avoid overriding parsed values
        const { tableName: requestTableName, ...cleanRequest } = request;

        const payload = {
          tableName: table,
          schemaName: schema,
          start: (request.page - 1) * request.pageSize || 0,
          end: request.page * request.pageSize || 25,
          sortModel: request.sortModel || [],
          filterModel: request.filterModel || {
            items: [],
            logicOperator: "and",
          },
          selectColumns: request.selectColumns,
          ...cleanRequest,
        };

        Logger.log("📡 Loading dynamic data:", payload);

        Logger.log("📡 Loading dynamic data via Gateway:", payload);

        // Use bs-datagrid endpoint if BS properties are present
        const endpoint =
          request.preObj ||
          request.columns ||
          request.customWhere ||
          request.customOrderBy
            ? "/dynamic/bs-datagrid"
            : "/dynamic/datagrid";

        const response = await AxiosMaster.post(endpoint, payload);

        Logger.log("📊 Dynamic data loaded via Gateway:", {
          rows: response.data.rows?.length || 0,
          total: response.data.rowCount || 0,
        });

        return {
          rows: response.data.rows || [],
          rowCount: response.data.rowCount || 0,
          metadata: response.data.tableMetadata,
          columnDefinitions: response.data.columnDefinitions,
          ...response.data,
        };
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || err.message || "Failed to load data";
        Logger.error("❌ Failed to load table data via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName]
  );

  // Create new record
  const createRecord = useCallback(
    async (recordData) => {
      try {
        const { schema, table } = parseTableName(tableName);

        // Get user ID from auth context
        let userId = null;
        if (user) {
          try {
            const userObj = typeof user === "string" ? JSON.parse(user) : user;
            userId = userObj?.user_id || userObj?.id || userObj?.sub || null;
            Logger.log("🔐 User data for CREATE audit:", { userObj, userId });
          } catch (e) {
            Logger.warn("Failed to parse user data for audit fields:", e);
          }
        } else {
          Logger.warn("⚠️ No user context available for audit fields");
        }

        // Fallback for testing - use current timestamp as userId if no user
        if (!userId) {
          userId = `test_user_${Date.now()}`;
          Logger.log("🔧 Using fallback userId for testing:", userId);
        }

        const response = await AxiosMaster.post("/dynamic/create", {
          tableName: table,
          schemaName: schema,
          data: recordData,
          userId: userId, // Add userId for audit fields
        });

        Logger.log("✅ Record created via Gateway:", response.data);
        return response.data;
      } catch (err) {
        // Handle specific 500 error that might be routing related
        if (err.response?.status === 500) {
          Logger.warn(
            "⚠️ Got 500 error - possibly routing issue, but data might have been created"
          );
          // You could try to refresh the data here to see if the record was actually created
        }

        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to create record";
        Logger.error("❌ Failed to create record via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName, user]
  );

  // Update existing record
  const updateRecord = useCallback(
    async ({ id, data: recordData, whereConditions }) => {
      try {
        const { schema, table } = parseTableName(tableName);

        // If no custom whereConditions provided, use the primary key from metadata
        let conditions = whereConditions;
        if (!conditions && metadata?.primaryKeys?.[0]) {
          const primaryKeyField = metadata.primaryKeys[0];
          conditions = { [primaryKeyField]: id };
        } else if (!conditions) {
          // Fallback to common primary key names
          conditions = { Id: id } || { id: id };
        }

        // Get user ID from auth context
        let userId = null;
        if (user) {
          try {
            const userObj = typeof user === "string" ? JSON.parse(user) : user;
            userId = userObj?.user_id || userObj?.id || userObj?.sub || null;
            Logger.log("🔐 User data for UPDATE audit:", { userObj, userId });
          } catch (e) {
            Logger.warn("Failed to parse user data for audit fields:", e);
          }
        } else {
          Logger.warn("⚠️ No user context available for audit fields");
        }

        // Fallback for testing - use current timestamp as userId if no user
        if (!userId) {
          userId = `test_user_${Date.now()}`;
          Logger.log("🔧 Using fallback userId for testing:", userId);
        }

        const response = await AxiosMaster.post("/dynamic/update", {
          tableName: table,
          schemaName: schema,
          data: recordData,
          whereConditions: conditions,
          userId: userId, // Add userId for audit fields
        });

        Logger.log("✅ Record updated via Gateway:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to update record";
        Logger.error("❌ Failed to update record via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName, metadata, user]
  );

  // Delete record
  const deleteRecord = useCallback(
    async (id, whereConditions) => {
      try {
        const { schema, table } = parseTableName(tableName);

        // If no custom whereConditions provided, use the primary key from metadata
        let conditions = whereConditions;
        if (!conditions && metadata?.primaryKeys?.[0]) {
          const primaryKeyField = metadata.primaryKeys[0];
          conditions = { [primaryKeyField]: id };
        } else if (!conditions) {
          // Fallback to common primary key names
          conditions = { Id: id } || { id: id };
        }

        const response = await AxiosMaster.post("/dynamic/delete", {
          tableName: table,
          schemaName: schema,
          whereConditions: conditions,
        });

        Logger.log("✅ Record deleted via Gateway:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to delete record";
        Logger.error("❌ Failed to delete record via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName, metadata]
  );

  // Execute stored procedure
  const executeStoredProcedure = useCallback(
    async (procedureName, parameters = {}) => {
      try {
        const { schema, table: procName } = parseTableName(procedureName);

        const response = await AxiosMaster.post(
          `/dynamic/procedure/${procName}?schemaName=${schema}`,
          parameters
        );

        Logger.log(
          "✅ Stored procedure executed via Gateway:",
          procedureName,
          response.data
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to execute procedure";
        Logger.error("❌ Failed to execute procedure via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    []
  );

  // Execute custom query
  const executeQuery = useCallback(async (query) => {
    try {
      const response = await AxiosMaster.post("/dynamic/query", {
        query,
      });

      Logger.log("✅ Custom query executed via Gateway:", response.data);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to execute query";
      Logger.error("❌ Failed to execute query:", errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Bulk operations
  const bulkCreate = useCallback(
    async (dataItems) => {
      try {
        const { schema, table } = parseTableName(tableName);

        const response = await AxiosMaster.post("/dynamic/bulk-create", {
          tableName: table,
          schemaName: schema,
          dataItems,
        });

        Logger.log("✅ Bulk create completed via Gateway:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to bulk create records";
        Logger.error("❌ Failed to bulk create via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName]
  );

  const bulkUpdate = useCallback(
    async (updates) => {
      try {
        const { schema, table } = parseTableName(tableName);

        const response = await AxiosMaster.post("/dynamic/bulk-update", {
          tableName: table,
          schemaName: schema,
          updates,
        });

        Logger.log("✅ Bulk update completed via Gateway:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to bulk update records";
        Logger.error("❌ Failed to bulk update via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName]
  );

  const bulkDelete = useCallback(
    async (conditions) => {
      try {
        const { schema, table } = parseTableName(tableName);

        const response = await AxiosMaster.post("/dynamic/bulk-delete", {
          tableName: table,
          schemaName: schema,
          conditions,
        });

        Logger.log("✅ Bulk delete completed via Gateway:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to bulk delete records";
        Logger.error("❌ Failed to bulk delete via Gateway:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName]
  );

  // ComboBox data fetcher
  const getComboBoxData = useCallback(async (comboConfig) => {
    try {
      const response = await AxiosMaster.post("/dynamic/combobox", comboConfig);
      Logger.log("✅ ComboBox data loaded via Gateway:", response.data);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load combobox data";
      Logger.error("❌ Failed to load combobox data via Gateway:", errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    // State
    metadata,
    loading,
    error,

    // Actions
    loadMetadata,
    getTableData,
    createRecord,
    updateRecord,
    deleteRecord,
    executeStoredProcedure,
    executeQuery,

    // Bulk Operations
    bulkCreate,
    bulkUpdate,
    bulkDelete,

    // Additional utilities
    getComboBoxData,
  };
};
