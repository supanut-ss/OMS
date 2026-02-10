using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using Microsoft.Reporting.WebForms;
using ReportViewer.Config;
using ReportViewer.Models;

namespace ReportViewer.Services
{
    /// <summary>
    /// RDLC Report engine — Load .rdlc, assign DataSet, export
    /// </summary>
    public class RdlcReportEngine
    {
        /// <summary>
        /// Create and configure a LocalReport with data source assigned
        /// </summary>
        public static LocalReport LoadReport(ReportConfig config, Dictionary<string, string> parameters)
        {
            // Resolve report path
            string reportPath = ResolveReportPath(config.ReportPath);

            if (!File.Exists(reportPath))
                throw new FileNotFoundException("Report file not found: " + reportPath);

            // Execute SQL to get data
            DataTable data = ReportDataService.ExecuteSql(config, parameters);

            // Load .rdlc file
            LocalReport localReport = new LocalReport();
            localReport.ReportPath = reportPath;

            // Assign DataSet using rdlc_dataset_name from config
            string datasetName = config.RdlcDatasetName ?? "DataSet1";
            localReport.DataSources.Clear();
            localReport.DataSources.Add(new ReportDataSource(datasetName, data));

            return localReport;
        }

        /// <summary>
        /// Export RDLC report to PDF byte array
        /// </summary>
        public static byte[] ExportToPdf(ReportConfig config, Dictionary<string, string> parameters)
        {
            LocalReport localReport = LoadReport(config, parameters);

            string mimeType, encoding, fileNameExtension;
            Warning[] warnings;
            string[] streams;

            byte[] bytes = localReport.Render(
                "PDF",
                null,
                out mimeType,
                out encoding,
                out fileNameExtension,
                out streams,
                out warnings
            );

            return bytes;
        }

        /// <summary>
        /// Export RDLC report to specified format byte array
        /// </summary>
        public static byte[] ExportToFormat(ReportConfig config, Dictionary<string, string> parameters, string format)
        {
            string renderFormat;
            switch ((format ?? "pdf").ToUpper())
            {
                case "PDF":
                    renderFormat = "PDF";
                    break;
                case "EXCEL":
                    renderFormat = "Excel";
                    break;
                case "WORD":
                    renderFormat = "Word";
                    break;
                default:
                    renderFormat = "PDF";
                    break;
            }

            LocalReport localReport = LoadReport(config, parameters);

            string mimeType, encoding, fileNameExtension;
            Warning[] warnings;
            string[] streams;

            byte[] bytes = localReport.Render(
                renderFormat,
                null,
                out mimeType,
                out encoding,
                out fileNameExtension,
                out streams,
                out warnings
            );

            return bytes;
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
