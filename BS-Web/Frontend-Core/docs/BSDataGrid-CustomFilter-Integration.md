# BSDataGrid with BSFilterCustom Integration

## Overview

`BSDataGrid` ตอนนี้รองรับการ filter ข้อมูลผ่าน `BSFilterCustom` component แล้ว โดยใช้ prop `bsCustomFilters` ในการรับค่า filter จาก BSFilterCustom

## Features

- ✅ รองรับทั้ง **client-side** และ **server-side** filtering
- ✅ รองรับ operators มากมาย (contains, equals, isBetween, ฯลฯ)
- ✅ Auto-reload เมื่อ filter values เปลี่ยนแปลง
- ✅ ใช้งานง่ายผ่าน state management

## Basic Usage

```jsx
import React, { useState } from "react";
import BSFilterCustom from "./components/BSFilterCustom";
import BSDataGrid from "./components/BSDataGrid";

function MyPage() {
  const [filterValues, setFilterValues] = useState([]);

  const filterFields = [
    {
      field: "item_name",
      component: "BSTextField",
      bsTitle: "ชื่อสินค้า",
      type: "string",
      defaultOperator: "contains",
    },
    {
      field: "item_date",
      component: "BSDatepicker",
      bsTitle: "วันที่",
      type: "date",
      defaultOperator: "isBetween",
    },
  ];

  return (
    <>
      {/* Custom Filter */}
      <BSFilterCustom
        bsFilterField={filterFields}
        bsFilterValue={filterValues}
        bsFilterValueOnChanage={(values) => setFilterValues(values)}
        bsSearch={true}
        bsClear={true}
      />

      {/* DataGrid with Custom Filters */}
      <BSDataGrid
        bsObj="t_items"
        bsCustomFilters={filterValues} // ส่งค่า filter เข้ามา
        bsFilterMode="client" // หรือ "server"
      />
    </>
  );
}
```

## Props

### bsCustomFilters

- **Type**: `Array<FilterObject>`
- **Default**: `[]`
- **Description**: Array ของ filter objects จาก BSFilterCustom

**Filter Object Structure**:

```typescript
{
  field: string;       // ชื่อ field ที่ต้องการ filter
  operator: string;    // operator (contains, equals, isBetween, ฯลฯ)
  value: any;          // ค่าที่ต้องการ filter
  value2?: any;        // ค่าที่ 2 (สำหรับ isBetween operator)
}
```

## Filtering Modes

### Client-Side Filtering (`bsFilterMode="client"`)

- ดึงข้อมูลทั้งหมดมาจาก API ครั้งเดียว
- Filter ทำงานใน browser
- เหมาะสำหรับข้อมูลน้อยกว่า 1,000 rows
- Filter แบบ instant (ไม่ต้อง call API ใหม่)

```jsx
<BSDataGrid
  bsObj="t_customers"
  bsCustomFilters={filterValues}
  bsFilterMode="client" // Client-side filtering
/>
```

### Server-Side Filtering (`bsFilterMode="server"`)

- ส่ง filter conditions ไป API
- API ทำ filtering ให้
- เหมาะสำหรับข้อมูลจำนวนมาก
- ลด data transfer

```jsx
<BSDataGrid
  bsObj="t_orders"
  bsCustomFilters={filterValues}
  bsFilterMode="server" // Server-side filtering
/>
```

## Supported Operators

### String Operators

- `equals` - เท่ากับ
- `contains` - มีข้อความอยู่ใน
- `startsWith` - เริ่มต้นด้วย
- `endsWith` - ลงท้ายด้วย
- `isEmpty` - ว่างเปล่า
- `isNotEmpty` - ไม่ว่างเปล่า
- `isAnyOf` - อยู่ในรายการ (array)
- `not` / `!=` - ไม่เท่ากับ

### Number/Date Operators

- `equals` / `is` - เท่ากับ
- `>` / `after` - มากกว่า / หลังจาก
- `>=` / `onOrAfter` - มากกว่าเท่ากับ / เท่ากับหรือหลังจาก
- `<` / `before` - น้อยกว่า / ก่อน
- `<=` / `onOrBefore` - น้อยกว่าเท่ากับ / เท่ากับหรือก่อน
- `isBetween` - อยู่ระหว่าง (ต้องมี value และ value2)
- `not` - ไม่เท่ากับ

## Complete Example

```jsx
import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import BSFilterCustom from "./components/BSFilterCustom";
import BSDataGrid from "./components/BSDataGrid";

export default function ProductListPage() {
  const [filterValues, setFilterValues] = useState([]);

  // Filter Fields Configuration
  const filterFields = [
    {
      field: "product_name",
      component: "BSTextField",
      bsTitle: "ชื่อสินค้า",
      type: "string",
      defaultOperator: "contains",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
    {
      field: "category_id",
      component: "BSAutoComplete",
      bsMode: "single",
      bsTitle: "หมวดหมู่",
      bsPreObj: "default",
      bsObj: "t_categories",
      bsColumes: [
        { field: "category_id", display: false, key: true },
        { field: "category_name", display: true, filter: true },
      ],
      type: "string",
      defaultOperator: "equals",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
    {
      field: "price",
      component: "BSTextField",
      bsTitle: "ราคา",
      type: "float",
      decimals: 2,
      defaultOperator: "isBetween",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
    {
      field: "create_date",
      component: "BSDatepicker",
      bsTitle: "วันที่สร้าง",
      type: "date",
      defaultOperator: "isBetween",
      format: "DD/MM/YYYY",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Custom Filter */}
      <Paper sx={{ mb: 2 }}>
        <BSFilterCustom
          bsFilterField={filterFields}
          bsFilterValue={filterValues}
          bsFilterValueOnChanage={(values) => {
            console.log("Filter values changed:", values);
            setFilterValues(values);
          }}
          bsSearch={true}
          bsClear={true}
          spacing={2}
        />
      </Paper>

      {/* DataGrid */}
      <Paper sx={{ height: 600 }}>
        <BSDataGrid
          // Table Configuration
          bsObj="t_products"
          bsCols="product_name,category_name,price,stock_qty,create_date"
          bsObjBy="product_name asc"
          // Filtering
          bsFilterMode="client"
          bsCustomFilters={filterValues}
          // Features
          bsShowRowNumber={true}
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          // Pagination
          bsRowPerPage={25}
          // Callbacks
          onDataBind={(data) => {
            console.log(`Loaded ${data.length} products`);
          }}
        />
      </Paper>
    </Box>
  );
}
```

## How It Works

### Client-Side Mode

1. BSFilterCustom สร้าง filter values เมื่อ user กดปุ่ม "ค้นหา"
2. Filter values ถูกส่งผ่าน state ไปยัง BSDataGrid
3. BSDataGrid ดึงข้อมูลทั้งหมดจาก API
4. BSDataGrid apply filters ให้กับข้อมูลใน browser
5. แสดงผลเฉพาะข้อมูลที่ผ่าน filter

### Server-Side Mode

1. BSFilterCustom สร้าง filter values เมื่อ user กดปุ่ม "ค้นหา"
2. Filter values ถูกส่งผ่าน state ไปยัง BSDataGrid
3. BSDataGrid ส่ง filter values ไปยัง API ใน `customFilters` parameter
4. API ทำ filtering และส่งข้อมูลที่ filter แล้วกลับมา
5. BSDataGrid แสดงผลข้อมูลจาก API

## API Request Format (Server-Side)

เมื่อใช้ server-side mode, BSDataGrid จะส่ง customFilters ไปยัง API:

```javascript
{
  tableName: "t_products",
  page: 1,
  pageSize: 25,
  sortModel: [...],
  filterModel: {...},
  customFilters: [
    {
      field: "product_name",
      operator: "contains",
      value: "laptop"
    },
    {
      field: "price",
      operator: "isBetween",
      value: 10000,
      value2: 50000
    }
  ]
}
```

## Tips & Best Practices

### 1. Choose Right Filter Mode

- **Client-side**: ข้อมูลน้อย, ต้องการ instant filtering
- **Server-side**: ข้อมูลมาก, ประหยัด bandwidth

### 2. Combine with Other Filters

```jsx
<BSDataGrid
  bsObj="t_orders"
  bsObjWh="status='active'" // Static filter
  bsCustomFilters={filterValues} // Dynamic filter
  bsFilterMode="client"
/>
```

### 3. Handle Empty Filters

BSDataGrid จะไม่ apply filter เมื่อ `bsCustomFilters` เป็น `[]` หรือ `null`

### 4. Debug Filter Values

```jsx
<BSFilterCustom
  bsFilterValueOnChanage={(values) => {
    console.log("Current filters:", values);
    setFilterValues(values);
  }}
/>
```

### 5. Reset Filters

```jsx
const handleClearFilters = () => {
  setFilterValues([]); // BSDataGrid จะแสดงข้อมูลทั้งหมด
};
```

## Troubleshooting

### ข้อมูลไม่ filter

1. ตรวจสอบว่า `bsCustomFilters` ถูกส่งเข้า BSDataGrid
2. ตรวจสอบว่า field name ตรงกับชื่อ column ใน database
3. เช็ค console log เพื่อดู filter values

### Filter ช้า

1. ลองเปลี่ยนจาก client-side เป็น server-side mode
2. ลดจำนวนข้อมูลที่ load ด้วย pagination

### Filter ไม่ทำงานกับ Enhanced SP

ตรวจสอบว่า:

- Column names ตรงกับที่ SP return
- bsFilterMode ตั้งค่าถูกต้อง
- SP รองรับ customFilters parameter (สำหรับ server-side)

## Related Components

- [BSFilterCustom](./BSFilterCustom.md)
- [BSDataGrid](./BSDataGrid.md)
- [BSAutoComplete](./BSAutoComplete.md)
- [BSDatepicker](./BSDatepicker.md)
- [BSTextField](./BSTextField.md)
