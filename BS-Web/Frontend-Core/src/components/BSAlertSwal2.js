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
};
export default BSAlertSwal2;
