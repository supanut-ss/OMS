import Swal from "sweetalert2";
import secureStorage from "../utils/SecureStorage";

/**
 * Inject CSS for scrollable SweetAlert2 content
 */
const injectScrollableStyles = () => {
  const styleId = "bsalert-swal2-scrollable-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .swal2-scrollable-content .swal2-html-container {
        max-height: 60vh !important;
        overflow-y: auto !important;
        text-align: left !important;
        padding: 0 1em !important;
      }
      .swal2-scrollable-content .swal2-html-container::-webkit-scrollbar {
        width: 8px;
      }
      .swal2-scrollable-content .swal2-html-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      .swal2-scrollable-content .swal2-html-container::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      .swal2-scrollable-content .swal2-html-container::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      .swal2-dark-mode .swal2-html-container::-webkit-scrollbar-track {
        background: #2d2d2d;
      }
      .swal2-dark-mode .swal2-html-container::-webkit-scrollbar-thumb {
        background: #666;
      }
      .swal2-dark-mode .swal2-html-container::-webkit-scrollbar-thumb:hover {
        background: #888;
      }
    `;
    document.head.appendChild(style);
  }
};

// Inject styles on module load
injectScrollableStyles();

/**
 * Helper function to detect dark mode
 */
const isDarkMode = () => {
  // Check secureStorage for theme preference
  const storedTheme = secureStorage.get("theme-mode");
  return storedTheme === "dark";
};

/**
 * Get customClass based on current theme mode
 */
const getCustomClass = (additionalClasses = {}) => {
  const darkMode = isDarkMode();
  return {
    container: darkMode ? "swal2-dark-mode" : "",
    popup: `swal2-zindex-override swal2-scrollable-content${darkMode ? " swal2-dark-mode" : ""}`,
    ...additionalClasses,
  };
};

/**
 * สามารถส่งค่า options อะไรก็ได้ของ SweetAlert2
 * https://sweetalert2.github.io/#configuration
 */
const BSAlertSwal2 = {
  /**
   * fire - เรียก Swal ตาม options ที่ส่งมา
   * @param {object} options
   *   เช่น: { title, text, icon, timer, showConfirmButton, position, etc. }
   */
  fire: (options = {}) => {
    return Swal.fire({
      position: "center", // ค่า default
      allowOutsideClick: false,
      allowEscapeKey: true,
      // เพิ่ม customClass เพื่อ z-index สูงกว่า MUI Dialog และ dark mode support
      customClass: getCustomClass(options.customClass),
      ...options,
    });
  },

  /**
   * ฟังก์ชัน shortcut แบบ dynamic
   * @param {string} type - success | error | warning | info | question
   * @param {string} message - ข้อความ
   * @param {object} options - สามารถส่ง option เพิ่มเติมได้
   */
  show: (type = "info", message = "", options = {}) => {
    return BSAlertSwal2.fire({
      icon: type,
      text: message,
      ...options,
    });
  },

  /**
   * confirm - แสดง dialog ยืนยัน พร้อมปุ่ม Confirm และ Cancel
   * @param {string} message - ข้อความที่จะแสดง
   * @param {object} options - options เพิ่มเติม
   * @returns {Promise<boolean>} - true ถ้ากด Confirm, false ถ้ากด Cancel
   */
  confirm: async (message = "", options = {}) => {
    const darkMode = isDarkMode();
    const result = await BSAlertSwal2.fire({
      icon: "warning",
      text: message,
      showCancelButton: true,
      confirmButtonColor: darkMode ? "#F14C4C" : "#d33",
      cancelButtonColor: darkMode ? "#3C3C3C" : "#3085d6",
      confirmButtonText: options.confirmButtonText || "Yes, delete it!",
      cancelButtonText: options.cancelButtonText || "Cancel",
      reverseButtons: true,
      ...options,
    });
    return result.isConfirmed;
  },
};
export default BSAlertSwal2;

