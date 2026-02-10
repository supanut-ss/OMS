# BS Report Manager Viewer

Web Report Viewer application built on **ASP.NET Web Forms (.NET Framework 4.8)**.  
Config-driven report rendering — supports **Crystal Report (.rpt)**, **Microsoft RDLC (.rdlc)**, and **SSRS** reports.

Report configuration is stored in database table `rpt.t_com_config_report`.  
Frontend/API sends `report_code` + JSON parameters to view or export reports.

---

## Features

| Report Type | Engine | Description |
|---|---|---|
| **RPT** (Crystal Report) | `CrystalReportEngine` | Load .rpt, execute SQL, assign DataSource, view or export PDF/Word/Excel/CSV |
| **RDLC** (Report Definition) | `RdlcReportEngine` | Load .rdlc, execute SQL, assign DataSet by `rdlc_dataset_name`, view or render PDF |
| **SSRS** (Reporting Services) | `SsrsReportEngine` | Connect to SSRS server, redirect to viewer URL or export PDF via HTTP render |

### Key Features
- **Config-driven** from `rpt.t_com_config_report` database table
- **SQL parameter replacement** — View pattern (WHERE append) and Stored Procedure pattern (`{field}` placeholder)
- **PDF Export API** — `ReportExport.ashx` endpoint returns PDF/Excel/Word binary
- **CORS support** — API callable from React frontend
- **Auto-detect router** — `Default.aspx?report_code=XXX` routes to correct viewer

---

## Prerequisites

1. **Visual Studio 2019+** with ASP.NET and web development workload
2. **SAP Crystal Reports Runtime** (v13.0) installed on server
3. **SQL Server** with `Timesheet` database containing `rpt.t_com_config_report` table
4. **.NET Framework 4.8** Developer Pack

---

## Getting Started

### 1. Open Solution

Open `ReportViewer.sln` in Visual Studio.

### 2. NuGet Restore

Right-click solution > **Restore NuGet Packages**

### 3. Configure Web.config

#### Connection Strings

```xml
<connectionStrings>
    <!-- For executing sql_command from config -->
    <add name="ReportDB" connectionString="Data Source=YOUR_SERVER;Initial Catalog=YOUR_DB;User ID=sa;Password=YOUR_PASS;" />
    <!-- For reading rpt.t_com_config_report -->
    <add name="ReportConfigDb" connectionString="Data Source=YOUR_SERVER;Initial Catalog=Timesheet;User ID=sa;Password=YOUR_PASS;" />
</connectionStrings>
```

#### Application Server Path

```xml
<add key="AppServerPath" value="D:\Reports" />
```

This replaces `@app_server_path` in `report_path` column values.

### 4. Create Config Table

Run the SQL script to create `rpt.t_com_config_report` table in your Timesheet database.

### 5. Build & Run

Press **F5** in Visual Studio.

---

## Usage

### View Report (Browser)

```
GET /Default.aspx?report_code=SLAReport&FilterConditionString=sla_time='10:30'
```

### Export PDF (API)

```http
POST /ReportExport.ashx
Content-Type: application/json

{
  "report_code": "SLAReport",
  "parameters": {
    "FilterConditionString": "sla_time = '10:30'",
    "filter_value_sla_time": "10:30"
  },
  "output_format": "pdf"
}
```

Returns: `application/pdf` binary

### Get Report Config (API)

```
GET /ReportExport.ashx?action=config&report_code=SLAReport
```

Returns JSON with config including `json_parameter` for frontend UI rendering.

---

## SQL Parameter Replacement

### Pattern 1: View (`sql_object_type = "View"`)

```sql
-- sql_command in DB:
SELECT * FROM Tmt.v_tmt_man_power WHERE 1=1

-- Parameter: { "FilterConditionString": "owner = 'xxx' AND status = 'Active'" }
-- Result:
SELECT * FROM Tmt.v_tmt_man_power WHERE 1=1 AND owner = 'xxx' AND status = 'Active'
```

### Pattern 2: Stored Procedure (`sql_object_type = "Stored Procedure"`)

```sql
-- sql_command in DB:
EXEC [tmt].[usp_calc_sla_target]
  @in_vchFilterCondition = N'{FilterConditionString}',
  @in_vchOperatorSLATime = N'{filter_operator_sla_time}',
  @in_vchValueSLATime = N'{filter_value_sla_time}'

-- Parameters: {
--   "FilterConditionString": "sla_time = '10:30'",
--   "filter_operator_sla_time": "=",
--   "filter_value_sla_time": "10:30"
-- }

-- Result (single quotes escaped):
EXEC [tmt].[usp_calc_sla_target]
  @in_vchFilterCondition = N'sla_time = ''10:30''',
  @in_vchOperatorSLATime = N'=',
  @in_vchValueSLATime = N'10:30'
```

---

## Project Structure

```
BS-Report-Manager-Viewer/
+-- ReportViewer.sln
+-- ReportViewer/
    +-- ReportViewer.csproj             (.NET Framework 4.8)
    +-- Web.config                      (Connection strings, settings)
    +-- Global.asax / .cs
    +-- Site.Master / .cs
    +-- Default.aspx / .cs              (Auto-router by report_code)
    +-- CrystalReportViewer.aspx / .cs  (Crystal Report viewer)
    +-- RdlcReportViewer.aspx / .cs     (RDLC Report viewer)
    +-- SsrsReportViewer.aspx / .cs     (SSRS Report viewer)
    +-- ReportExport.ashx / .cs         (PDF Export API)
    +-- Models/
    |   +-- ReportConfig.cs             (DB table model)
    |   +-- ReportRequest.cs            (API request model)
    +-- Services/
    |   +-- ReportConfigService.cs      (Read config from DB)
    |   +-- ReportDataService.cs        (SQL execution + parameter replacement)
    |   +-- CrystalReportEngine.cs      (RPT load + SetDataSource + export)
    |   +-- RdlcReportEngine.cs         (RDLC load + Assign DataSet + render)
    |   +-- SsrsReportEngine.cs         (SSRS URL build + HTTP render)
    +-- Config/
    |   +-- AppConfig.cs                (Singleton config helper)
    +-- Styles/
    |   +-- Site.css
    +-- Properties/
        +-- AssemblyInfo.cs
```

---

## Database: rpt.t_com_config_report

| Column | Type | Description |
|---|---|---|
| `report_code` | varchar(50) PK | Unique report code |
| `report_name` | varchar(100) | Display name |
| `report_type` | varchar(10) | RPT, RDLC, SSRS, HTML, BarTender |
| `report_path` | nvarchar(150) | File path (supports `@app_server_path`) |
| `rdlc_dataset_name` | varchar(25) | RDLC DataSet name for binding |
| `ssrs_server_url` | varchar(50) | SSRS Report Server URL |
| `ssrs_report_path` | nvarchar(150) | SSRS report path |
| `ssrs_username/password/domain_name` | varchar | SSRS credentials |
| `run_as` | varchar(25) | PDF Viewer / Report Viewer / Text Viewer |
| `sql_object_type` | varchar(25) | View / Stored Procedure |
| `sql_command` | nvarchar(max) | SQL with `{field}` placeholders |
| `json_parameter` | nvarchar(max) | UI parameter definition (JSON) |
| `is_active` | varchar(3) | YES / NO |

---

## Changelog

### v2.0.0 — 2026-02-10

**Config-Driven Redesign**

- Reports configured via `rpt.t_com_config_report` database table
- Frontend sends `report_code` + JSON parameters instead of file paths
- SQL parameter replacement: View (WHERE append) and Stored Procedure (`{field}` placeholder)
- Crystal Report uses API Assign DataSource (SetDataSource with DataTable)
- Added `ReportExport.ashx` API endpoint for PDF/Excel/Word export
- Added `ReportConfigService` for reading config from Timesheet DB
- Added `ReportDataService` for SQL execution with parameter replacement
- Added `CrystalReportEngine`, `RdlcReportEngine`, `SsrsReportEngine`
- CORS support for cross-origin API calls from React frontend
- Two connection strings: `ReportConfigDb` (config) and `ReportDB` (data)
- `AppServerPath` setting for resolving `@app_server_path` in report paths

### v1.0.0 — 2026-02-10

**Initial Release**

- ASP.NET Web Forms project targeting .NET Framework 4.8
- Crystal Report, RDLC, and SSRS viewers
- Query string based parameter passing
- Auto-detect router (Default.aspx)

---

## License

Internal use only — OGA Co., Ltd.
