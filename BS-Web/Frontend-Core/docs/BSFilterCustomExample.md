# 🧩 BSFilterCustom Example

ตัวอย่างการใช้งาน `BSFilterCustom` component สำหรับการสร้างฟิลเตอร์ค้นหาแบบ dynamic ด้วย React และ Material UI

---

## 📦 Example Code

```jsx
import React, { useState } from "react";
import BSFilterCustom from "../components/BSFilterCustom";

export default function BSFilterCustomExamples() {
  const [valueFilter, setValueFilter] = useState([]);

  const filterFields = [
    {
      field: "item_name",
      component: "BSTextField",
      bsTitle: "ชื่อสินค้า",
      type: "string",
      grid: { md: 4, lg: 3 },
      defaultOperator: "LIKE"
    },
    {
      field: "item_start",
      component: "BSDatepicker",
      bsTitle: "วันที่เริ่มต้น",
      type: "date",
      grid: { md: 4, lg: 4 },
      defaultOperator: ">="
    },
    {
      field: "item_end",
      component: "BSDatepicker",
      bsTitle: "วันที่สิ้นสุด",
      type: "date",
      grid: { md: 4, lg: 4 },
      defaultOperator: "<="
    },
    {
      field: "item_price",
      component: "BSTextField",
      bsTitle: "ราคา",
      type: "float",
      decimals: 2,
      grid: { md: 4, lg: 4 },
      defaultOperator: "="
    },
    {
      field: "combobox",
      component: "BSAutoComplete",
      bsMode: "single",
      bsTitle: "เลือก Item เดียว",
      bsPreObj: "sec.t_com_",
      bsObj: "combobox_item",
      bsColumes: [
        { field: "combo_box_id", display: false, filter: false, key: true },
        { field: "value_member", display: true, filter: true, key: true },
        { field: "group_name", display: false, filter: true, key: false }
      ],
      bsObjBy: "",
      bsObjWh: "",
      bsLoadOnOpen: true,
      grid: { md: 4, lg: 4 },
      defaultOperator: "="
    }
  ];

  return (
    <div style={{ padding: 20 }}>
      <BSFilterCustom
        bsFilterField={filterFields}
        bsFilterValue={valueFilter}
        bsFilterValueOnChanage={(e) => setValueFilter(e)}
        bsSearch={true}
        bsClear={true}
      />
    </div>
  );
}
```

---

## 🧠 Props ที่ใช้ใน `BSFilterCustom`

| Prop | Type | Description |
|------|------|-------------|
| `bsFilterField` | `Array` | รายการของฟิลด์ที่ต้องการให้แสดงในฟิลเตอร์ |
| `bsFilterValue` | `Array` | ค่าปัจจุบันของฟิลเตอร์ |
| `bsFilterValueOnChanage` | `Function` | callback เมื่อค่าฟิลเตอร์เปลี่ยน |
| `bsSearch` | `Boolean` | show ปุ่มค้นหา |
| `bsClear` | `Boolean` | show ปุ่มล้างค่า |

---

## 🧩 Supported Components

- `BSTextField` — กล่องข้อความทั่วไป  
- `BSDatepicker` — สำหรับเลือกวันที่  
- `BSAutoComplete` — dropdown แบบ autocomplete รองรับ single/multi select  

---

## 🧪 การทำงานของระบบ
เมื่อผู้ใช้กรอกหรือเลือกค่าในแต่ละช่อง ระบบจะอัปเดตค่าใน `valueFilter` และส่งผลลัพธ์ผ่าน `bsFilterValueOnChanage` เพื่อให้สามารถนำข้อมูลไปใช้กับ API หรือระบบค้นหาได้ทันที
