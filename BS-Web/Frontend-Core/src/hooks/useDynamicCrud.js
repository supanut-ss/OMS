import { useState, useCallback } from "react";
import axios from "../utils/axios";
import Logger from "../utils/logger";

/**
 * Dynamic CRUD Hook สำหรับการจัดการข้อมูลจากตารางใดๆ ใน database
 * @param {string} tableName - ชื่อตาราง เช่น 'dbo.Users', 'app.Products'
 */
export const useDynamicCrud = (tableName) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parse table name to extract schema and table
  const parseTableName = useCallback((fullTableName) => {
    if (!fullTableName) return { schema: "dbo", table: "" };

    const parts = fullTableName.split(".");
    if (parts.length === 2) {
      return { schema: parts[0], table: parts[1] };
    } else {
      return { schema: "dbo", table: fullTableName };
    }
  }, []);

  // Get table metadata (columns, types, constraints)
  const loadMetadata = useCallback(async () => {
    if (!tableName) {
      console.log("⚠️ useDynamicCrud: No tableName provided");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("🚀 useDynamicCrud: Starting metadata load for:", tableName);

      const { schema, table } = parseTableName(tableName);
      const url = `/dynamic/metadata/${table}?schemaName=${schema}`;
      Logger.log(`🔍 Loading metadata for table: ${schema}.${table}`);
      Logger.log(`📡 API URL: ${url}`);
      console.log("📡 useDynamicCrud: Making API call to:", url);

      const response = await axios.get(url);
      setMetadata(response.data);

      Logger.log("✅ Metadata loaded for table:", tableName, response.data);
      console.log(
        "✅ useDynamicCrud: Metadata loaded successfully:",
        response.data
      );
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to load metadata";
      Logger.error("❌ Failed to load metadata:", errorMsg);
      console.error("❌ useDynamicCrud: Metadata load failed:", err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tableName, parseTableName]);

  // Get table data with DataGrid support (pagination, sorting, filtering)
  const getTableData = useCallback(
    async (request) => {
      try {
        const { schema, table } = parseTableName(tableName);

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

        // Use bs-datagrid endpoint if BS properties are present
        const endpoint =
          request.preObj ||
          request.columns ||
          request.customWhere ||
          request.customOrderBy
            ? "/dynamic/bs-datagrid"
            : "/dynamic/datagrid";

        const response = await axios.post(endpoint, payload);

        Logger.log("📊 Dynamic data loaded:", {
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
        Logger.error("❌ Failed to load table data:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName, parseTableName]
  );

  // Create new record
  const createRecord = useCallback(
    async (recordData) => {
      try {
        const { schema, table } = parseTableName(tableName);

        const response = await axios.post("/dynamic/create", {
          tableName: table,
          schemaName: schema,
          data: recordData,
        });

        Logger.log("✅ Record created:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to create record";
        Logger.error("❌ Failed to create record:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName, parseTableName]
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

        const response = await axios.post("/dynamic/update", {
          tableName: table,
          schemaName: schema,
          data: recordData,
          whereConditions: conditions,
        });

        Logger.log("✅ Record updated:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to update record";
        Logger.error("❌ Failed to update record:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName, parseTableName, metadata]
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

        const response = await axios.post("/dynamic/delete", {
          tableName: table,
          schemaName: schema,
          whereConditions: conditions,
        });

        Logger.log("✅ Record deleted:", response.data);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to delete record";
        Logger.error("❌ Failed to delete record:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [tableName, parseTableName, metadata]
  );

  // Execute stored procedure
  const executeStoredProcedure = useCallback(
    async (procedureName, parameters = {}) => {
      try {
        const { schema, table: procName } = parseTableName(procedureName);

        const response = await axios.post(
          `/dynamic/procedure/${procName}?schemaName=${schema}`,
          parameters
        );

        Logger.log(
          "✅ Stored procedure executed:",
          procedureName,
          response.data
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to execute procedure";
        Logger.error("❌ Failed to execute procedure:", errorMsg);
        throw new Error(errorMsg);
      }
    },
    [parseTableName]
  );

  // Execute custom query
  const executeQuery = useCallback(async (query) => {
    try {
      const response = await axios.post("/dynamic/execute-query", {
        query,
      });

      Logger.log("✅ Custom query executed:", response.data);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to execute query";
      Logger.error("❌ Failed to execute query:", errorMsg);
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
  };
};
