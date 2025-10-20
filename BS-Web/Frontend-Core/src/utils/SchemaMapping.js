/**
 * Schema Mapping Utility
 * จัดการการแมป bsPreObj กับ actual schema names
 *
 * Updated: Pass-through mode - รองรับ schema ทั้งหมดโดยไม่ต้องมี mapping table
 * - ถ้ามี bsPreObj ส่งไปตรงๆ เป็น schema name
 * - ถ้าไม่มี bsPreObj ใช้ default schema จาก .env หรือ dbo
 */

/**
 * ดึง default schema จาก environment variable
 * @returns {string} Default schema name
 */
const getDefaultSchema = () => {
  // ลองดึงจาก environment variables
  const envSchema =
    process.env.REACT_APP_DEFAULT_SCHEMA ||
    process.env.DEFAULT_SCHEMA ||
    process.env.DB_DEFAULT_SCHEMA;

  // ถ้าไม่เจอใน .env ให้ใช้ dbo เป็น default
  const defaultSchema = envSchema || "dbo";

  return defaultSchema;
};

/**
 * แมป bsPreObj เป็น actual schema name
 * @param {string} preObj - BS Platform prefix object
 * @returns {string} Actual schema name for database
 */
export const mapPreObjToSchema = (preObj) => {
  // ถ้าไม่มี preObj ให้ใช้ default schema จาก .env
  if (!preObj || preObj === null || preObj === undefined || preObj === "") {
    const defaultSchema = getDefaultSchema();
    console.log("🗺️ Using default schema from .env:", {
      envSchema:
        process.env.REACT_APP_DEFAULT_SCHEMA ||
        process.env.DEFAULT_SCHEMA ||
        process.env.DB_DEFAULT_SCHEMA,
      defaultSchema: defaultSchema,
      fallback: defaultSchema === "dbo" ? "dbo (fallback)" : "from .env",
    });
    return defaultSchema;
  }

  // ส่ง preObj ไปตรงๆ โดยไม่ต้อง mapping
  console.log("🗺️ Schema mapping (pass-through):", {
    input_preObj: preObj,
    output_schema: preObj,
    mode: "direct_pass_through",
  });

  return preObj;
};

/**
 * แมป actual schema name เป็น bsPreObj
 * @param {string} schema - Actual schema name
 * @returns {string} BS Platform prefix object
 */
export const mapSchemaToPreObj = (schema) => {
  // ส่งค่า schema กลับไปตรงๆ (reverse operation)
  return schema || getDefaultSchema();
};

/**
 * ตรวจสอบว่า preObj ที่กำหนดใช้ได้หรือไม่
 * @param {string} preObj - BS Platform prefix object
 * @returns {boolean}
 */
export const isValidPreObj = (preObj) => {
  // รับทุก string ที่ไม่ใช่ null, undefined, หรือ empty
  return (
    preObj !== null &&
    preObj !== undefined &&
    preObj !== "" &&
    typeof preObj === "string"
  );
};

/**
 * รับ schema name จาก bsPreObj หรือใช้ default schema
 * @param {string} preObj - BS Platform prefix object
 * @param {string} defaultSchema - Default schema to use if preObj is not provided
 * @returns {string} Schema name to use
 */
export const getSchemaFromPreObj = (preObj, defaultSchema = null) => {
  // ถ้าไม่มี preObj ให้ใช้ default schema จาก parameter หรือ .env
  if (!preObj || preObj === null || preObj === undefined || preObj === "") {
    const finalDefault = defaultSchema || getDefaultSchema();
    console.log("🗺️ Using default schema:", {
      parameterDefault: defaultSchema,
      envDefault: getDefaultSchema(),
      finalDefault: finalDefault,
    });
    return finalDefault;
  }

  // ถ้ามี preObj ให้ใช้ mapPreObjToSchema (ซึ่งจะส่งไปตรงๆ)
  return mapPreObjToSchema(preObj);
};

const SchemaMapping = {
  mapPreObjToSchema,
  mapSchemaToPreObj,
  isValidPreObj,
  getSchemaFromPreObj,
};

export default SchemaMapping;
