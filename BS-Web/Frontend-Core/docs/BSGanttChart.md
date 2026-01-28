# BSGanttChart Documentation

## Overview

`BSGanttChart` เป็น Component สำหรับแสดงผล Gantt Chart แบบ Hierarchical ที่พัฒนาโดยใช้ SVAR React Gantt (MIT License) โดยมีรูปแบบการใช้งานคล้ายกับ BSDataGrid

### Features

- ✅ **Hierarchical Display**: แสดงข้อมูลแบบลำดับชั้น User → Project → Task
- ✅ **Date Range Filtering**: กรองข้อมูลตามช่วงวันที่
- ✅ **Employee Multi-select**: กรองข้อมูลตามพนักงาน (เลือกได้หลายคน)
- ✅ **Project Filtering**: กรองข้อมูลตาม Project
- ✅ **Configurable Scale**: ปรับมุมมอง Day/Week/Month
- ✅ **Zoom Support**: ซูมเข้า-ออกได้
- ✅ **Localization**: รองรับภาษาไทยและอังกฤษ
- ✅ **Dark Mode**: รองรับ Theme มืด
- ✅ **Custom Tooltips**: แสดง Tooltip ตามเมาส์
- ✅ **Weekend Highlighting**: ไฮไลท์วันเสาร์-อาทิตย์
- ✅ **Holiday Highlighting**: ไฮไลท์วันหยุด (สีม่วง)
- ✅ **Fullscreen Mode**: ดูแบบเต็มหน้าจอได้
- ✅ **Expand/Collapse All**: ขยาย/ยุบข้อมูลทั้งหมด
- ✅ **Sticky Headers**: Header ติดอยู่ด้านบนเมื่อ scroll

---

## Installation

Component นี้อยู่ใน folder:

```
src/components/BSGanttChart/
├── BSGanttChart.js          # Main component
├── BSGanttChartToolbar.js   # Toolbar component
├── useGanttData.js          # Data fetching hook
├── locales/                 # Language files
│   ├── index.js
│   ├── en.js
│   └── th.js
└── index.js                 # Export
```

### Import

```jsx
import BSGanttChart from "../components/BSGanttChart";
// หรือ
import { BSGanttChart } from "../components/BSGanttChart";
```

---

## Basic Usage

```jsx
import React, { useRef } from "react";
import BSGanttChart from "../components/BSGanttChart";

function MyGanttPage() {
  const ganttRef = useRef(null);

  return (
    <BSGanttChart
      ref={ganttRef}
      procedureName="tmt.usp_tmt_dashboard_project_timeline"
      title="Project Timeline"
      height={600}
    />
  );
}
```

---

## Props

### Data Source Props

| Prop              | Type     | Default | Description                           |
| ----------------- | -------- | ------- | ------------------------------------- |
| `procedureName`   | `string` | `""`    | ชื่อ Stored Procedure สำหรับดึงข้อมูล |
| `procedureParams` | `object` | `{}`    | Parameters เพิ่มเติมสำหรับ SP         |
| `preObj`          | `object` | `null`  | Schema mapping object                 |

### Filter Props

| Prop                       | Type      | Default               | Description                                              |
| -------------------------- | --------- | --------------------- | -------------------------------------------------------- |
| `showDateFilter`           | `boolean` | `true`                | แสดง/ซ่อน Date Filter                                    |
| `showEmployeeFilter`       | `boolean` | `true`                | แสดง/ซ่อน Employee Filter                                |
| `dateFilterField`          | `string`  | `"max_task_end_date"` | Field สำหรับ filter due date                             |
| `initialStartDate`         | `Date`    | `null`                | วันเริ่มต้นเริ่มแรก (default: วันแรกของเดือนปัจจุบัน)    |
| `initialEndDate`           | `Date`    | `null`                | วันสิ้นสุดเริ่มแรก (default: วันสุดท้ายของเดือนปัจจุบัน) |
| `initialSelectedEmployees` | `array`   | `[]`                  | รายชื่อพนักงานที่เลือกเริ่มแรก                           |

### Display Props

| Prop                 | Type     | Default | Description                                  |
| -------------------- | -------- | ------- | -------------------------------------------- |
| `columns`            | `array`  | `null`  | Custom columns configuration                 |
| `scales`             | `array`  | `null`  | Custom scales configuration                  |
| `initialCellWidth`   | `number` | `30`    | ความกว้างเริ่มต้นของ cell (pixels)           |
| `initialCellHeight`  | `number` | `38`    | ความสูงเริ่มต้นของ cell (pixels)             |
| `initialScaleHeight` | `number` | `40`    | ความสูงเริ่มต้นของ scale header (pixels)     |
| `initialScale`       | `string` | `"day"` | มุมมองเริ่มต้น: `"day"`, `"week"`, `"month"` |
| `height`             | `number` | `600`   | ความสูงของ Gantt Chart (pixels)              |

### Appearance Props

| Prop            | Type      | Default | Description                         |
| --------------- | --------- | ------- | ----------------------------------- |
| `title`         | `string`  | `null`  | หัวข้อแสดงด้านบน                    |
| `showToolbar`   | `boolean` | `true`  | แสดง/ซ่อน Toolbar                   |
| `readonly`      | `boolean` | `true`  | โหมด read-only (ไม่สามารถลาก/แก้ไข) |
| `resourceGroup` | `string`  | `null`  | Resource group สำหรับ localization  |
| `sx`            | `object`  | `{}`    | Custom MUI sx styles                |

### Event Props

| Prop          | Type       | Default | Description                   |
| ------------- | ---------- | ------- | ----------------------------- |
| `onTaskClick` | `function` | `null`  | Callback เมื่อคลิกที่ task    |
| `onDataLoad`  | `function` | `null`  | Callback เมื่อโหลดข้อมูลเสร็จ |
| `onError`     | `function` | `null`  | Callback เมื่อเกิด error      |

### Holiday Props

| Prop                   | Type      | Default | Description                                                       |
| ---------------------- | --------- | ------- | ----------------------------------------------------------------- |
| `holidays`             | `array`   | `[]`    | Array of holiday dates (strings หรือ objects)                     |
| `holidayTableName`     | `string`  | `null`  | ชื่อ Table สำหรับ fetch holidays โดยตรง (e.g., `"t_tmt_holiday"`) |
| `holidayProcedureName` | `string`  | `null`  | ชื่อ SP สำหรับ fetch holidays (e.g., `"usp_tmt_get_holidays"`)    |
| `holidayPreObj`        | `string`  | `null`  | Schema prefix สำหรับ holiday table/SP (e.g., `"tmt"`)             |
| `showHolidays`         | `boolean` | `true`  | แสดง/ซ่อน holiday highlighting                                    |

---

## Ref Methods

เข้าถึงผ่าน `ref`:

```jsx
const ganttRef = useRef(null);

// ใช้งาน
ganttRef.current.refresh(); // รีเฟรชข้อมูล (re-fetch จาก SP)
ganttRef.current.clearFilters(); // ล้าง filters ทั้งหมดและ reset เป็น default
ganttRef.current.getTasks(); // ดึง tasks ที่แสดงอยู่ปัจจุบัน
ganttRef.current.getAllTasks(); // ดึง tasks ทั้งหมด
ganttRef.current.setFilters({
  // ตั้งค่า filters
  startDate: new Date(),
  endDate: new Date(),
  employees: [],
});
```

---

## Data Structure

### Hierarchy Levels

ข้อมูลแสดงเป็น 3 ระดับ:

```
👤 User (สีเขียว - #66bb6a)
└── 📁 Project (สีฟ้า - #42a5f5)
    └── 📋 Task (สีส้ม - #ffa726)
```

### Task Object Structure

```javascript
{
  id: "task_xxx",           // Unique ID
  text: "Task Name",        // ชื่อที่แสดง
  type: "work_task",        // ประเภท: "user" | "project" | "work_task"
  parent: "proj_xxx",       // Parent ID (0 = root)
  start: new Date(),        // วันเริ่มต้น (adjusted for Gantt)
  end: new Date(),          // วันสิ้นสุด (adjusted for Gantt +1 day)
  progress: 0,              // ความคืบหน้า (0-1)
  open: true,               // เปิด/ปิด children
  man_day: 8.5,             // Man Day (Hours)
  actual_man_day: 6.0,      // Actual Man Day (Hours)
  originalStartDate: Date,  // วันเริ่มต้นจริง (สำหรับแสดงใน column)
  originalEndDate: Date,    // วันสิ้นสุดจริง (สำหรับแสดงใน column)
  barColor: "#ffa726",      // สี bar
  data: {
    level: "task",          // ระดับ: "user" | "project" | "task"
    taskNo: "T001",
    taskId: 123,
    barColor: "#ffa726",
    // ... custom fields
  }
}
```

### Stored Procedure Requirements

SP ต้อง return fields ดังนี้:

```sql
-- User fields
user_id, first_name, last_name

-- Project fields
project_header_id, project_no, project_name
min_task_start_date, max_task_end_date
total_task_plan_manday, total_actual_work

-- Task fields
project_task_id, task_no, task_name, task_description
task_start_date, task_end_date
task_plan_manday, actual_work
```

### SP Parameters

SP รับ parameters ดังนี้:

```sql
@in_dtStartDate       DATE        -- วันเริ่มต้น (required)
@in_dtEndDate         DATE        -- วันสิ้นสุด (required)
@in_vchProjectHeaderID INT        -- Project Header ID (optional)
@in_xmlUserID         XML         -- XML list ของ user_id (optional)
```

XML Format สำหรับ user filter:

```xml
<XMLData>
  <data_read>user1</data_read>
  <data_read>user2</data_read>
  <data_read>user3</data_read>
</XMLData>
```

---

## Default Columns

| Column ID        | Header                 | Width | Description                        |
| ---------------- | ---------------------- | ----- | ---------------------------------- |
| `text`           | ชื่อ                   | 250   | ชื่อ User/Project/Task             |
| `duration`       | Start - End Date       | 180   | วันที่เริ่ม - สิ้นสุด (DD/MM/YYYY) |
| `man_day`        | Man Day (Hours)        | 80    | Plan Man Day                       |
| `actual_man_day` | Actual Man Day (Hours) | 80    | Actual Man Day                     |

---

## Custom Columns

ถ้าต้องการ columns แบบ custom:

```jsx
const customColumns = [
  {
    id: "text",
    header: "ชื่อ",
    width: 250,
    flexgrow: 2,
  },
  {
    id: "duration",
    header: "ระยะเวลา",
    align: "center",
    width: 180,
    template: (value, row, col) => {
      const displayStart = row.originalStartDate || row.start;
      const displayEnd = row.originalEndDate || row.end;
      if (!displayStart || !displayEnd) return "-";
      const formatDate = (date) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      };
      return `${formatDate(displayStart)} - ${formatDate(displayEnd)}`;
    },
  },
  {
    id: "man_day",
    header: "Man Day",
    align: "center",
    width: 100,
    template: (value) => (value ? parseFloat(value).toFixed(2) : "-"),
  },
];

<BSGanttChart columns={customColumns} />;
```

---

## Custom Scales

```jsx
const customScales = [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" },
];

<BSGanttChart scales={customScales} />;
```

### Built-in Scale Configurations

| Scale   | Level 1      | Level 2     |
| ------- | ------------ | ----------- |
| `day`   | Month + Year | Day + Name  |
| `week`  | Month + Year | Week Number |
| `month` | Year         | Month Short |

---

## Toolbar Features

Toolbar มีฟีเจอร์ดังนี้:

| Feature             | Description                      |
| ------------------- | -------------------------------- |
| Date Range Picker   | เลือกช่วงวันที่ Start - End      |
| Employee Filter     | Multi-select พนักงาน             |
| Project Filter      | เลือก Project                    |
| Scale Selector      | เปลี่ยนมุมมอง Day/Week/Month     |
| Zoom In/Out         | ซูมเข้า-ออก (ปรับ Cell Width)    |
| Settings Popover    | ปรับ Cell Width และ Scale Height |
| Expand/Collapse All | ขยาย/ยุบข้อมูลทั้งหมด            |
| Fullscreen Toggle   | เปิด/ปิดโหมดเต็มหน้าจอ           |
| Refresh Button      | รีเฟรชข้อมูล                     |
| Clear Filters       | ล้าง filters ทั้งหมด             |

---

## Events

### onTaskClick

```jsx
const handleTaskClick = (task) => {
  console.log("Clicked task:", task);
  // เปิด dialog แสดงรายละเอียด
  setSelectedTask(task);
  setDialogOpen(true);
};

<BSGanttChart onTaskClick={handleTaskClick} />;
```

### onDataLoad

```jsx
const handleDataLoad = (rawData) => {
  console.log("Data loaded:", rawData.length, "rows");
  // rawData คือข้อมูลดิบจาก SP ก่อน transform
};

<BSGanttChart onDataLoad={handleDataLoad} />;
```

### onError

```jsx
const handleError = (error) => {
  console.error("Error:", error);
  showSnackbar("เกิดข้อผิดพลาด: " + error.message, "error");
};

<BSGanttChart onError={handleError} />;
```

---

## Localization

### Supported Languages

- Thai (`th`) - Default
- English (`en`)

ระบบจะใช้ภาษาจาก `SecureStorage.get("lang")` อัตโนมัติ

### Available Locale Keys

```javascript
{
  bsColumnName: "ชื่อ",
  bsColumnDuration: "ระยะเวลา",
  bsColumnManDay: "Man Day (ชม.)",
  bsColumnActualManDay: "Actual Man Day (ชม.)",
  bsNoData: "ไม่มีข้อมูล",
  bsStartDate: "เริ่ม",
  bsEndDate: "สิ้นสุด",
  bsProgress: "ความคืบหน้า",
  bsLoading: "กำลังโหลด...",
  bsError: "เกิดข้อผิดพลาด",
  bsRefresh: "รีเฟรช",
  bsClearFilters: "ล้างตัวกรอง",
  bsExpandAll: "ขยายทั้งหมด",
  bsCollapseAll: "ยุบทั้งหมด",
  // ... more
}
```

---

## Styling

### Task Bar Colors

สีถูกกำหนดตาม `type` และ `data.level` ของ task:

| Level   | Type        | สี    | Hex Code  |
| ------- | ----------- | ----- | --------- |
| User    | `user`      | เขียว | `#66bb6a` |
| Project | `project`   | ฟ้า   | `#42a5f5` |
| Task    | `work_task` | ส้ม   | `#ffa726` |

### Custom Styling with sx

```jsx
<BSGanttChart
  sx={{
    "& .wx-gantt .wx-bar.wx-task.user": {
      backgroundColor: "#your-color !important",
    },
  }}
/>
```

### Weekend Highlighting

วันเสาร์-อาทิตย์จะถูกไฮไลท์ด้วยสีแดงอ่อน อัตโนมัติ

### Holiday Highlighting

วันหยุดจะถูกไฮไลท์ด้วยสีม่วงอ่อน มี 3 วิธีในการส่งข้อมูลวันหยุด:

**วิธีที่ 1: ส่ง Array ผ่าน props โดยตรง**

```jsx
// Array of date strings
<BSGanttChart
  holidays={['2026-01-01', '2026-04-13', '2026-04-14', '2026-04-15']}
  showHolidays={true}
/>

// Array of objects with date and name
<BSGanttChart
  holidays={[
    { date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
    { date: '2026-04-13', name: 'วันสงกรานต์' },
    { date: '2026-04-14', name: 'วันสงกรานต์' },
    { date: '2026-04-15', name: 'วันสงกรานต์' },
  ]}
  showHolidays={true}
/>
```

**วิธีที่ 2: Query จาก Table โดยตรง (แนะนำ)**

```jsx
<BSGanttChart
  holidayTableName="t_tmt_holiday"
  holidayPreObj="tmt"
  showHolidays={true}
/>
```

Table structure:

```sql
CREATE TABLE [tmt].[t_tmt_holiday](
  [holiday_id] INT IDENTITY(1,1) PRIMARY KEY,
  [holiday_date] DATE NOT NULL,
  [holiday_name] NVARCHAR(100) NOT NULL,
  [description] NVARCHAR(255) NULL,
  [is_active] VARCHAR(3) NOT NULL,  -- 'YES' or 'NO'
  ...
)
```

API จะ query ด้วย condition `is_active = 'YES'`

**วิธีที่ 3: Query จาก Stored Procedure**

```jsx
<BSGanttChart
  holidayProcedureName="usp_tmt_get_holidays"
  holidayPreObj="tmt"
  showHolidays={true}
/>
```

SP ต้อง return fields:

- `holiday_date` หรือ `date` - วันที่ (DATE)
- `holiday_name` หรือ `name` - ชื่อวันหยุด (NVARCHAR)

### Dark Mode Support

Component รองรับ Dark Mode อัตโนมัติ โดยจะปรับ:

- Header background color
- Scale background color
- Holiday highlight color (ม่วง)
- Fullscreen button style

---

## Complete Example

```jsx
import React, { useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import BSGanttChart from "../components/BSGanttChart";

function ProjectTimeline() {
  const ganttRef = useRef(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    console.log("Selected:", task);
  };

  const handleRefresh = () => {
    ganttRef.current?.refresh();
  };

  const handleClearFilters = () => {
    ganttRef.current?.clearFilters();
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button onClick={handleRefresh}>Refresh</Button>
        <Button onClick={handleClearFilters}>Clear Filters</Button>
      </Box>

      <BSGanttChart
        ref={ganttRef}
        procedureName="tmt.usp_tmt_dashboard_project_timeline"
        title="Project Timeline"
        height={700}
        initialScale="day"
        initialCellWidth={30}
        showToolbar={true}
        readonly={true}
        // Holiday highlighting from Table
        holidayTableName="t_tmt_holiday"
        holidayPreObj="tmt"
        showHolidays={true}
        onTaskClick={handleTaskClick}
        onDataLoad={(data) => console.log("Loaded:", data.length)}
        onError={(err) => console.error("Error:", err)}
        sx={{ borderRadius: 2 }}
      />

      {selectedTask && (
        <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100" }}>
          <strong>Selected:</strong> {selectedTask.text}
        </Box>
      )}
    </Box>
  );
}

export default ProjectTimeline;
```

---

## Troubleshooting

### ข้อมูลไม่แสดง

1. ตรวจสอบว่า `procedureName` ถูกต้อง
2. ตรวจสอบ Console สำหรับ error
3. ตรวจสอบว่า SP return ข้อมูลถูกต้อง
4. ตรวจสอบว่า SP parameters ถูกส่งไปถูกต้อง

### สีไม่เปลี่ยน

1. ตรวจสอบว่า `type` ของ task ถูกต้อง (`user`, `project`, `work_task`)
2. CSS specificity อาจไม่เพียงพอ ใช้ `!important`

### Tooltip ไม่แสดง

1. รอให้ render เสร็จก่อน (มี delay 500ms)
2. ตรวจสอบว่า tasks มี `start` และ `end` dates

### วันที่แสดงผิด

1. SP ต้อง return DATE type ไม่ใช่ DATETIME
2. Component จะ normalize date โดยดึงเฉพาะ date part จาก string

### Holiday ไม่แสดง

1. ตรวจสอบว่า `showHolidays={true}`
2. ตรวจสอบว่า table มี field `is_active = 'YES'`
3. ตรวจสอบว่า date format ถูกต้อง (YYYY-MM-DD)

### Performance ช้า

1. จำกัดช่วงวันที่ให้แคบลง
2. ใช้ `initialScale="month"` สำหรับข้อมูลจำนวนมาก
3. ลดจำนวน employees ที่เลือก

---

## Dependencies

- `@svar-ui/react-gantt` - SVAR React Gantt (MIT)
- `@mui/material` - Material UI
- `@mui/x-date-pickers` - MUI Date Pickers
- `dayjs` - Date library
- `react` - React 18+

---

## Version History

| Version | Date       | Changes                                        |
| ------- | ---------- | ---------------------------------------------- |
| 1.0.0   | 2026-01-20 | Initial release                                |
| 1.1.0   | 2026-01-21 | Added tooltip, weekend highlighting, zoom      |
| 1.2.0   | 2026-01-25 | Added holiday highlighting, fullscreen mode    |
| 1.3.0   | 2026-01-28 | Fixed multi-user XML parameter, sticky headers |

---

## Author

BS Platform Team
