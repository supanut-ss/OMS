# BS Report Manager Viewer Usage

## Export Jasper Report

```http
POST /api/reports/export
Content-Type: application/json

{
  "report_code": "INV_SUMMARY",
  "parameters": {
    "FilterConditionString": "warehouse_code = 'WH01'"
  },
  "output_format": "pdf"
}
```

Compatibility route:

```http
POST /ReportExport.ashx
Content-Type: application/json

{
  "report_code": "INV_SUMMARY",
  "parameters": {},
  "output_format": "pdf"
}
```

GET compatibility route:

```http
GET /ReportExport.ashx?report_code=INV_SUMMARY&output_format=pdf&warehouse_code=WH01
```

## Get Config

```http
GET /api/reports/config/INV_SUMMARY
GET /ReportExport.ashx?action=config&report_code=INV_SUMMARY
```

## Upload Sample JSON

```http
POST /api/report-files/jasper
Content-Type: multipart/form-data

file=@InboundReceipt.json
```

Uploaded files are stored under `ReportViewer:AppServerPath` in the `jasper` folder.

## Jasper JSON Flow

1. Load `rpt.t_com_config_report`.
2. Execute `sql_command`.
3. If `jasper_sample_json` exists, shape SQL rows to that JSON structure.
4. If `jasper_sample_json_path` exists, load the sample file and shape SQL rows from it.
5. Send shaped JSON as Jasper parameter `JSON_DATA`.
6. Download Jasper output resource and return it to the caller.

## Docker

```bash
docker build -t bs-report-manager-viewer .
docker run -p 8080:8080 \
  -e "ConnectionStrings__ReportConfigDb=Server=sql;Database=Timesheet;User ID=sa;Password=***;Encrypt=False;TrustServerCertificate=True;" \
  bs-report-manager-viewer
```

Health check:

```http
GET /health
```
