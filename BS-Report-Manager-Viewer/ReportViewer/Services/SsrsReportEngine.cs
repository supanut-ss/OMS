using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using ReportViewer.Models;

namespace ReportViewer.Services
{
    /// <summary>
    /// SSRS Report engine — Build viewer URL, export PDF via SSRS Reporting Services URL API
    /// </summary>
    public class SsrsReportEngine
    {
        /// <summary>
        /// Build SSRS report viewer URL with parameters
        /// For opening in browser/new tab
        /// </summary>
        public static string BuildViewerUrl(ReportConfig config, Dictionary<string, string> parameters)
        {
            if (string.IsNullOrEmpty(config.SsrsServerUrl))
                throw new ArgumentException("ssrs_server_url is not configured");

            if (string.IsNullOrEmpty(config.SsrsReportPath))
                throw new ArgumentException("ssrs_report_path is not configured");

            // Build SSRS URL: {server}/Pages/ReportViewer.aspx?/{report_path}&param1=val1
            StringBuilder url = new StringBuilder();
            url.Append(config.SsrsServerUrl.TrimEnd('/'));
            url.Append("/Pages/ReportViewer.aspx?");
            url.Append(config.SsrsReportPath);

            // Append parameters
            if (parameters != null)
            {
                foreach (var param in parameters)
                {
                    url.Append("&");
                    url.Append(Uri.EscapeDataString(param.Key));
                    url.Append("=");
                    url.Append(Uri.EscapeDataString(param.Value ?? ""));
                }
            }

            return url.ToString();
        }

        /// <summary>
        /// Export SSRS report to PDF using SSRS URL rendering API
        /// Uses URL: {server}?/{report_path}&rs:Format=PDF&param1=val1
        /// </summary>
        public static byte[] ExportToPdf(ReportConfig config, Dictionary<string, string> parameters)
        {
            return ExportToFormat(config, parameters, "PDF");
        }

        /// <summary>
        /// Export SSRS report to specified format using URL rendering API
        /// </summary>
        public static byte[] ExportToFormat(ReportConfig config, Dictionary<string, string> parameters, string format)
        {
            if (string.IsNullOrEmpty(config.SsrsServerUrl))
                throw new ArgumentException("ssrs_server_url is not configured");

            if (string.IsNullOrEmpty(config.SsrsReportPath))
                throw new ArgumentException("ssrs_report_path is not configured");

            // Build SSRS rendering URL
            // Format: {server}?/{report_path}&rs:Format=PDF&rs:Command=Render&param1=val1
            StringBuilder url = new StringBuilder();
            url.Append(config.SsrsServerUrl.TrimEnd('/'));
            url.Append("?");
            url.Append(config.SsrsReportPath);
            url.Append("&rs:Format=");
            url.Append(format ?? "PDF");
            url.Append("&rs:Command=Render");

            // Append parameters
            if (parameters != null)
            {
                foreach (var param in parameters)
                {
                    url.Append("&");
                    url.Append(Uri.EscapeDataString(param.Key));
                    url.Append("=");
                    url.Append(Uri.EscapeDataString(param.Value ?? ""));
                }
            }

            // Create web request with credentials
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url.ToString());
            request.Method = "GET";
            request.Timeout = 300000; // 5 minutes

            // Set credentials from config
            if (!string.IsNullOrEmpty(config.SsrsUsername))
            {
                request.Credentials = new NetworkCredential(
                    config.SsrsUsername,
                    config.SsrsPassword ?? "",
                    config.SsrsDomainName ?? ""
                );
            }
            else
            {
                request.UseDefaultCredentials = true;
            }

            // Execute request and read response
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                using (Stream responseStream = response.GetResponseStream())
                {
                    using (MemoryStream ms = new MemoryStream())
                    {
                        responseStream.CopyTo(ms);
                        return ms.ToArray();
                    }
                }
            }
        }
    }
}
