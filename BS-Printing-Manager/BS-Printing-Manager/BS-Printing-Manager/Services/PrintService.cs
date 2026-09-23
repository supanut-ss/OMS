using BS_Printing_Manager.Interfaces;
using BS_Printing_Manager.Models.Request;
using DotNetEnv;
using Microsoft.AspNetCore.Html;
using PdfiumViewer;
using System;
using System.Data;
using System.Drawing.Printing;
using System.Text;
using System.Text.Json;

namespace BS_Printing_Manager.Services
{
    public class PrintService : IPrintService
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<PrintService> _logger;
        private readonly IReportConfigProvider _templateProvider;
        private readonly IPdfGenerator _pdfGenerator;

        public PrintService(IHttpClientFactory httpFactory, ILogger<PrintService> logger, IReportConfigProvider templateProvider, IPdfGenerator pdfGenerator)
        {
            _httpFactory = httpFactory;
            _logger = logger;
            _templateProvider = templateProvider;
            _pdfGenerator = pdfGenerator;
        }

        public async Task PrintReportAsync(PrintRequest request)
        {
            try
            {
                var template = await _templateProvider.GetConfigReportAsync(request.ReportCode);

                if (template.report_type == "BarTender")
                {
                    var dataTable = await _templateProvider.GetConfigExeCmdAsync(template.sql_command, request.JsonData,template.sql_object_type);

                    if (dataTable == null || dataTable.Rows.Count == 0)
                        throw new Exception("No data returned for BarTender.");

                    // --- เตรียม path ---
                    string dataPath = template.bartender_data_path;
                    string triggerPath = template.bartender_trigger_path;

                    if (string.IsNullOrWhiteSpace(dataPath) || string.IsNullOrWhiteSpace(triggerPath))
                        throw new Exception("BarTender path not configured.");

                    string fullDataFile = dataPath;
                    string fullTriggerFile = triggerPath;

                    Directory.CreateDirectory(Path.GetDirectoryName(fullDataFile)!);
                    Directory.CreateDirectory(Path.GetDirectoryName(fullTriggerFile)!);

                    // --- เอา column แรก ---
                    var lines = new List<string>();

                    foreach (DataRow row in dataTable.Rows)
                    {
                        var value = row[0]?.ToString() ?? string.Empty;
                        lines.Add(value);
                    }

                    string contentTrigger = $"Write data success   " + DateTime.Now.ToString("dd/MM/yyyy");

                    // --- เขียน data file ---
                    await File.WriteAllLinesAsync(fullDataFile, lines, Encoding.UTF8);

                    // --- สร้าง trigger file (บางระบบแค่ copy ชื่อเดียวกันก็พอ) ---
                    await File.WriteAllTextAsync(fullTriggerFile, contentTrigger, Encoding.UTF8);
                }
                else if (template.report_type == "HTML")
                {
                    var dataTable = await _templateProvider.GetConfigExeCmdAsync(template.sql_command, request.JsonData, template.sql_object_type);
                    if (dataTable == null || dataTable.Rows.Count == 0)
                        throw new Exception("No data returned.");

                    var htmlBuilder = new StringBuilder();

                    foreach (DataRow row in dataTable.Rows)
                    {
                        var rowHtml = template.html_pdf_body!;

                        foreach (DataColumn col in dataTable.Columns)
                        {
                            var placeholder = "{" + col.ColumnName + "}";
                            var value = row[col]?.ToString() ?? string.Empty;

                            rowHtml = rowHtml.Replace(placeholder, value);
                        }

                        htmlBuilder.AppendLine(rowHtml);
                    }

                    var finalHtml = htmlBuilder.ToString();

                    var htmlApiUrl = Environment.GetEnvironmentVariable("REPORT_MANAGER_HTML_API");

                    if (string.IsNullOrWhiteSpace(htmlApiUrl))
                        throw new ArgumentException("REPORT_MANAGER_HTML_API is required");

                    var payload = new Dictionary<string, object?>
                    {
                        ["html_content"] = finalHtml!,
                        ["page_size"] = template.html_page_size!,
                    };

                    var pdfBytes = await CallApi(htmlApiUrl, payload);

                    PrintPdf(pdfBytes, template.printer_name!, request.Copy ?? 1);
                }
                else
                {
                    var crystalApiUrl = Environment.GetEnvironmentVariable("REPORT_VIEWER_API_URL");

                    if (string.IsNullOrWhiteSpace(crystalApiUrl))
                        throw new ArgumentException("REPORT_VIEWER_API_URL is required");


                    var payload = new Dictionary<string, object?>
                    {
                        ["report_code"] = request.ReportCode,
                        ["output_format"] = "pdf"
                    };

                    if (request.JsonData != null)
                    {
                        payload["parameters"] = request.JsonData;
                    }

                    var pdfBytes = await CallApi(crystalApiUrl, payload);

                    PrintPdf(pdfBytes, template.printer_name!, request.Copy ?? 1);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Print failed");
                throw;
            }
        }

        async Task<byte[]> CallApi(string url, Dictionary<string, object?> payload)
        {
            var client = _httpFactory.CreateClient();

            var content = new StringContent(
                  JsonSerializer.Serialize(payload),
                  Encoding.UTF8,
                  "application/json");

            var response = await client.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
                throw new Exception($"Report service error: {response.StatusCode}");

            var pdfBytes = await response.Content.ReadAsByteArrayAsync();

            return pdfBytes;
        }

        private void PrintPdf(byte[] pdfBytes, string printerName, int copy)
        {
            using var stream = new MemoryStream(pdfBytes);
            using var pdfDoc = PdfDocument.Load(stream);
            using var printDoc = pdfDoc.CreatePrintDocument();

            // ป้องกัน overflow แบบ production-safe
            short shtCopy = copy >= short.MinValue && copy <= short.MaxValue
                ? (short)copy
                : (short)1;

            var printerSettings = new PrinterSettings();

            // ถ้าไม่ส่งชื่อมา หรือส่งมาแต่ไม่มีอยู่จริง → ใช้ Default
            if (!string.IsNullOrWhiteSpace(printerName))
            {
                printerSettings.PrinterName = printerName;

                if (!printerSettings.IsValid)
                {
                    // fallback เป็น default
                    printerSettings = new PrinterSettings();
                }
            }

            printDoc.PrinterSettings = printerSettings;

            printDoc.PrinterSettings.Copies = shtCopy;

            // สำคัญ: ไม่ set PaperSize
            printDoc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
            printDoc.DefaultPageSettings.PrinterResolution = printDoc.PrinterSettings.DefaultPageSettings.PrinterResolution;
            // ปิด dialog
            printDoc.PrintController = new StandardPrintController();

            printDoc.Print();
        }

    }
}
