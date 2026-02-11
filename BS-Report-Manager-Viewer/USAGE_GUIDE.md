# BS Report Viewer — Usage Guide

คู่มือการเรียกใช้งาน Report Viewer จาก Frontend (React) และ API Export

---

## สารบัญ

- [1. ภาพรวม Flow](#1-ภาพรวม-flow)
- [2. เรียกดูรายงานจาก Frontend (New Tab)](#2-เรียกดูรายงานจาก-frontend-new-tab)
- [3. Export รายงานจาก API](#3-export-รายงานจาก-api)
- [4. รูปแบบ Parameter](#4-รูปแบบ-parameter)
- [5. Config ในฐานข้อมูล](#5-config-ในฐานข้อมูล)
- [6. ตัวอย่างการใช้งานจริง](#6-ตัวอย่างการใช้งานจริง)

---

## 1. ภาพรวม Flow

### Flow 1: เปิดรายงานใน Browser (New Tab)

> **ขั้นตอน: User กดปุ่ม → เปิด New Tab → แสดงรายงาน**

| Step | ใคร | ทำอะไร |
|------|------|--------|
| 1️⃣ | 👤 **User** | กดปุ่ม "พิมพ์รายงาน" บนหน้า React |
| 2️⃣ | ⚛️ **React** | `window.open("/Default.aspx?report_code=XXX&params...", "_blank")` |
| 3️⃣ | 📄 **Default.aspx** | รับ `report_code` จาก URL → เรียก `ReportConfigService.GetConfig("XXX")` |
| 4️⃣ | 💾 **Database** | อ่าน config จากตาราง `rpt.t_com_config_report` → ได้ `report_type`, `sql_command`, `report_path` |
| 5️⃣ | 📄 **Default.aspx** | ดู `report_type` แล้ว **Redirect** ไปหน้าที่ถูกต้อง ⬇️ |

**Redirect ตาม report_type:**

| report_type | Redirect ไป | สิ่งที่เกิดขึ้น |
|-------------|-------------|----------------|
| `RPT` | `CrystalReportViewer.aspx` | Execute SQL → Load .rpt → SetDataSource → แสดงรายงาน |
| `RDLC` | `RdlcReportViewer.aspx` | Execute SQL → Load .rdlc → Assign DataSet → แสดงรายงาน |
| `SSRS` | SSRS Server URL โดยตรง | Redirect ไป `http://ssrs-server/ReportServer?/path&params` |

| Step | ใคร | ทำอะไร |
|------|------|--------|
| 6️⃣ | 📊 **Viewer Page** | Execute SQL + Render รายงาน |
| 7️⃣ | 👤 **User** | เห็นรายงานใน **New Tab** พร้อมดู/พิมพ์/Export |

---

### Flow 2: Export PDF/Excel จาก API (ไม่เปิดหน้าต่าง — ดาวน์โหลดเลย)

> **ขั้นตอน: React เรียก API → ได้ไฟล์ PDF กลับมา → ดาวน์โหลด**

| Step | ใคร | ทำอะไร |
|------|------|--------|
| 1️⃣ | ⚛️ **React** | `fetch("/ReportExport.ashx", { method: "POST", body: JSON })` |
| | | ส่ง JSON: `{ "report_code": "XXX", "parameters": {...}, "output_format": "pdf" }` |
| 2️⃣ | 🔌 **ReportExport.ashx** | อ่าน `report_code` จาก JSON body |
| 3️⃣ | 💾 **Database** | อ่าน config จาก `rpt.t_com_config_report` |
| 4️⃣ | 💾 **Database** | Execute `sql_command` (แทนที่ `{field}` ด้วย parameters) → ได้ DataTable |
| 5️⃣ | ⚙️ **Report Engine** | ตาม `report_type`: |
| | | • `RPT` → Load .rpt + SetDataSource + ExportToPdf |
| | | • `RDLC` → Load .rdlc + Assign DataSet + Render("PDF") |
| | | • `SSRS` → HTTP GET ไป SSRS Server `&rs:Format=PDF` |
| 6️⃣ | 🔌 **ReportExport.ashx** | ส่ง Response: `Content-Type: application/pdf` + Binary data |
| 7️⃣ | ⚛️ **React** | `response.blob()` → สร้าง download link → ดาวน์โหลดไฟล์ |
| 8️⃣ | 👤 **User** | 📥 ได้ไฟล์ PDF/Excel/Word ดาวน์โหลดลงเครื่อง |

---

## 2. เรียกดูรายงานจาก Frontend (New Tab)

รองรับ 2 วิธี: **GET** (query string) และ **POST** (hidden form + JSON)

### วิธีที่ 1: GET — ส่ง parameter ผ่าน URL (เหมาะกับ parameter สั้นๆ)

```
http://{server}/ReportViewer/Default.aspx?report_code={report_code}&{param1}={value1}&{param2}={value2}
```

### วิธีที่ 2: POST — ส่ง parameter ผ่าน hidden form (เหมาะกับ filter ยาว / ข้อมูลเยอะ)

React สร้าง `<form>` ที่มี `target="_blank"` แล้ว submit → เปิด new tab ด้วย POST

```
POST http://{server}/ReportViewer/Default.aspx
Form fields:
  report_code = "RPT_INVOICE"
  json_parameters = '{"FilterConditionString":"invoice_id = '\''123'\''","status":"Active"}'
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `report_code` | ✅ Yes | รหัสรายงาน ตรงกับ PK ใน `rpt.t_com_config_report` |
| `json_parameters` | ❌ Optional | **POST only** — JSON string ของ parameters ทั้งหมด |
| `FilterConditionString` | ❌ Optional | WHERE clause condition (ส่งใน json_parameters หรือ query string) |
| `{field_name}` | ❌ Optional | parameter อื่นๆ ตรงกับ `{field}` ใน `sql_command` |

> **POST ทำงานยังไง?**
> 1. React สร้าง hidden form → submit ด้วย `target="_blank"` → เปิด new tab
> 2. `Default.aspx` อ่าน `json_parameters` จาก form → parse JSON → เก็บใน **Session**
> 3. Redirect ไปหน้า viewer → viewer อ่าน parameters จาก **Session**

### React Helper Function — GET (เดิม)

```javascript
/**
 * เปิด Report Viewer ใน New Tab (GET — parameter อยู่ใน URL)
 * @param {string} reportCode - รหัสรายงาน
 * @param {object} parameters - พารามิเตอร์ (key-value)
 */
const openReport = (reportCode, parameters = {}) => {
  const baseUrl = "http://your-server/ReportViewer/Default.aspx";

  const params = new URLSearchParams();
  params.set("report_code", reportCode);

  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, value);
    }
  });

  const url = `${baseUrl}?${params.toString()}`;
  window.open(url, "_blank");
};
```

### React Helper Function — POST (ใหม่ ✨)

```javascript
/**
 * เปิด Report Viewer ใน New Tab (POST — parameter ส่งผ่าน hidden form)
 * เหมาะกับ filter ยาว, ข้อมูลเยอะ, หรือไม่ต้องการให้ข้อมูลโผล่ใน URL
 * @param {string} reportCode - รหัสรายงาน
 * @param {object} parameters - พารามิเตอร์ (key-value)
 */
const openReportPost = (reportCode, parameters = {}) => {
  const baseUrl = "http://your-server/ReportViewer/Default.aspx";

  // สร้าง hidden form
  const form = document.createElement("form");
  form.method = "POST";
  form.action = baseUrl;
  form.target = "_blank"; // เปิดใน new tab
  form.style.display = "none";

  // Hidden input: report_code
  const inputCode = document.createElement("input");
  inputCode.type = "hidden";
  inputCode.name = "report_code";
  inputCode.value = reportCode;
  form.appendChild(inputCode);

  // Hidden input: json_parameters (JSON string)
  const inputParams = document.createElement("input");
  inputParams.type = "hidden";
  inputParams.name = "json_parameters";
  inputParams.value = JSON.stringify(parameters);
  form.appendChild(inputParams);

  // Submit แล้วลบ form ออก
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};
```

### เลือกใช้ GET หรือ POST ?

| เงื่อนไข | ใช้ | ฟังก์ชัน |
|----------|-----|---------|
| Filter สั้นๆ, parameter น้อย | **GET** | `openReport()` |
| Filter ยาว, WHERE clause ซับซ้อน | **POST** | `openReportPost()` |
| ไม่ต้องการ parameter โผล่ใน URL | **POST** | `openReportPost()` |
| ต้องการ bookmark / แชร์ link ได้ | **GET** | `openReport()` |

### ตัวอย่างการเรียกใช้ — GET

```javascript
// เปิดรายงานแบบไม่มี parameter
openReport("RPT_SUMMARY");

// เปิดรายงานแบบ View + FilterConditionString
openReport("RPT_MANPOWER", {
  FilterConditionString: "owner_id = 'EMP001' AND status = 'Active'"
});
```

### ตัวอย่างการเรียกใช้ — POST

```javascript
// Filter ยาว — ส่งแบบ POST
openReportPost("RPT_MANPOWER", {
  FilterConditionString: "owner_id = 'EMP001' AND department = 'IT' AND status = 'Active' AND YEAR(create_date) = 2026"
});

// Stored Procedure + หลาย parameters
openReportPost("RPT_SLA_TARGET", {
  FilterConditionString: "sla_time = '10:30'",
  filter_operator_sla_time: "=",
  filter_value_sla_time: "10:30"
});
```

### ใช้กับปุ่มใน Component

```jsx
<Button
  variant="contained"
  startIcon={<PrintIcon />}
  onClick={() =>
    openReport("RPT_INVOICE", {
      FilterConditionString: `invoice_id = '${selectedRow.invoice_id}'`
    })
  }
>
  พิมพ์รายงาน
</Button>
```

---

## 3. Export รายงานจาก API

### Endpoint

```
POST http://{server}/ReportViewer/ReportExport.ashx
```

### Request Body (JSON)

```json
{
  "report_code": "RPT_SLA_TARGET",
  "parameters": {
    "FilterConditionString": "sla_time = '10:30'",
    "filter_operator_sla_time": "=",
    "filter_value_sla_time": "10:30"
  },
  "output_format": "pdf"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `report_code` | string | ✅ Yes | รหัสรายงาน |
| `parameters` | object | ❌ Optional | key-value ของ parameters |
| `output_format` | string | ❌ Optional | `pdf` (default), `excel`, `word`, `csv` |

### Response

| สถานะ | Content-Type | Body |
|--------|-------------|------|
| ✅ Success | `application/pdf` | Binary file content |
| ❌ Error | `application/json` | `{ "error": "error message" }` |

### React Helper Function — Export & Download

```javascript
/**
 * Export รายงานเป็นไฟล์แล้วดาวน์โหลด (ไม่เปิด new tab)
 * @param {string} reportCode - รหัสรายงาน
 * @param {object} parameters - พารามิเตอร์
 * @param {string} format - "pdf" | "excel" | "word" | "csv"
 * @param {string} fileName - ชื่อไฟล์ที่ต้องการ (optional)
 */
const exportReport = async (reportCode, parameters = {}, format = "pdf", fileName = null) => {
  const url = "http://your-server/ReportViewer/ReportExport.ashx";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_code: reportCode,
        parameters: parameters,
        output_format: format
      })
    });

    // ตรวจสอบ error
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Export failed");
    }

    // ดาวน์โหลดไฟล์
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const extMap = { pdf: "pdf", excel: "xlsx", word: "docx", csv: "csv" };
    const ext = extMap[format] || "pdf";
    const downloadName = fileName || `${reportCode}.${ext}`;

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Export report error:", error);
    alert("Export failed: " + error.message);
  }
};
```

### ตัวอย่างการเรียกใช้ Export

```javascript
// Export PDF
await exportReport("RPT_INVOICE", {
  FilterConditionString: `invoice_id = '${invoiceId}'`
});

// Export Excel พร้อมตั้งชื่อไฟล์
await exportReport(
  "RPT_MANPOWER",
  { FilterConditionString: "status = 'Active'" },
  "excel",
  "ManPower_Report.xlsx"
);

// Export Word
await exportReport("RPT_SUMMARY", {}, "word");
```

### ดึง Config รายงาน (GET)

สำหรับดึงข้อมูล config เพื่อแสดง UI parameter form:

```
GET http://{server}/ReportViewer/ReportExport.ashx?action=config&report_code=RPT_SLA_TARGET
```

Response:
```json
{
  "report_code": "RPT_SLA_TARGET",
  "report_name": "SLA Target Report",
  "report_type": "RPT",
  "json_parameter": "[{\"field\":\"filter_value_sla_time\",\"label\":\"SLA Time\",\"type\":\"text\"}]"
}
```

---

## 4. รูปแบบ Parameter

### Pattern 1: View (`sql_object_type = "View"`)

ใช้ `FilterConditionString` ต่อท้าย WHERE clause

```
sql_command ในฐานข้อมูล:
  SELECT * FROM Tmt.v_tmt_man_power WHERE 1=1

Parameter ที่ส่ง:
  { "FilterConditionString": "owner_id = 'EMP001' AND status = 'Active'" }

SQL ที่ execute จริง:
  SELECT * FROM Tmt.v_tmt_man_power WHERE 1=1 AND owner_id = 'EMP001' AND status = 'Active'
```

> **หมายเหตุ:** `FilterConditionString` จะถูกต่อหลัง `AND` อัตโนมัติ

### Pattern 2: Stored Procedure (`sql_object_type = "Stored Procedure"`)

ใช้ `{field}` placeholder ใน sql_command แล้วแทนที่ด้วยค่า parameter

```
sql_command ในฐานข้อมูล:
  EXEC [tmt].[usp_calc_sla_target]
    @in_vchFilterCondition = N'{FilterConditionString}',
    @in_vchOperatorSLATime = N'{filter_operator_sla_time}',
    @in_vchValueSLATime = N'{filter_value_sla_time}'

Parameter ที่ส่ง:
  {
    "FilterConditionString": "sla_time = '10:30'",
    "filter_operator_sla_time": "=",
    "filter_value_sla_time": "10:30"
  }

SQL ที่ execute จริง:
  EXEC [tmt].[usp_calc_sla_target]
    @in_vchFilterCondition = N'sla_time = ''10:30''',
    @in_vchOperatorSLATime = N'=',
    @in_vchValueSLATime = N'10:30'
```

> **หมายเหตุ:** Single quote (`'`) จะถูก escape เป็น `''` อัตโนมัติเพื่อป้องกัน SQL injection

---

## 5. Config ในฐานข้อมูล

### ตาราง: `rpt.t_com_config_report`

| Column | ตัวอย่าง | Description |
|--------|---------|-------------|
| `report_code` | `RPT_SLA_TARGET` | รหัสรายงาน (Primary Key) |
| `report_name` | `SLA Target Report` | ชื่อแสดงผล |
| `report_type` | `RPT` / `RDLC` / `SSRS` | ประเภทรายงาน |
| `report_path` | `@app_server_path\rpt\SLA.rpt` | ที่อยู่ไฟล์ (`@app_server_path` จะถูกแทนที่อัตโนมัติ) |
| `sql_object_type` | `View` / `Stored Procedure` | ประเภท SQL |
| `sql_command` | `SELECT * FROM ... WHERE 1=1` | คำสั่ง SQL |
| `rdlc_dataset_name` | `DataSet1` | ชื่อ DataSet สำหรับ RDLC |
| `run_as` | `Report Viewer` / `PDF Viewer` | วิธีแสดงผล |
| `is_active` | `YES` | สถานะใช้งาน |

### ตัวอย่าง INSERT

```sql
-- Crystal Report + View Pattern
INSERT INTO rpt.t_com_config_report
  (report_code, report_name, report_type, report_path,
   sql_object_type, sql_command, run_as, is_active)
VALUES
  ('RPT_MANPOWER', 'Man Power Report', 'RPT',
   '@app_server_path\rpt\ManPower.rpt',
   'View',
   'SELECT * FROM Tmt.v_tmt_man_power WHERE 1=1',
   'Report Viewer', 'YES');

-- Crystal Report + Stored Procedure Pattern
INSERT INTO rpt.t_com_config_report
  (report_code, report_name, report_type, report_path,
   sql_object_type, sql_command, run_as, is_active)
VALUES
  ('RPT_SLA_TARGET', 'SLA Target Report', 'RPT',
   '@app_server_path\rpt\SLATarget.rpt',
   'Stored Procedure',
   'EXEC [tmt].[usp_calc_sla_target]
     @in_vchFilterCondition = N''{FilterConditionString}'',
     @in_vchOperatorSLATime = N''{filter_operator_sla_time}'',
     @in_vchValueSLATime = N''{filter_value_sla_time}''',
   'Report Viewer', 'YES');

-- RDLC Report
INSERT INTO rpt.t_com_config_report
  (report_code, report_name, report_type, report_path,
   rdlc_dataset_name, sql_object_type, sql_command, run_as, is_active)
VALUES
  ('RPT_SUMMARY', 'Summary Report', 'RDLC',
   '@app_server_path\rdlc\Summary.rdlc',
   'DataSet1',
   'View',
   'SELECT * FROM Tmt.v_summary WHERE 1=1',
   'Report Viewer', 'YES');

-- SSRS Report
INSERT INTO rpt.t_com_config_report
  (report_code, report_name, report_type,
   ssrs_server_url, ssrs_report_path,
   ssrs_username, ssrs_password, ssrs_domain_name,
   run_as, is_active)
VALUES
  ('RPT_DASHBOARD', 'Dashboard', 'SSRS',
   'http://ssrs-server/ReportServer',
   '/Reports/Dashboard',
   'report_user', 'report_pass', 'DOMAIN',
   'Report Viewer', 'YES');
```

---

## 6. ตัวอย่างการใช้งานจริง

### Scenario 1: ปุ่มพิมพ์ใบ Invoice ใน DataGrid

```jsx
// ใน columns definition
{
  field: "actions",
  headerName: "",
  renderCell: (params) => (
    <IconButton
      onClick={() =>
        openReport("RPT_INVOICE", {
          FilterConditionString: `invoice_no = '${params.row.invoice_no}'`
        })
      }
      title="พิมพ์ใบ Invoice"
    >
      <PrintIcon />
    </IconButton>
  )
}
```

### Scenario 2: Export รายงานสรุปประจำเดือน

```jsx
const handleExportMonthly = async () => {
  const year = dayjs().year();
  const month = dayjs().format("MM");

  await exportReport(
    "RPT_MONTHLY_SUMMARY",
    {
      FilterConditionString: `YEAR(create_date) = ${year} AND MONTH(create_date) = ${month}`
    },
    "excel",
    `Monthly_Summary_${year}_${month}.xlsx`
  );
};
```

### Scenario 3: เปิด SSRS Report พร้อม parameter

```javascript
openReport("RPT_DASHBOARD", {
  department_id: "IT",
  year: "2026"
});
// → จะ redirect ไป SSRS URL: http://ssrs-server/ReportServer?/Reports/Dashboard&department_id=IT&year=2026
```

### Scenario 4: ปุ่ม Export หลาย format

```jsx
<ButtonGroup variant="outlined">
  <Button onClick={() => exportReport("RPT_SALES", params, "pdf")}>
    📄 PDF
  </Button>
  <Button onClick={() => exportReport("RPT_SALES", params, "excel")}>
    📊 Excel
  </Button>
  <Button onClick={() => exportReport("RPT_SALES", params, "word")}>
    📝 Word
  </Button>
</ButtonGroup>
```

---

## Quick Reference

| การใช้งาน | Method | URL / Endpoint |
|-----------|--------|----------------|
| **ดูรายงานใน New Tab** | `window.open()` | `GET /Default.aspx?report_code=XXX&params` |
| **Export ไฟล์ (PDF/Excel)** | `fetch()` POST | `POST /ReportExport.ashx` + JSON body |
| **ดึง Config** | `fetch()` GET | `GET /ReportExport.ashx?action=config&report_code=XXX` |
| **Download ไฟล์ .rpt/.rdlc** | Link | `GET /ReportFileHandler.ashx?action=download&type=rpt&file=XXX.rpt` |
| **Upload ไฟล์ .rpt/.rdlc** | Form POST | `POST /ReportFileHandler.ashx?action=upload&type=rpt` |
