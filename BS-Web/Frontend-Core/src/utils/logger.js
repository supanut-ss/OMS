import Config from "./Config";

const isDevelopment = process.env.NODE_ENV === "development";
const ERROR_LOG_QUEUE_KEY = "bs_file_error_log_queue";
const MAX_ERROR_LOG_QUEUE_SIZE = 100;
const MAX_SERIALIZE_DEPTH = 4;
const LOG_ENDPOINT_PATH = "/logging/log";
const SENSITIVE_KEYS = [
  "password",
  "pass",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "secret",
  "pin",
  "otp",
];

let isFlushingErrorLogs = false;

const isSensitiveKey = (key = "") =>
  SENSITIVE_KEYS.includes(String(key).toLowerCase());

const getErrorLogEndpoint = () => {
  const apiBase = (Config.API_URL || "/gateway/v1/api").replace(/\/+$/, "");
  return `${apiBase}${LOG_ENDPOINT_PATH}`;
};

const getStorage = () => {
  try {
    if (typeof localStorage === "undefined") return null;
    const testKey = "__logger_storage_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return localStorage;
  } catch (_) {
    return null;
  }
};

const safeJsonStringify = (value) => {
  try {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch (_) {
    return "[Unserializable]";
  }
};

const sanitizeValue = (value, depth = 0) => {
  if (depth > MAX_SERIALIZE_DEPTH) return "[MaxDepth]";
  if (value == null) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === "string") {
    return value.length > 2000 ? `${value.slice(0, 2000)}...[TRUNCATED]` : value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }

  const output = {};
  Object.keys(value).forEach((key) => {
    output[key] = isSensitiveKey(key)
      ? "[REDACTED]"
      : sanitizeValue(value[key], depth + 1);
  });
  return output;
};

const formatLogArg = (arg) => {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === "string") return arg;
  if (arg == null) return String(arg);
  if (typeof arg === "object") return safeJsonStringify(sanitizeValue(arg));
  return String(arg);
};

const getErrorStack = (args) => {
  const error = args.find((arg) => arg instanceof Error);
  return error?.stack || null;
};

const createErrorLogRecord = (args) => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  level: "error",
  message: args.map(formatLogArg).join(" "),
  stack: getErrorStack(args),
  details: args.map((arg) => sanitizeValue(arg)),
  timestamp: new Date().toISOString(),
  url: typeof window !== "undefined" ? window.location.href : "",
  userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  online: typeof navigator !== "undefined" ? navigator.onLine !== false : true,
  appName: Config.APP_NAME || "",
  environment: Config.APP_ENV || process.env.NODE_ENV || "",
});

const readErrorLogQueue = () => {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(ERROR_LOG_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    storage.removeItem(ERROR_LOG_QUEUE_KEY);
    return [];
  }
};

const writeErrorLogQueue = (queue) => {
  const storage = getStorage();
  if (!storage) return;

  const nextQueue = queue.slice(-MAX_ERROR_LOG_QUEUE_SIZE);
  if (nextQueue.length === 0) {
    storage.removeItem(ERROR_LOG_QUEUE_KEY);
    return;
  }

  try {
    storage.setItem(ERROR_LOG_QUEUE_KEY, JSON.stringify(nextQueue));
  } catch (_) {
    const smallerQueue = nextQueue.slice(-Math.floor(MAX_ERROR_LOG_QUEUE_SIZE / 2));
    try {
      storage.setItem(ERROR_LOG_QUEUE_KEY, JSON.stringify(smallerQueue));
    } catch (_) {
      storage.removeItem(ERROR_LOG_QUEUE_KEY);
    }
  }
};

const enqueueErrorLog = (record) => {
  const queue = readErrorLogQueue();
  writeErrorLogQueue([...queue, record]);
};

const sendErrorLog = async (record) => {
  if (typeof fetch !== "function") return false;

  try {
    const response = await fetch(getErrorLogEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    return Boolean(response?.ok);
  } catch (_) {
    return false;
  }
};

export const flushPendingErrorLogs = async () => {
  if (isFlushingErrorLogs) return false;

  const queue = readErrorLogQueue();
  if (queue.length === 0) return true;

  isFlushingErrorLogs = true;
  const failedLogs = [];

  try {
    for (const record of queue) {
      const sent = await sendErrorLog(record);
      if (!sent) failedLogs.push(record);
    }
    writeErrorLogQueue(failedLogs);
    return failedLogs.length === 0;
  } finally {
    isFlushingErrorLogs = false;
  }
};

const captureErrorLog = (args) => {
  const record = createErrorLogRecord(args);
  enqueueErrorLog(record);
  flushPendingErrorLogs();
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushPendingErrorLogs();
  });

  window.setTimeout(() => {
    flushPendingErrorLogs();
  }, 1000);
}

class Logger {
  static log(...args) {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  static info(...args) {
    if (isDevelopment) {
      console.info(...args);
    }
  }

  static warn(...args) {
    if (isDevelopment) {
      console.warn(...args);
    }
  }

  static error(...args) {
    console.error(...args);
    captureErrorLog(args);
  }

  static debug(...args) {
    if (isDevelopment) {
      console.debug(...args);
    }
  }

  static table(...args) {
    if (isDevelopment) {
      console.table(...args);
    }
  }

  static group(...args) {
    if (isDevelopment) {
      console.group(...args);
    }
  }

  static groupCollapsed(...args) {
    if (isDevelopment) {
      console.groupCollapsed(...args);
    }
  }

  static groupEnd() {
    if (isDevelopment) {
      console.groupEnd();
    }
  }

  static time(label) {
    if (isDevelopment) {
      console.time(label);
    }
  }

  static timeEnd(label) {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
}

export default Logger;

export const log = Logger.log.bind(Logger);
export const info = Logger.info.bind(Logger);
export const warn = Logger.warn.bind(Logger);
export const error = Logger.error.bind(Logger);
export const debug = Logger.debug.bind(Logger);
export const table = Logger.table.bind(Logger);
export const group = Logger.group.bind(Logger);
export const groupCollapsed = Logger.groupCollapsed.bind(Logger);
export const groupEnd = Logger.groupEnd.bind(Logger);
export const time = Logger.time.bind(Logger);
export const timeEnd = Logger.timeEnd.bind(Logger);
