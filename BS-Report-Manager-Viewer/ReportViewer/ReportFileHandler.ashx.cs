using System;
using System.IO;
using System.Web;
using ReportViewer.Config;

namespace ReportViewer
{
    /// <summary>
    /// HTTP Handler for report file download and upload
    /// 
    /// Download: GET /ReportFileHandler.ashx?action=download&amp;type=rpt&amp;file=Report1.rpt
    /// Upload:   POST /ReportFileHandler.ashx?action=upload&amp;type=rpt  (multipart form with file)
    /// </summary>
    public class ReportFileHandler : IHttpHandler
    {
        public bool IsReusable { get { return false; } }

        public void ProcessRequest(HttpContext context)
        {
            string action = context.Request.QueryString["action"] ?? "";
            string type = (context.Request.QueryString["type"] ?? "").ToLower();

            try
            {
                switch (action.ToLower())
                {
                    case "download":
                        HandleDownload(context, type);
                        break;
                    case "upload":
                        HandleUpload(context, type);
                        break;
                    default:
                        context.Response.StatusCode = 400;
                        context.Response.Write("Invalid action. Use action=download or action=upload");
                        break;
                }
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Error: " + ex.Message);
            }
        }

        private void HandleDownload(HttpContext context, string type)
        {
            string fileName = context.Request.QueryString["file"];
            if (string.IsNullOrEmpty(fileName))
            {
                context.Response.StatusCode = 400;
                context.Response.Write("file parameter is required");
                return;
            }

            // Sanitize filename — prevent directory traversal
            fileName = Path.GetFileName(fileName);

            string folder = GetReportFolder(type);
            string filePath = Path.Combine(folder, fileName);

            if (!File.Exists(filePath))
            {
                context.Response.StatusCode = 404;
                context.Response.Write("File not found: " + fileName);
                return;
            }

            // Send file as download
            context.Response.Clear();
            context.Response.ContentType = "application/octet-stream";
            context.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
            context.Response.AddHeader("Content-Length", new FileInfo(filePath).Length.ToString());
            context.Response.TransmitFile(filePath);
            context.Response.Flush();
        }

        private void HandleUpload(HttpContext context, string type)
        {
            if (context.Request.Files.Count == 0)
            {
                context.Response.StatusCode = 400;
                context.Response.Write("No file uploaded");
                return;
            }

            HttpPostedFile uploadedFile = context.Request.Files[0];
            string fileName = Path.GetFileName(uploadedFile.FileName);

            // Validate file extension
            string ext = Path.GetExtension(fileName).ToLower();
            if (type == "rpt" && ext != ".rpt")
            {
                context.Response.StatusCode = 400;
                context.Response.Write("Only .rpt files are allowed for RPT folder");
                return;
            }
            if (type == "rdlc" && ext != ".rdlc")
            {
                context.Response.StatusCode = 400;
                context.Response.Write("Only .rdlc files are allowed for RDLC folder");
                return;
            }

            string folder = GetReportFolder(type);

            // Ensure folder exists
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            string filePath = Path.Combine(folder, fileName);

            // Save file (overwrite if exists)
            uploadedFile.SaveAs(filePath);

            context.Response.ContentType = "text/plain";
            context.Response.Write("OK:" + fileName);
        }

        /// <summary>
        /// Get the report folder based on type (rpt or rdlc)
        /// Uses AppServerPath from config
        /// </summary>
        private string GetReportFolder(string type)
        {
            string basePath = AppConfig.Instance.AppServerPath;
            if (string.IsNullOrEmpty(basePath))
            {
                // Fallback to app directory
                basePath = HttpContext.Current.Server.MapPath("~/");
            }

            switch (type)
            {
                case "rpt":
                    return Path.Combine(basePath, "rpt");
                case "rdlc":
                    return Path.Combine(basePath, "rdlc");
                default:
                    return basePath;
            }
        }
    }
}
