using System;
using System.Collections.Generic;
using System.IO;
using System.Web;
using System.Web.Script.Serialization;
using ReportViewer.Models;
using ReportViewer.Services;

namespace ReportViewer
{
    /// <summary>
    /// HTTP Handler for report export API
    /// 
    /// GET  /ReportExport.ashx?action=config&amp;report_code=XXX  — Get report config (JSON)
    /// POST /ReportExport.ashx — Export report to PDF/Excel/Word (binary)
    /// 
    /// POST Body:
    /// {
    ///   "report_code": "SLAReport",
    ///   "parameters": { "FilterConditionString": "...", "field1": "value1" },
    ///   "output_format": "pdf"
    /// }
    /// </summary>
    public class ReportExportHandler : IHttpHandler
    {
        public bool IsReusable { get { return false; } }

        public void ProcessRequest(HttpContext context)
        {
            // Enable CORS for cross-origin API calls from React frontend
            context.Response.AddHeader("Access-Control-Allow-Origin", "*");
            context.Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            context.Response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

            // Handle CORS preflight
            if (context.Request.HttpMethod == "OPTIONS")
            {
                context.Response.StatusCode = 200;
                return;
            }

            try
            {
                if (context.Request.HttpMethod == "GET")
                {
                    HandleGetRequest(context);
                }
                else if (context.Request.HttpMethod == "POST")
                {
                    HandlePostRequest(context);
                }
                else
                {
                    WriteJsonError(context, "Method not allowed", 405);
                }
            }
            catch (Exception ex)
            {
                WriteJsonError(context, ex.Message, 500);
            }
        }

        /// <summary>
        /// GET: Return report config as JSON
        /// /ReportExport.ashx?action=config&amp;report_code=XXX
        /// </summary>
        private void HandleGetRequest(HttpContext context)
        {
            string action = context.Request.QueryString["action"];
            string reportCode = context.Request.QueryString["report_code"];

            if (string.IsNullOrEmpty(reportCode))
            {
                WriteJsonError(context, "report_code is required", 400);
                return;
            }

            if (action == "config")
            {
                // Return report config as JSON
                ReportConfig config = ReportConfigService.GetConfig(reportCode);

                var result = new Dictionary<string, object>
                {
                    { "report_code", config.ReportCode },
                    { "report_name", config.ReportName },
                    { "report_type", config.ReportType },
                    { "run_as", config.RunAs },
                    { "is_print_by_server", config.IsPrintByServer },
                    { "json_parameter", config.JsonParameter },
                    { "ssrs_server_url", config.SsrsServerUrl },
                    { "ssrs_report_path", config.SsrsReportPath }
                };

                WriteJson(context, result);
            }
            else
            {
                WriteJsonError(context, "Unknown action. Use action=config", 400);
            }
        }

        /// <summary>
        /// POST: Export report to PDF/Excel/Word and return binary
        /// </summary>
        private void HandlePostRequest(HttpContext context)
        {
            // Read JSON body
            string body;
            using (StreamReader reader = new StreamReader(context.Request.InputStream))
            {
                body = reader.ReadToEnd();
            }

            if (string.IsNullOrEmpty(body))
            {
                WriteJsonError(context, "Request body is required", 400);
                return;
            }

            // Parse JSON
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = int.MaxValue;
            var requestData = serializer.Deserialize<Dictionary<string, object>>(body);

            string reportCode = requestData.ContainsKey("report_code")
                ? requestData["report_code"]?.ToString() : null;

            if (string.IsNullOrEmpty(reportCode))
            {
                WriteJsonError(context, "report_code is required", 400);
                return;
            }

            // Parse parameters
            Dictionary<string, string> parameters = new Dictionary<string, string>();
            if (requestData.ContainsKey("parameters") && requestData["parameters"] != null)
            {
                var paramObj = requestData["parameters"] as Dictionary<string, object>;
                if (paramObj != null)
                {
                    foreach (var kvp in paramObj)
                    {
                        parameters[kvp.Key] = kvp.Value?.ToString() ?? "";
                    }
                }
            }

            string outputFormat = requestData.ContainsKey("output_format")
                ? requestData["output_format"]?.ToString() ?? "pdf" : "pdf";

            // Get report config
            ReportConfig config = ReportConfigService.GetConfig(reportCode);

            // Generate report based on type
            byte[] reportBytes;
            string contentType;
            string fileExtension;

            switch (config.ReportType.ToUpper())
            {
                case "RPT":
                    reportBytes = CrystalReportEngine.ExportToFormat(config, parameters, outputFormat);
                    GetContentTypeAndExtension(outputFormat, out contentType, out fileExtension);
                    break;

                case "RDLC":
                    reportBytes = RdlcReportEngine.ExportToFormat(config, parameters, outputFormat);
                    GetContentTypeAndExtension(outputFormat, out contentType, out fileExtension);
                    break;

                case "SSRS":
                    reportBytes = SsrsReportEngine.ExportToFormat(config, parameters, outputFormat);
                    GetContentTypeAndExtension(outputFormat, out contentType, out fileExtension);
                    break;

                default:
                    WriteJsonError(context, "Unsupported report type: " + config.ReportType, 400);
                    return;
            }

            // Return binary file
            string fileName = (config.ReportName ?? config.ReportCode) + "." + fileExtension;
            context.Response.Clear();
            context.Response.ContentType = contentType;
            context.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
            context.Response.AddHeader("Content-Length", reportBytes.Length.ToString());
            context.Response.BinaryWrite(reportBytes);
            context.Response.Flush();
        }

        private void GetContentTypeAndExtension(string format, out string contentType, out string fileExtension)
        {
            switch ((format ?? "pdf").ToUpper())
            {
                case "PDF":
                    contentType = "application/pdf";
                    fileExtension = "pdf";
                    break;
                case "EXCEL":
                    contentType = "application/vnd.ms-excel";
                    fileExtension = "xls";
                    break;
                case "WORD":
                    contentType = "application/msword";
                    fileExtension = "doc";
                    break;
                case "CSV":
                    contentType = "text/csv";
                    fileExtension = "csv";
                    break;
                default:
                    contentType = "application/pdf";
                    fileExtension = "pdf";
                    break;
            }
        }

        private void WriteJson(HttpContext context, object data)
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = int.MaxValue;
            string json = serializer.Serialize(data);

            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.ContentEncoding = System.Text.Encoding.UTF8;
            context.Response.Write(json);
        }

        private void WriteJsonError(HttpContext context, string message, int statusCode)
        {
            context.Response.StatusCode = statusCode;
            WriteJson(context, new Dictionary<string, object>
            {
                { "error", true },
                { "message", message }
            });
        }
    }
}
