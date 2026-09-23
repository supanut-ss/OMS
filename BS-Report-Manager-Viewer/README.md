# BS Report Manager Viewer

ASP.NET Core (.NET 9) report export service for Docker deployment.

This service reads report configuration from `rpt.t_com_config_report`, executes the configured SQL command when needed, converts rows into the configured Jasper sample JSON shape, injects the result into `JSON_DATA`, then runs the report through Jaspersoft REST API v2.

## Supported Runtime

| Report Type | Docker Support | Notes |
|---|---:|---|
| `JASPER` | Yes | Supported through Jaspersoft REST API v2 |
| `RPT` / Crystal | No | SAP Crystal runtime is Windows/.NET Framework oriented |
| `RDLC` WebForms viewer | No | `Microsoft.Reporting.WebForms` is not ASP.NET Core/Linux compatible |
| `SSRS` WebForms viewer | No | Old viewer control was WebForms-based |

## Endpoints

```http
GET /health
GET /api/reports/config/{reportCode}
POST /api/reports/export
GET /ReportExport.ashx?report_code={code}&output_format=pdf
POST /ReportExport.ashx
GET /api/report-files/{type}
POST /api/report-files/{type}
GET /api/report-files/{type}/{fileName}
```

`ReportExport.ashx` is kept as a compatibility route for existing callers. It is now handled by ASP.NET Core, not an `.ashx` file.

## Export Request

```json
{
  "report_code": "INV_SUMMARY",
  "parameters": {
    "FilterConditionString": "owner_code = 'OGA'",
    "warehouse_code": "WH01"
  },
  "output_format": "pdf"
}
```

Only `report_type = 'JASPER'` is exported in this Docker-ready version.

## Configuration

Use `ConnectionStrings:ReportConfigDb` or `ReportViewer:ReportConfigConnectionString`.

```json
{
  "ReportViewer": {
    "AppServerPath": "Reports"
  },
  "ConnectionStrings": {
    "ReportConfigDb": "Server=...;Database=...;User ID=...;Password=...;Encrypt=False;TrustServerCertificate=True;"
  }
}
```

Docker environment variable example:

```bash
docker run -p 8080:8080 \
  -e "ConnectionStrings__ReportConfigDb=Server=sql;Database=Timesheet;User ID=sa;Password=***;Encrypt=False;TrustServerCertificate=True;" \
  bs-report-manager-viewer
```

## Build

```bash
dotnet build ReportViewer.sln
docker build -t bs-report-manager-viewer .
```
