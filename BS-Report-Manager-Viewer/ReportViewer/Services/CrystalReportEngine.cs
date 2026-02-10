using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using CrystalDecisions.CrystalReports.Engine;
using CrystalDecisions.Shared;
using ReportViewer.Config;
using ReportViewer.Models;

namespace ReportViewer.Services
{
    /// <summary>
    /// Crystal Report engine — Load .rpt, assign DataSource from DataTable, export
    /// Uses API Assign DataSource pattern (no Crystal Report parameters)
    /// </summary>
    public class CrystalReportEngine
    {
        /// <summary>
        /// Load Crystal Report and assign data source
        /// Returns ReportDocument for viewer or export
        /// </summary>
        public static ReportDocument LoadReport(ReportConfig config, Dictionary<string, string> parameters)
        {
            // Resolve report path
            string reportPath = ResolveReportPath(config.ReportPath);

            if (!File.Exists(reportPath))
                throw new FileNotFoundException("Report file not found: " + reportPath);

            // Execute SQL to get data
            DataTable data = ReportDataService.ExecuteSql(config, parameters);

            // Load .rpt file
            ReportDocument rptDoc = new ReportDocument();
            rptDoc.Load(reportPath);

            // Assign DataSource — clear existing and set new data
            rptDoc.SetDataSource(data);

            return rptDoc;
        }

        /// <summary>
        /// Export Crystal Report to PDF byte array
        /// </summary>
        public static byte[] ExportToPdf(ReportConfig config, Dictionary<string, string> parameters)
        {
            using (ReportDocument rptDoc = LoadReport(config, parameters))
            {
                using (Stream stream = rptDoc.ExportToStream(ExportFormatType.PortableDocFormat))
                {
                    byte[] buffer = new byte[stream.Length];
                    stream.Read(buffer, 0, buffer.Length);
                    return buffer;
                }
            }
        }

        /// <summary>
        /// Export Crystal Report to specified format byte array
        /// </summary>
        public static byte[] ExportToFormat(ReportConfig config, Dictionary<string, string> parameters, string format)
        {
            ExportFormatType formatType;
            switch ((format ?? "pdf").ToUpper())
            {
                case "PDF":
                    formatType = ExportFormatType.PortableDocFormat;
                    break;
                case "WORD":
                    formatType = ExportFormatType.WordForWindows;
                    break;
                case "EXCEL":
                    formatType = ExportFormatType.Excel;
                    break;
                case "CSV":
                    formatType = ExportFormatType.CharacterSeparatedValues;
                    break;
                default:
                    formatType = ExportFormatType.PortableDocFormat;
                    break;
            }

            using (ReportDocument rptDoc = LoadReport(config, parameters))
            {
                using (Stream stream = rptDoc.ExportToStream(formatType))
                {
                    byte[] buffer = new byte[stream.Length];
                    stream.Read(buffer, 0, buffer.Length);
                    return buffer;
                }
            }
        }

        /// <summary>
        /// Resolve report_path: replace @app_server_path with configured server path
        /// </summary>
        private static string ResolveReportPath(string reportPath)
        {
            if (string.IsNullOrEmpty(reportPath))
                throw new ArgumentException("report_path is not configured");

            string appServerPath = AppConfig.Instance.AppServerPath;

            if (!string.IsNullOrEmpty(appServerPath))
            {
                reportPath = reportPath.Replace("@app_server_path", appServerPath);
            }

            return reportPath;
        }
    }
}
