import Swal from "sweetalert2";
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
      // เพิ่ม customClass เพื่อ z-index สูงกว่า MUI Dialog
      customClass: {
        popup: "swal2-zindex-override",
      },
      ...options, // spread options เพื่อให้ override ได้
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
    const result = await BSAlertSwal2.fire({
      icon: "warning",
      text: message,
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: options.confirmButtonText || "Yes, delete it!",
      cancelButtonText: options.cancelButtonText || "Cancel",
      reverseButtons: true,
      ...options,
    });
    return result.isConfirmed;
  },
};
export default BSAlertSwal2;
