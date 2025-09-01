# 📚 คู่มือการใช้งาน React Timesheet System

ยินดีต้อนรับสู่คู่มือการใช้งาน React Timesheet System! ระบบนี้พัฒนาด้วย React 19 และ Material-UI เพื่อการจัดการข้อมูลที่มีประสิทธิภาพ

## 🗂️ สารบัญเอกสาร

### ⚡ Quick Start

#### [🚀 Quick Reference](./QuickReference.md)

**คู่มือสำหรับนักพัฒนาที่รีบ**

- การเลือกใช้งาน component ใน 30 วินาที
- Template code สำเร็จรูป
- Cheat sheets และ debugging tips

### 📊 Components Documentation

#### [🔍 คู่มือการใช้งาน Custom GridView Components](./CustomGridViewGuide.md)

**คู่มือหลักสำหรับการใช้งาน Data Grid Components**

- เปรียบเทียบ CustomDataGrid vs EditableDataGrid
- ตัวอย่างการใช้งานในสถานการณ์จริง
- Best Practices และ Performance Tips
- Security & Validation Guidelines

#### [✏️ EditableDataGrid Component](./EditableDataGrid.md)

**คู่มือเฉพาะสำหรับ EditableDataGrid**

- การใช้งาน CRUD Operations
- การจัดการ State และ Callbacks
- Validation และ Error Handling
- การปรับแต่ง UI/UX

#### [🔄 เปรียบเทียบ Components](./ComponentComparison.md)

**เปรียบเทียบความแตกต่างอย่างละเอียด**

- ตารางเปรียบเทียบ Features
- Performance Analysis
- Use Case Guidelines
- Migration Path และ Common Pitfalls

## 🚀 Quick Start

### สำหรับผู้เริ่มต้น

1. **เริ่มที่นี่**: [Quick Reference](./QuickReference.md) - เลือก component ใน 30 วินาที
2. **อ่านคู่มือหลัก**: [Custom GridView Guide](./CustomGridViewGuide.md)
3. **ดูตัวอย่าง**: เข้าไปที่หน้า `/editable` ในแอปพลิเคชัน
4. **ทดลองใช้งาน**: Copy template code และทดลองในโปรเจคของคุณ

### สำหรับนักพัฒนา

1. **เลือก Component**: ใช้ [Component Comparison](./ComponentComparison.md)
2. **ดู Template Code**: [Quick Reference](./QuickReference.md)
3. **ดู API Reference**: รายละเอียด Props และ Methods
4. **Apply Best Practices**: ตาม guidelines ที่แนะนำ

## 📁 โครงสร้างไฟล์ Components

```
src/
├── components/
│   ├── CustomDataGrid.js          # Grid แบบอ่านอย่างเดียว
│   ├── EditableDataGrid.js        # Grid แบบแก้ไขได้
│   └── DataGridErrorBoundary.js   # Error handling
├── pages/
│   ├── EditablePage.js           # ตัวอย่างการใช้งาน
│   ├── ItemPage.js               # CustomDataGrid example
│   └── ProjectPage.js            # Tree view + Grid
└── docs/
    ├── README.md                 # ไฟล์นี้
    ├── CustomGridViewGuide.md    # คู่มือหลัก
    └── EditableDataGrid.md       # คู่มือ EditableDataGrid
```

## 🎯 Use Cases หลัก

### 📈 Dashboard & Reports

```jsx
import CustomDataGrid from "../components/CustomDataGrid";
// ใช้สำหรับแสดงข้อมูลแบบอ่านอย่างเดียว
// มี Export functionality
```

### ⚙️ Admin Panel & Management

```jsx
import EditableDataGrid from "../components/EditableDataGrid";
// ใช้สำหรับจัดการข้อมูลแบบ CRUD
// มี inline editing capabilities
```

## 🔧 การติดตั้งและตั้งค่า

### Dependencies ที่จำเป็น

```bash
npm install @mui/material @mui/x-data-grid @mui/icons-material
```

### การ Import Components

```jsx
// Grid แบบอ่านอย่างเดียว
import CustomDataGrid from "../components/CustomDataGrid";

// Grid แบบแก้ไขได้
import EditableDataGrid from "../components/EditableDataGrid";
```

## 🎨 Theme & Styling

ทั้งสอง components ใช้ Material-UI theme system และรองรับ:

- Dark/Light mode
- Custom colors และ typography
- Responsive design
- CSS-in-JS styling

## 📖 เอกสารเพิ่มเติม

### Material-UI References

- [MUI X DataGrid Documentation](https://mui.com/x/react-data-grid/)
- [MUI Theming Guide](https://mui.com/material-ui/customization/theming/)
- [MUI Icons](https://mui.com/material-ui/icons/)

### React Best Practices

- [React Hooks Guide](https://reactjs.org/docs/hooks-intro.html)
- [State Management](https://reactjs.org/docs/state-and-lifecycle.html)
- [Performance Optimization](https://reactjs.org/docs/optimizing-performance.html)

## 🐛 Troubleshooting

### ปัญหาที่พบบ่อย

#### 1. **การแสดงผลข้อมูลไม่ถูกต้อง**

```jsx
// ตรวจสอบ data structure
console.log("Rows:", rows);
console.log("Columns:", columns);

// ตรวจสอบ id field
const rowsWithId = data.map((item, index) => ({
  id: item.id || index,
  ...item,
}));
```

#### 2. **การแก้ไขข้อมูลไม่ทำงาน**

```jsx
// ตรวจสอบ editable property
const columns = [
  { field: "name", headerName: "ชื่อ", editable: true }, // ต้องมี editable: true
];
```

#### 3. **Performance Issues**

```jsx
// ใช้ React.memo และ useMemo
const MemoizedGrid = React.memo(EditableDataGrid);
const columns = useMemo(() => [...], []);
```

## 🔄 การอัปเดตและการบำรุงรักษา

### Version Compatibility

- React: 19.x
- Material-UI: 7.x
- MUI X DataGrid: Latest

### การ Migrate

เมื่อมีการอัปเดต components หลัก:

1. อ่าน CHANGELOG
2. ทดสอบใน development environment
3. อัปเดต dependencies ที่เกี่ยวข้อง

## 📞 การติดต่อและสนับสนุน

### ขอความช่วยเหลือ

- **ปัญหาเทคนิค**: สร้าง GitHub Issue
- **คำถามการใช้งาน**: ดูใน documentation หรือตัวอย่างในแอป
- **Feature Request**: ติดต่อทีมพัฒนา

### การมีส่วนร่วม

1. Fork repository
2. สร้าง feature branch
3. เขียน tests
4. ส่ง Pull Request

---

## 🎉 เริ่มต้นใช้งาน

พร้อมแล้วหรือยัง? เริ่มต้นด้วยการอ่าน **[คู่มือการใช้งาน Custom GridView Components](./CustomGridViewGuide.md)** เพื่อเข้าใจการใช้งาน components อย่างครบถ้วน!

---

_อัปเดตล่าสุด: สิงหาคม 2025_  
_เวอร์ชัน: 1.0.0_
