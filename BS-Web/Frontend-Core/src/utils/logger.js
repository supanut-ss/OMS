/**
 * Logger utility สำหรับจัดการ console.log ใน production
 */

import Config from './Config';

const isDevelopment = process.env.NODE_ENV === "development";

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
    // Error ควรแสดงใน production ด้วย
    console.error(...args);
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

// Export เป็น individual functions ด้วย
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
