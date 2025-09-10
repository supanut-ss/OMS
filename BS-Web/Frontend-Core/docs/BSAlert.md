
# BSAlert.md

# 📌 BSAlert Components

ชุด component สำหรับแสดง Alert หลายรูปแบบ (MUI + SweetAlert2)  
รองรับทั้งการแสดงข้อความเตือนภายในหน้า (inline), แบบ snackbar, และ popup modal  

---

## 1. BSAlert

ใช้ `@mui/material/Alert` + `Collapse`  
เหมาะสำหรับแสดงข้อความแจ้งเตือน **inline** ภายใน UI  

### Example

```jsx
import BSAlert from "./BSAlert";

<BSAlert
  open={true}
  severity="success"   // success | info | warning | error
  variant="filled"     // standard | outlined | filled
  title="บันทึกสำเร็จ"
  message="ข้อมูลถูกบันทึกเรียบร้อยแล้ว"
  onClose={() => console.log("alert closed")}
/>
```

### Props

| Prop       | Type       | Default    | Description |
|------------|-----------|-----------|-------------|
| `open`     | boolean   | `true`    | แสดงหรือซ่อน Alert |
| `severity` | string    | `success` | ระดับการแจ้งเตือน (`success`, `info`, `warning`, `error`) |
| `variant`  | string    | `standard`| รูปแบบ (`standard`, `outlined`, `filled`) |
| `title`    | string    | -         | หัวข้อของ Alert |
| `message`  | string    | -         | เนื้อหาของ Alert |
| `onClose`  | function  | -         | callback เมื่อ Alert ถูกปิด |
| `action`   | ReactNode | -         | ปุ่มหรือ action เพิ่มเติม |
| `icon`     | ReactNode | -         | ไอคอน custom |
| `sx`       | object    | -         | custom style (MUI sx) |

---

## 2. BSAlertSnackbar

ใช้ `@mui/material/Snackbar` + `Alert`  
เหมาะสำหรับแสดงการแจ้งเตือนแบบ **ชั่วคราว** (auto hide)  

### Example

```jsx
import BSAlertSnackbar from "./BSAlertSnackbar";
import { useState } from "react";

function DemoSnackbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Show Snackbar</button>
      <BSAlertSnackbar
        open={open}
        message="เซฟข้อมูลเรียบร้อยแล้ว!"
        severity="success"
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

### Props

| Prop              | Type       | Default | Description |
|-------------------|-----------|---------|-------------|
| `open`            | boolean   | -       | เปิด/ปิด snackbar |
| `message`         | string    | `""`    | ข้อความแจ้งเตือน |
| `autoHideDuration`| number    | `5000`  | เวลาที่ snackbar ซ่อนอัตโนมัติ (ms) |
| `severity`        | string    | `info`  | ระดับการแจ้งเตือน (`success`, `error`, `warning`, `info`) |
| `onClose`         | function  | -       | callback เมื่อ snackbar ปิด |

---

## 3. BSAlertSwal2

Wrapper ของ [SweetAlert2](https://sweetalert2.github.io/)  
ใช้แสดง alert แบบ popup modal  

### Example

```jsx
import BSAlertSwal2 from "./BSAlertSwal2";

// แบบกำหนด options เอง
BSAlertSwal2.fire({
  title: "ลบข้อมูล?",
  text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "ใช่, ลบเลย",
});

// แบบใช้ shortcut
BSAlertSwal2.show("success", "บันทึกเรียบร้อยแล้ว!");
```

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `fire(options)` | `options: object` | เรียก SweetAlert2 โดยส่ง config object ได้ตามต้องการ |
| `show(type, message, options)` | `type: string` (success, error, warning, info, question), `message: string`, `options: object` | shortcut สำหรับเรียก Swal แบบง่าย |

---

## 📖 สรุปการใช้งาน

- ใช้ `BSAlert` 👉 สำหรับ inline alert ที่ฝังอยู่ใน layout  
- ใช้ `BSAlertSnackbar` 👉 สำหรับ alert สั้นๆ กลางจอ แล้วหายไปเอง  
- ใช้ `BSAlertSwal2` 👉 สำหรับ popup modal ที่ interactive เช่น ยืนยัน/แจ้งเตือน  
