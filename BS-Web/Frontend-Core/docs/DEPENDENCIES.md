# 📦 BSDataGrid Dependencies Installation Guide

## 🚨 Required Packages

BSDataGrid component ต้องการ packages ต่อไปนี้เพื่อทำงานได้เต็มรูปแบบ:

### Core MUI Packages

```bash
npm install @mui/material@^7.2.0
npm install @mui/icons-material@^7.2.0
npm install @emotion/react@^11.14.0
npm install @emotion/styled@^11.14.1
```

### 🔥 **Critical: DataGrid Pro Package**

```bash
npm install @mui/x-data-grid-pro@^8.8.0
```

> ⚠️ **หมายเหตุสำคัญ**: BSDataGrid ใช้ `DataGridPro` component ที่ต้องการ **Pro License**
> ไม่สามารถใช้ `@mui/x-data-grid` (ฟรี version) ได้

### Additional Required Packages

```bash
npm install axios@^1.10.0
npm install react@^19.1.0
npm install react-dom@^19.1.0
```

## 🎯 Installation Commands

### Complete Installation (Recommended)

```bash
# Navigate to project directory
cd BS-Platform/BS-Web/Frontend-Core

# Install all required packages
npm install @mui/material@^7.2.0 @mui/icons-material@^7.2.0 @emotion/react@^11.14.0 @emotion/styled@^11.14.1 @mui/x-data-grid-pro@^8.8.0 axios@^1.10.0

# Or install from package.json
npm install
```

### Verify Installation

```bash
# Check if DataGridPro is installed
npm list @mui/x-data-grid-pro

# Should output something like:
# BS-Web-Framework@0.1.0 /path/to/project
# └── @mui/x-data-grid-pro@8.12.1
```

## 📋 package.json Dependencies

ตรวจสอบให้แน่ใจว่า `package.json` มี dependencies ต่อไปนี้:

```json
{
  "dependencies": {
    "@mui/material": "^7.2.0",
    "@mui/icons-material": "^7.2.0",
    "@mui/x-data-grid-pro": "^8.8.0",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "axios": "^1.10.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```

## 🏆 MUI X License

### Development Mode

DataGridPro สามารถใช้งานได้ใน development mode โดยจะแสดง watermark

### Production Mode

สำหรับ production ต้องมี license key:

```javascript
// ใน src/index.js หรือ App.js
import { LicenseInfo } from "@mui/x-data-grid-pro";

LicenseInfo.setLicenseKey("YOUR_LICENSE_KEY_HERE");
```

### Environment Variable (Recommended)

```bash
# .env
REACT_APP_MUI_X_LICENSE_KEY=your_license_key_here
```

```javascript
// ใน App.js
LicenseInfo.setLicenseKey(process.env.REACT_APP_MUI_X_LICENSE_KEY);
```

## 🐛 Common Issues & Solutions

### Issue 1: "Module not found: @mui/x-data-grid-pro"

```bash
# Solution: Install the Pro package
npm install @mui/x-data-grid-pro@^8.8.0
```

### Issue 2: "DataGridPro is not defined"

```javascript
// ❌ Wrong import
import { DataGrid } from "@mui/x-data-grid";

// ✅ Correct import
import { DataGridPro } from "@mui/x-data-grid-pro";
```

### Issue 3: License Warning in Console

```javascript
// Add license key in App.js
import { LicenseInfo } from "@mui/x-data-grid-pro";
LicenseInfo.setLicenseKey(process.env.REACT_APP_MUI_X_LICENSE_KEY);
```

### Issue 4: Version Conflicts

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## ✅ Verification Checklist

- [ ] `@mui/x-data-grid-pro` installed (check with `npm list @mui/x-data-grid-pro`)
- [ ] No console errors about missing modules
- [ ] BSDataGrid component imports successfully
- [ ] License key configured (for production)
- [ ] Gateway integration working (check network tab)

## 🚀 Quick Test

Create a test component to verify everything works:

```jsx
// TestBSDataGrid.jsx
import React from "react";
import BSDataGrid from "./components/BSDataGrid";

function TestBSDataGrid() {
  return (
    <div style={{ height: 600, width: "100%" }}>
      <BSDataGrid bsObj="t_customer" bsRowPerPage={25} showAdd={true} />
    </div>
  );
}

export default TestBSDataGrid;
```

## 📞 Support

### Documentation

- [MUI X DataGrid Pro](https://mui.com/x/react-data-grid/)
- [License Information](https://mui.com/store/license/)
- [BSDataGrid Integration Guide](./GATEWAY_INTEGRATION.md)

### License Purchase

- [MUI Store](https://mui.com/store/)
- Contact: sales@mui.com

---

**Updated**: ${new Date().toISOString().split('T')[0]}
**Status**: ✅ Dependencies Ready
