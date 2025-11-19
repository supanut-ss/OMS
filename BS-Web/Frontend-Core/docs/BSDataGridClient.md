# BSDataGridClient Component

BSDataGridClient เป็น component ที่พัฒนาขึ้นจาก BSDataGrid สำหรับการแสดงข้อมูล JSON ในรูปแบบ DataGrid แบบ client-side เท่านั้น โดยไม่ต้องเชื่อมต่อกับ server และเป็น view-only (ไม่สามารถ edit/delete ได้)

## คุณสมบัติหลัก

- ✅ **Client-side Operation**: ทำงานกับข้อมูล JSON โดยไม่ต้องเชื่อมต่อ server
- ✅ **View-only Mode**: แสดงข้อมูลเท่านั้น ไม่มีการแก้ไขหรือลบ
- ✅ **Auto Column Detection**: สร้าง columns อัตโนมัติจากข้อมูล หรือกำหนดเอง
- ✅ **Client-side Filtering**: กรองข้อมูลฝั่ง client
- ✅ **Client-side Sorting**: เรียงลำดับข้อมูลฝั่ง client
- ✅ **Quick Search**: ค้นหาข้อมูลแบบเร็ว
- ✅ **Row Numbering**: แสดงเลขลำดับแถว
- ✅ **Column Filtering**: กรองคอลัมน์ที่ต้องการแสดง
- ✅ **Column Pinning**: ตรึงคอลัมน์ซ้าย/ขวา
- ✅ **Row Selection**: เลือกแถวด้วย checkbox
- ✅ **Multi-language**: รองรับภาษาไทย/อังกฤษ
- ✅ **Custom Formatting**: จัดรูปแบบข้อมูลตามประเภท (เงิน, วันที่, เปอร์เซ็นต์)

## การใช้งานพื้นฐาน

```jsx
import BSDataGridClient from "./components/BSDataGridClient";

const MyComponent = () => {
  const data = [
    { id: 1, name: "John", age: 30, salary: 50000, active: true },
    { id: 2, name: "Jane", age: 28, salary: 55000, active: true },
  ];

  return <BSDataGridClient data={data} height="400px" />;
};
```

## การใช้งานแบบเต็ม

```jsx
<BSDataGridClient
  data={jsonData}
  columns={columnDefs}
  bsLocale="th"
  bsCols="name,email,phone"
  bsPinColsLeft="name,email"
  bsPinColsRight="actions"
  bsRowPerPage={25}
  bsShowCheckbox={true}
  bsShowRowNumber={true}
  height="600px"
  onRowClick={(row) => console.log("Clicked:", row)}
  onView={(row) => console.log("View:", row)}
  onCheckBoxSelected={(rows) => console.log("Selected:", rows)}
/>
```

## Props

### Data Props

| Prop      | Type    | Default | Description                                      |
| --------- | ------- | ------- | ------------------------------------------------ |
| `data`    | `Array` | `[]`    | Array ของข้อมูล JSON objects                     |
| `columns` | `Array` | `[]`    | คำจำกัดความ columns (ถ้าไม่ระบุจะ auto-generate) |

### Configuration Props

| Prop              | Type      | Default | Description                                     |
| ----------------- | --------- | ------- | ----------------------------------------------- |
| `bsLocale`        | `string`  | `"en"`  | ภาษา (`"th"` หรือ `"en"`)                       |
| `bsCols`          | `string`  | -       | รายชื่อ columns ที่ต้องการแสดง (คั่นด้วย comma) |
| `bsPinColsLeft`   | `string`  | -       | รายชื่อ columns ที่ตรึงซ้าย                     |
| `bsPinColsRight`  | `string`  | -       | รายชื่อ columns ที่ตรึงขวา                      |
| `bsRowPerPage`    | `number`  | `25`    | จำนวนแถวต่อหน้า                                 |
| `bsShowCheckbox`  | `boolean` | `false` | แสดง checkbox selection                         |
| `bsShowRowNumber` | `boolean` | `true`  | แสดงเลขลำดับแถว                                 |

### UI Props

| Prop          | Type      | Default  | Description         |
| ------------- | --------- | -------- | ------------------- |
| `height`      | `string`  | `"auto"` | ความสูงของ DataGrid |
| `showToolbar` | `boolean` | `true`   | แสดง toolbar        |

### Event Props

| Prop                 | Type       | Description                          |
| -------------------- | ---------- | ------------------------------------ |
| `onRowClick`         | `function` | เมื่อคลิกแถว `(row) => {}`           |
| `onView`             | `function` | เมื่อคลิกปุ่ม View `(row) => {}`     |
| `onCheckBoxSelected` | `function` | เมื่อเลือกแถว `(selectedRows) => {}` |

## Column Definitions

เมื่อต้องการกำหนด columns แบบ custom:

```jsx
const columnDefs = [
  {
    field: "name",
    headerName: "ชื่อ-นามสกุล",
    width: 200,
    type: "string",
  },
  {
    field: "salary",
    headerName: "เงินเดือน",
    width: 120,
    type: "currency", // หรือ "number"
    format: "currency",
  },
  {
    field: "joinDate",
    headerName: "วันที่เริ่มงาน",
    width: 120,
    type: "date",
  },
  {
    field: "isActive",
    headerName: "สถานะ",
    width: 100,
    type: "boolean",
  },
];
```

### Column Types

- `"string"` - ข้อความ
- `"number"` - ตัวเลข
- `"boolean"` - true/false แสดงเป็น Chip
- `"date"` - วันที่
- `"datetime"` - วันที่และเวลา
- `"currency"` - เงิน (แสดงเป็นรูปแบบสกุลเงิน)

### Format Options

- `"currency"` - จัดรูปแบบเงิน (THB)
- `"percentage"` - จัดรูปแบบเปอร์เซ็นต์
- `"date"` - จัดรูปแบบวันที่
- `"datetime"` - จัดรูปแบบวันที่และเวลา

## ตัวอย่างการใช้งาน

### 1. Auto-generated Columns

```jsx
const data = [{ id: 1, name: "John", email: "john@example.com", age: 30 }];

<BSDataGridClient data={data} />;
```

### 2. Column Filtering

```jsx
<BSDataGridClient
  data={data}
  bsCols="name,email,age" // แสดงเฉพาะ 3 columns
/>
```

### 3. Row Selection

```jsx
<BSDataGridClient
  data={data}
  bsShowCheckbox={true}
  onCheckBoxSelected={(selected) => {
    console.log("Selected rows:", selected);
  }}
/>
```

### 4. Custom View Action

```jsx
<BSDataGridClient
  data={data}
  onView={(row) => {
    alert(`View details for: ${row.name}`);
  }}
/>
```

### 5. Column Pinning

```jsx
<BSDataGridClient
  data={data}
  bsPinColsLeft="name,email" // ตรึงซ้าย
  bsPinColsRight="status" // ตรึงขวา
/>
```

## ความแตกต่างจาก BSDataGrid

| Feature         | BSDataGrid    | BSDataGridClient   |
| --------------- | ------------- | ------------------ |
| Data Source     | Server API    | JSON Array         |
| Edit/Delete     | ✅            | ❌ (View-only)     |
| Filtering       | Server-side   | Client-side        |
| Sorting         | Server-side   | Client-side        |
| Pagination      | Server-side   | Client-side        |
| Bulk Operations | ✅            | ❌                 |
| Add Records     | ✅            | ❌                 |
| Metadata        | Auto from API | Manual/Auto detect |

## การทดสอบ

เข้าไปดูตัวอย่างได้ที่: `/examples/bsdatagridclient`

```
http://localhost:3000/examples/bsdatagridclient
```

## การพัฒนาเพิ่มเติม

หากต้องการเพิ่มคุณสมบัติใหม่:

1. เพิ่ม props ใน component
2. เพิ่มการจัดการ props ใน useMemo
3. เพิ่มตัวอย่างใน BSDataGridClientExample
4. อัปเดต documentation

---

**หมายเหตุ**: Component นี้เหมาะสำหรับการแสดงข้อมูลที่มีขนาดไม่ใหญ่มาก เนื่องจากทำงานฝั่ง client ทั้งหมด หากมีข้อมูลมากควรใช้ BSDataGrid แทน
