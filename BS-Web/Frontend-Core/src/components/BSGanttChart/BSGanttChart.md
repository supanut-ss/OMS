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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `procedureName` | `string` | `""` | ชื่อ Stored Procedure สำหรับดึงข้อมูล |
| `procedureParams` | `object` | `{}` | Parameters เพิ่มเติมสำหรับ SP |
| `preObj` | `object` | `null` | Schema mapping object |

### Filter Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showDateFilter` | `boolean` | `true` | แสดง/ซ่อน Date Filter |
| `showEmployeeFilter` | `boolean` | `true` | แสดง/ซ่อน Employee Filter |
| `dateFilterField` | `string` | `"max_task_end_date"` | Field สำหรับ filter due date |
| `initialStartDate` | `Date` | `null` | วันเริ่มต้นเริ่มแรก (default: วันแรกของเดือนปัจจุบัน) |
| `initialEndDate` | `Date` | `null` | วันสิ้นสุดเริ่มแรก (default: วันสุดท้ายของเดือนปัจจุบัน) |
| `initialSelectedEmployees` | `array` | `[]` | รายชื่อพนักงานที่เลือกเริ่มแรก |

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `array` | `null` | Custom columns configuration |
| `scales` | `array` | `null` | Custom scales configuration |
| `initialCellWidth` | `number` | `60` | ความกว้างเริ่มต้นของ cell (pixels) |
| `initialCellHeight` | `number` | `38` | ความสูงเริ่มต้นของ cell (pixels) |
| `initialScaleHeight` | `number` | `40` | ความสูงเริ่มต้นของ scale header (pixels) |
| `initialScale` | `string` | `"day"` | มุมมองเริ่มต้น: `"day"`, `"week"`, `"month"` |
| `height` | `number` | `600` | ความสูงของ Gantt Chart (pixels) |

### Appearance Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `null` | หัวข้อแสดงด้านบน |
| `showToolbar` | `boolean` | `true` | แสดง/ซ่อน Toolbar |
| `readonly` | `boolean` | `true` | โหมด read-only (ไม่สามารถลาก/แก้ไข) |
| `resourceGroup` | `string` | `null` | Resource group สำหรับ localization |
| `sx` | `object` | `{}` | Custom MUI sx styles |

### Event Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onTaskClick` | `function` | `null` | Callback เมื่อคลิกที่ task |
| `onDataLoad` | `function` | `null` | Callback เมื่อโหลดข้อมูลเสร็จ |
| `onError` | `function` | `null` | Callback เมื่อเกิด error |

---

## Ref Methods

เข้าถึงผ่าน `ref`:

```jsx
const ganttRef = useRef(null);

// ใช้งาน
ganttRef.current.refresh();           // รีเฟรชข้อมูล
ganttRef.current.clearFilters();      // ล้าง filters ทั้งหมด
ganttRef.current.getTasks();          // ดึง tasks ปัจจุบัน
ganttRef.current.getAllTasks();       // ดึง tasks ทั้งหมด
ganttRef.current.setFilters({         // ตั้งค่า filters
  startDate: new Date(),
  endDate: new Date(),
  employees: []
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
  start: new Date(),        // วันเริ่มต้น
  end: new Date(),          // วันสิ้นสุด
  progress: 0,              // ความคืบหน้า (0-100)
  open: true,               // เปิด/ปิด children
  man_day: 8.5,             // Man Day (Hours)
  actual_man_day: 6.0,      // Actual Man Day (Hours)
  data: {
    level: "task",          // ระดับ: "user" | "project" | "task"
    taskNo: "T001",
    // ... custom fields
  }
}
```

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
      if (!row.start || !row.end) return "-";
      const formatDate = (date) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      };
      return `${formatDate(row.start)} - ${formatDate(row.end)}`;
    },
  },
  {
    id: "man_day",
    header: "Man Day",
    align: "center",
    width: 100,
    template: (value) => value ? parseFloat(value).toFixed(2) : "-",
  },
];

<BSGanttChart columns={customColumns} />
```

---

## Custom Scales

```jsx
const customScales = [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" },
];

<BSGanttChart scales={customScales} />
```

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

<BSGanttChart onTaskClick={handleTaskClick} />
```

### onDataLoad

```jsx
const handleDataLoad = (rawData) => {
  console.log("Data loaded:", rawData.length, "rows");
  // ทำอะไรบางอย่างกับ raw data
};

<BSGanttChart onDataLoad={handleDataLoad} />
```

### onError

```jsx
const handleError = (error) => {
  console.error("Error:", error);
  showSnackbar("เกิดข้อผิดพลาด: " + error.message, "error");
};

<BSGanttChart onError={handleError} />
```

---

## Localization

### Supported Languages

- Thai (`th`)
- English (`en`)

ระบบจะใช้ภาษาจาก `SecureStorage.get("lang")` อัตโนมัติ

### Custom Locale Text

สร้างไฟล์ใน `locales/` folder:

```javascript
// locales/th.js
export default {
  bsColumnName: "ชื่อ",
  bsColumnDuration: "ระยะเวลา",
  bsColumnManDay: "Man Day (ชม.)",
  bsColumnActualManDay: "Actual Man Day (ชม.)",
  bsNoData: "ไม่มีข้อมูล",
  bsStartDate: "เริ่ม",
  bsEndDate: "สิ้นสุด",
  bsProgress: "ความคืบหน้า",
  // ... more
};
```

---

## Styling

### Task Bar Colors

สีถูกกำหนดตาม `type` ของ task:

| Type | สี | Hex Code |
|------|-----|----------|
| `user` | เขียว | `#66bb6a` |
| `project` | ฟ้า | `#42a5f5` |
| `work_task` | ส้ม | `#ffa726` |

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

---

## API Endpoint

Component ใช้ endpoint:

```
POST /api/Gantt/timeline
```

Request Body:
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "projectHeaderId": null,
  "xmlUserIds": "<XMLData><data_read>1</data_read></XMLData>"
}
```

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
        initialCellWidth={60}
        showToolbar={true}
        readonly={true}
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
3. ตรวจสอบว่า API endpoint `/api/Gantt/timeline` ทำงานได้

### สีไม่เปลี่ยน

1. ตรวจสอบว่า `type` ของ task ถูกต้อง (`user`, `project`, `work_task`)
2. CSS specificity อาจไม่เพียงพอ ใช้ `!important`

### Tooltip ไม่แสดง

1. รอให้ render เสร็จก่อน (มี delay 500ms)
2. ตรวจสอบว่า tasks มี `start` และ `end` dates

### Performance ช้า

1. จำกัดช่วงวันที่ให้แคบลง
2. ใช้ `initialScale="month"` สำหรับข้อมูลจำนวนมาก

---

## Dependencies

- `@svar-ui/react-gantt` - SVAR React Gantt (MIT)
- `@mui/material` - Material UI
- `react` - React 18+

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-20 | Initial release |
| 1.1.0 | 2026-01-21 | Added tooltip, weekend highlighting, zoom |

---

## Author

BS Platform Team
