# BsAutoComplete Documentation

## Overview

BsAutoComplete เป็น AutoComplete component ที่พัฒนาขึ้นจาก MUI X เพื่อใช้งานในระบบ BS Platform โดยรองรับ:

- การสร้าง AutoComplete อัตโนมัติจาก metadata ของข้อมูล
- รองรับ properties แบบ BS (Business System) format
- รองรับการ Select Data แบบ single , multi และ select ธรรมดา
- **ใหม่**: รองรับ BS Platform API endpoints ที่เพิ่มขึ้น

## Basic Usage

```jsx
import BSDataGrid from "../components/BsAutoComplete";

function MyComponent() {
  return <BsAutoComplete
  bsModel="select" // single , multi ,select
  bsTitle="เลือก Platform" // ข้อความที่จะแสดง label บนช่อง
  bsPreObj="combo_box_id" // ค่าที่ต้องนำไปใช้งานต่อ
  bsObj="sec.t_com_combobox_item" // table ที่จะเรียกใช้งาน
  bsColumes={[
    { field: "combo_box_id", display: false },
    { field: "value_member", display: true, order_by: "ASC" },
    { field: "group_name", display: false }
  ]} //ข้อมูลที่จะต้อง select จาก table
  bsFilters={[{ field: "group_name", op: "=", value: "platform" }]} // where ข้อมูล
  bsValue="1" // ค่าเริ่มต้น = code ของ option 
  cacheKey="comboBoxItemsCache" // keyword ที่ต้องการเก็บบน localstore
  loadOnOpen={true} // ให้ loading ตอนกด คลิก autocomplete
  bsOnChange={(val) => console.log("เลือก platform:", val)} // value ที่เลือกจาก autocomplete single และ select จะออกมาในรูปแบบ string และ multi จะออกมาให้รูปแบบ array ["1","2"] 
/>;
}
```

## Properties

### BS Properties (ใหม่)

| Property             | Type           | Default                   | Description                                 |
| -------------------- | ---------------| --------------------------| ------------------------------------------- |
| `bsModel`            | string         | "select"                  | ลองรับ select , single multi                 |
| `bsTitle`            | string         | "เลือก Platform"           | ชื่อที่แสดงบน lable                            |
| `bsPreObj`           | string         | "combo_box_id"            | primary_key                                 |
| `bsObj`              | string         | "sec.t_com_combobox_item" | table ที่ต้องการดึงมาเป็น select                 |
| `bsColumes`          | array          | [{...}]                   | ชุดข้อมูลที่ต้องการ select ออกมาจาก table        |
| `bsFilters`          | array          | [{...}]                   | งื่อนไขการกรอง (SQL WHERE format)             |
| `bsValue`            | string,array   |                           | ขึ้นอยู่กลับ model ที่เลือกใช้งาน                   |
| `cacheKey`           | string         | string                    | กำหนดชื่อตามความต้องการเพื่อเก็บข้อมูลบน localstorag|
| `loadOnOpen`         | boolean        | true                      | เปิดใช้งาน การ click แล้วค่อย call ข้อมูล          |
| `bsOnChange`         | string,array   |                           | ขึ้นอยู่กลับ model ที่เลือกใช้งาน                   |

### Legacy Properties (เก่า - ยังใช้ได้)

| Property      | Type     | Default | Description            |
| ------------- | -------- | ------- | ---------------------- |
| `tableName`   | string   | -       | ชื่อตาราง (รูปแบบเก่า) |
| `onEdit`      | function | -       | Callback สำหรับ edit   |
| `onDelete`    | function | -       | Callback สำหรับ delete |
| `onAdd`       | function | -       | Callback สำหรับ add    |
| `onView`      | function | -       | Callback สำหรับ view   |
| `readOnly`    | boolean  | false   | โหมดอ่านอย่างเดียว     |
| `showToolbar` | boolean  | true    | แสดง toolbar           |
| `showAdd`     | boolean  | true    | แสดงปุ่ม Add           |
| `height`      | number   | 600     | ความสูงของ DataGrid    |
| `autoLoad`    | boolean  | true    | โหลดข้อมูลอัตโนมัติ    |
