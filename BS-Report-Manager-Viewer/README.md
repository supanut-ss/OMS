# BS Report Manager Viewer

Web Report Viewer application built on **ASP.NET Web Forms (.NET Framework 4.8)**.  
Supports **Crystal Report (.rpt)**, **Microsoft RDLC (.rdlc)**, and **SSRS** reports in a single unified viewer.

---

## Features

| Report Type | Viewer Control | Description |
|---|---|---|
| **Crystal Report** (`.rpt`) | SAP Crystal Reports Viewer 13.0 | Load `.rpt` files, set parameters, connect to SQL Server, export to PDF/Word/Excel/CSV |
| **RDLC Report** (`.rdlc`) | Microsoft ReportViewer 15.0 | Local report processing with stored procedure data source support |
| **SSRS Report** | Microsoft ReportViewer 15.0 (Remote) | Connect to SQL Server Reporting Services with credential support |

### Additional Features
- **Auto-detect report type** from file extension (`.rpt` → Crystal, `.rdlc` → RDLC)
- **Query string API** — open reports via URL with parameters
- **Configurable database connection** — via `Web.config` or query string override
- **Export support** — PDF, Word, Excel, CSV (Crystal Reports)
- **Session-based postback** — maintains report state across postbacks

---

## Prerequisites

1. **Visual Studio 2019+** with ASP.NET and web development workload
2. **SAP Crystal Reports Runtime** (v13.0) — [Download](https://www.sap.com/cmp/td/sap-crystal-reports-visual-studio-702702702702702702.html)
3. **SQL Server** for report data source
4. **.NET Framework 4.8** Developer Pack

---

## Getting Started

### 1. Open Solution

Open `ReportViewer.sln` in Visual Studio.

### 2. NuGet Restore

Right-click solution → **Restore NuGet Packages**  
This installs `Microsoft.ReportingServices.ReportViewerControl.WebForms` (v150.1537.0).

### 3. Configure Web.config

Edit `ReportViewer/Web.config` and update the database connection settings:

```xml
<appSettings>
    <add key="crtServer"   value="YOUR_SQL_SERVER" />
    <add key="crtUser"     value="sa" />
    <add key="crtPass"     value="YOUR_PASSWORD" />
    <add key="crtDatabase" value="YOUR_DATABASE" />
</appSettings>
```

For SSRS reports, also configure:

```xml
<add key="ssrsUrl"    value="http://your-ssrs-server/reportserver" />
<add key="ssrsUser"   value="ssrs_user" />
<add key="ssrsPass"   value="ssrs_password" />
<add key="ssrsDomain" value="YOUR_DOMAIN" />
```

### 4. Place Report Files

- Crystal Reports (`.rpt`) → `ReportViewer/CrystalReports/`
- RDLC Reports (`.rdlc`) → `ReportViewer/RdlcReports/`

### 5. Build & Run

Press **F5** or **Ctrl+F5** in Visual Studio to build and run with IIS Express.

---

## Usage — URL API

### Crystal Report

```
/Default.aspx?_app_reportpath=MyReport.rpt&_app_Reporttitle=My Report&param1=value1&param2=value2
```

### RDLC Report

```
/Default.aspx?_app_reportpath=MyReport.rdlc&_app_Reporttitle=My Report&_app_storedproc=sp_GetData&param1=value1
```

### SSRS Report

```
/Default.aspx?_report_type=ssrs&_ssrs_url=http://server/reportserver&_ssrs_path=/Reports/MyReport&param1=value1
```

### Direct Page Access

You can also access viewer pages directly:

```
/CrystalReportViewer.aspx?_app_reportpath=MyReport.rpt&_app_Reporttitle=My Report
/RdlcReportViewer.aspx?_app_reportpath=MyReport.rdlc&_app_Reporttitle=My Report
/SsrsReportViewer.aspx?_ssrs_url=http://server/reportserver&_ssrs_path=/Reports/MyReport
```

---

## Query String Parameters

### Common Parameters

| Parameter | Required | Description |
|---|---|---|
| `_report_type` | No | Report type: `crystal`, `rdlc`, `ssrs`. Auto-detected from file extension if not specified |
| `_app_reportpath` | Yes* | Report file name (e.g. `MyReport.rpt`, `MyReport.rdlc`) |
| `_app_Reporttitle` | No | Display title in the header |

### Database Override (Crystal/RDLC)

| Parameter | Description |
|---|---|
| `_db_server` | SQL Server hostname (overrides `Web.config`) |
| `_db_name` | Database name |
| `_db_user` | SQL username |
| `_db_pass` | SQL password |

### RDLC Specific

| Parameter | Description |
|---|---|
| `_app_datasource` | DataSource name in RDLC (default: `DataSet1`) |
| `_app_storedproc` | Stored procedure name for data retrieval |

### SSRS Specific

| Parameter | Required | Description |
|---|---|---|
| `_ssrs_url` | Yes | SSRS Report Server URL |
| `_ssrs_path` | Yes | Report path on SSRS (e.g. `/Reports/MyReport`) |
| `_ssrs_user` | No | SSRS username (overrides `Web.config`) |
| `_ssrs_pass` | No | SSRS password |
| `_ssrs_domain` | No | SSRS domain |

### Report Parameters

Any query string parameter **not** starting with `_app_`, `_report_`, `_db_`, or `_ssrs_` will be passed as a **report parameter**.

Example: `&StartDate=2026-01-01&EndDate=2026-01-31` → sets report parameters `StartDate` and `EndDate`.

---

## Project Structure

```
BS-Report-Manager-Viewer/
├── ReportViewer.sln                    # Solution file
├── nuget.exe                           # NuGet CLI (for package restore)
├── packages/                           # NuGet packages
└── ReportViewer/
    ├── ReportViewer.csproj             # Project file (.NET Framework 4.8)
    ├── Web.config                      # Configuration
    ├── packages.config                 # NuGet package references
    ├── Global.asax / .cs               # Application startup
    ├── Site.Master / .cs               # Master page layout
    ├── Default.aspx / .cs              # Landing page & auto-router
    ├── CrystalReportViewer.aspx / .cs  # Crystal Report viewer
    ├── RdlcReportViewer.aspx / .cs     # RDLC Report viewer
    ├── SsrsReportViewer.aspx / .cs     # SSRS Report viewer
    ├── Config/
    │   └── AppConfig.cs                # Singleton config helper
    ├── Styles/
    │   └── Site.css                    # CSS styles
    ├── Properties/
    │   └── AssemblyInfo.cs
    ├── CrystalReports/                 # Place .rpt files here
    └── RdlcReports/                    # Place .rdlc files here
```

---

## Troubleshooting

### Crystal Reports Runtime not found

Install **SAP Crystal Reports Runtime** (SP36 or later) for .NET Framework.  
Ensure the version in `Web.config` assemblies matches the installed version (default: `13.0.4000.0`).

### Microsoft.ReportViewer.WebForms not found

Run NuGet Restore in Visual Studio or:

```bash
nuget.exe restore ReportViewer\packages.config -PackagesDirectory packages
```

### WebApplication.targets not found

Ensure the **ASP.NET and web development** workload is installed in Visual Studio Installer.

---

## Technology Stack

| Component | Version |
|---|---|
| .NET Framework | 4.8 |
| ASP.NET Web Forms | 4.8 |
| SAP Crystal Reports | 13.0.4000.0 |
| Microsoft ReportViewer | 15.0.0.0 |
| NuGet Package | Microsoft.ReportingServices.ReportViewerControl.WebForms 150.1537.0 |

---

## Changelog

### v1.0.0 — 2026-02-10

**Initial Release**

- Created ASP.NET Web Forms project targeting .NET Framework 4.8
- Crystal Report Viewer (`CrystalReportViewer.aspx`)
  - Load `.rpt` files from `CrystalReports/` folder
  - Set report parameters from query string
  - Connect to SQL Server via `Web.config` or query string override
  - Support export to PDF, Word, Excel, CSV
  - Session-based report document for postback handling
- RDLC Report Viewer (`RdlcReportViewer.aspx`)
  - Load `.rdlc` files from `RdlcReports/` folder
  - Local report processing with `Microsoft.Reporting.WebForms.ReportViewer`
  - Data loading from stored procedures via `SqlDataAdapter`
  - Set report parameters from query string
- SSRS Report Viewer (`SsrsReportViewer.aspx`)
  - Remote report processing connecting to SSRS server
  - Custom `IReportServerCredentials` implementation for authentication
  - Set report parameters from query string
- Auto-detect router (`Default.aspx`)
  - Auto-detect report type from file extension (`.rpt` / `.rdlc`)
  - Redirect to appropriate viewer page with all query parameters preserved
- Landing page with report type info cards
- Unified `Site.Master` layout with gradient header
- `AppConfig.cs` singleton configuration helper
- UTF-8 encoding support with `globalization` settings
- Responsive CSS design

---

## License

Internal use only — OGA Co., Ltd.
