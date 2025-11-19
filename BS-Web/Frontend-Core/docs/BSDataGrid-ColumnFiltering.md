# การใช้งาน BSDataGrid พร้อม Column Filtering

## ปัญหาที่แก้ไข

ปัญหาที่พบคือเมื่อกำหนด `bsCols` แล้ว แต่ DataGrid ยังคงแสดงทุกคอลัมน์ใน database แทนที่จะแสดงเฉพาะคอลัมน์ที่ระบุ

## การแก้ไข

1. **แก้ไข Function `applyColumnFiltering`**: เพิ่ม debug logging และปรับปรุงการทำงาน
2. **แก้ไข Dependencies**: เพิ่ม `parsedCols` ใน dependencies ของ `useMemo`
3. **เพิ่ม Debug Logging**: เพื่อตรวจสอบการทำงานของ column filtering

## ตัวอย่างการใช้งาน

### 1. แสดงเฉพาะคอลัมน์ที่ระบุ

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  bsCols="id,name,email,phone" // แสดงเฉพาะ 4 คอลัมน์นี้
  bsRowPerPage={25}
/>
```

### 2. แสดงเฉพาะ 2 คอลัมน์

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  bsCols="name,email" // แสดงเฉพาะ name และ email
  bsRowPerPage={25}
/>
```

### 3. แสดงทุกคอลัมน์ (ไม่กำหนด bsCols)

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  // ไม่กำหนด bsCols = แสดงทุกคอลัมน์
  bsRowPerPage={25}
/>
```

## Debug Logs ที่จะเห็น

เมื่อใช้งาน จะเห็น logs ใน Console:

- `📋 Parsed bsCols:` - แสดงการ parse คอลัมน์
- `🔍 applyColumnFiltering called:` - แสดงการทำงานของ filter
- `✅ Column filtering applied:` - แสดงผลลัพธ์การ filter

## หมายเหตุ

- คอลัมน์ Actions จะแสดงเสมอ (ถ้าไม่ได้ set `readOnly={true}`)
- ชื่อคอลัมน์ใน `bsCols` ต้องตรงกับชื่อใน database
- ใช้เครื่องหมาย comma (,) ในการแยกชื่อคอลัมน์
- ไม่ควรมี space รอบชื่อคอลัมน์ (จะถูก trim อัตโนมัติ)
