export const normalizeColumnDataType = (dataType) =>
  String(dataType || "").toLowerCase().trim();

export const isDateOnlyDataType = (dataType) =>
  normalizeColumnDataType(dataType) === "date";

export const isDateTimeDataType = (dataType) => {
  const type = normalizeColumnDataType(dataType);
  return (
    type === "datetime" ||
    type === "datetime2" ||
    type === "smalldatetime" ||
    type === "datetimeoffset" ||
    type === "timestamp" ||
    type === "timestamp without time zone" ||
    type === "timestamp with time zone" ||
    type === "timestamptz"
  );
};

export const isDateLikeFieldName = (fieldName) => {
  const field = String(fieldName || "").toLowerCase();
  return (
    field === "date" ||
    field.endsWith("_date") ||
    field.endsWith("date") ||
    field.endsWith("_datetime") ||
    field.endsWith("datetime") ||
    field.endsWith("_timestamp") ||
    field.endsWith("timestamp")
  );
};

export const isDateLikeValue = (value) => {
  if (value instanceof Date) return !isNaN(value.getTime());
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (
    !/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(
      trimmed,
    ) &&
    !/^\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/.test(trimmed)
  ) {
    return false;
  }
  return !isNaN(new Date(trimmed).getTime());
};

export const dateValueHasTime = (value) => {
  if (value instanceof Date) {
    return (
      value.getHours() !== 0 ||
      value.getMinutes() !== 0 ||
      value.getSeconds() !== 0 ||
      value.getMilliseconds() !== 0
    );
  }

  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  const match =
    /^\d{4}-\d{2}-\d{2}[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/.exec(
      trimmed,
    ) || /^\d{2}\/\d{2}\/\d{4}\s+(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);

  if (!match) return false;

  const [, hours = "0", minutes = "0", seconds = "0", milliseconds = "0"] =
    match;
  return [hours, minutes, seconds, milliseconds].some(
    (part) => Number(part) !== 0,
  );
};

export const getDateFieldDataType = (fieldName, value) => {
  const field = String(fieldName || "").toLowerCase();
  return dateValueHasTime(value) ||
    field.includes("time") ||
    field.includes("timestamp")
    ? "datetime"
    : "date";
};

export const resolveDateDisplayDataType = (fieldName, value, dataType) => {
  const normalizedDataType = normalizeColumnDataType(dataType);

  if (isDateTimeDataType(normalizedDataType)) return normalizedDataType;
  if (isDateOnlyDataType(normalizedDataType)) return normalizedDataType;
  if (isDateLikeFieldName(fieldName) && isDateLikeValue(value)) {
    return getDateFieldDataType(fieldName, value);
  }

  return dataType;
};
