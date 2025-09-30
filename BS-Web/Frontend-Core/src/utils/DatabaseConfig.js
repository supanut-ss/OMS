/**
 * Database Configuration Utility
 * จัดการการตั้งค่าเกี่ยวกับ Database schema และ configuration ต่างๆ
 */

/**
 * รับค่า default schema จาก environment variable
 * @returns {string} Default schema name
 */
export const getDefaultSchema = () => {
  return process.env.REACT_APP_DEFAULT_SCHEMA || "dbo";
};

/**
 * แยก table name เป็น schema และ table
 * @param {string} fullTableName - ชื่อตารางแบบเต็ม เช่น 'dbo.Users' หรือ 'Users'
 * @returns {Object} { schema, table }
 */
export const parseTableName = (fullTableName) => {
  if (!fullTableName) {
    return {
      schema: getDefaultSchema(),
      table: "",
    };
  }

  const parts = fullTableName.split(".");
  if (parts.length === 2) {
    return {
      schema: parts[0],
      table: parts[1],
    };
  } else {
    return {
      schema: getDefaultSchema(),
      table: fullTableName,
    };
  }
};

/**
 * สร้าง full table name จาก schema และ table
 * @param {string} schema - Schema name
 * @param {string} table - Table name
 * @returns {string} Full table name
 */
export const buildFullTableName = (schema, table) => {
  const schemaToUse = schema || getDefaultSchema();
  return `${schemaToUse}.${table}`;
};

/**
 * รับค่า database configuration จาก environment
 * @returns {Object} Database configuration
 */
export const getDatabaseConfig = () => {
  return {
    defaultSchema: getDefaultSchema(),
    apiUrl: process.env.REACT_APP_API_URL,
    apiLicenseKey: process.env.REACT_APP_API_LICENSE_KEY,
    environment: process.env.REACT_APP_ENV || "development",
    debug: process.env.REACT_APP_DEBUG === "true",
  };
};

/**
 * ตรวจสอบว่า schema ที่กำหนดเป็น default schema หรือไม่
 * @param {string} schema - Schema name to check
 * @returns {boolean}
 */
export const isDefaultSchema = (schema) => {
  return schema === getDefaultSchema();
};

/**
 * สร้าง qualified table name สำหรับ SQL queries
 * @param {string} tableName - Table name (อาจมี schema prefix แล้วหรือไม่มี)
 * @returns {string} Qualified table name
 */
export const getQualifiedTableName = (tableName) => {
  const { schema, table } = parseTableName(tableName);
  return `[${schema}].[${table}]`;
};

/**
 * Log database configuration สำหรับ debugging
 */
export const logDatabaseConfig = () => {
  if (process.env.REACT_APP_DEBUG === "true") {
    const config = getDatabaseConfig();
    console.log("🗃️ Database Configuration:", config);
  }
};

const DatabaseConfig = {
  getDefaultSchema,
  parseTableName,
  buildFullTableName,
  getDatabaseConfig,
  isDefaultSchema,
  getQualifiedTableName,
  logDatabaseConfig,
};

export default DatabaseConfig;
