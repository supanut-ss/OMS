/**
 * Schema Mapping Utility
 * จัดการการแมป bsPreObj กับ actual schema names
 */

/**
 * แมป bsPreObj เป็น actual schema name
 * @param {string} preObj - BS Platform prefix object
 * @returns {string} Actual schema name for database
 */
export const mapPreObjToSchema = (preObj) => {
  const mapping = {
    default: "tmt", // default maps to tmt schema
    sec: "sec", // sec maps to sec schema
    tmt: "tmt", // tmt maps to tmt schema
    dbo: "dbo", // dbo maps to dbo schema
  };

  // Return mapped schema or fallback to default
  const result = mapping[preObj] || mapping.default;

  console.log("🗺️ Schema mapping:", {
    input_preObj: preObj,
    mapped_schema: result,
    mapping_table: mapping,
  });

  return result;
};

/**
 * แมป actual schema name เป็น bsPreObj
 * @param {string} schema - Actual schema name
 * @returns {string} BS Platform prefix object
 */
export const mapSchemaToPreObj = (schema) => {
  const reverseMapping = {
    tmt: "default",
    sec: "sec",
    dbo: "dbo",
  };

  return reverseMapping[schema] || "default";
};

/**
 * ตรวจสอบว่า preObj ที่กำหนดใช้ได้หรือไม่
 * @param {string} preObj - BS Platform prefix object
 * @returns {boolean}
 */
export const isValidPreObj = (preObj) => {
  const validPreObjs = ["default", "sec", "tmt", "dbo"];
  return validPreObjs.includes(preObj);
};

/**
 * รับ schema name จาก bsPreObj หรือใช้ default schema
 * @param {string} preObj - BS Platform prefix object
 * @param {string} defaultSchema - Default schema to use if preObj is not provided
 * @returns {string} Schema name to use
 */
export const getSchemaFromPreObj = (preObj, defaultSchema = "tmt") => {
  if (!preObj) {
    return defaultSchema;
  }

  if (!isValidPreObj(preObj)) {
    console.warn(
      `⚠️ Invalid bsPreObj: ${preObj}, using default schema: ${defaultSchema}`
    );
    return defaultSchema;
  }

  return mapPreObjToSchema(preObj);
};

const SchemaMapping = {
  mapPreObjToSchema,
  mapSchemaToPreObj,
  isValidPreObj,
  getSchemaFromPreObj,
};

export default SchemaMapping;
