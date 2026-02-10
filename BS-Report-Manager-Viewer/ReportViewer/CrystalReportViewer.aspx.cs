using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using CrystalDecisions.CrystalReports.Engine;
using ReportViewer.Config;

namespace ReportViewer
{
    public partial class CrystalReportViewerPage : Page
    {
        private ReportDocument rpt = new ReportDocument();

        protected void Page_Init(object sender, EventArgs e)
        {
            if (!IsPostBack)
            {
                try
                {
                    // Set Report Title
                    SiteMaster master = (SiteMaster)this.Master;
                    string reportTitle = Request.QueryString["_app_Reporttitle"];
                    if (!string.IsNullOrEmpty(reportTitle))
                    {
                        master.ReportTitle = Server.UrlDecode(reportTitle);
                        Page.Title = Server.UrlDecode(reportTitle);
                    }

                    // Get Report Path
                    string reportPath = Request.QueryString["_app_reportpath"];
                    if (string.IsNullOrEmpty(reportPath))
                    {
                        ShowError("Report Path is required (_app_reportpath)");
                        return;
                    }

                    // Load Report
                    string fullPath = Server.MapPath("~/CrystalReports/" + reportPath);
                    if (!System.IO.File.Exists(fullPath))
                    {
                        ShowError("Report file not found: " + reportPath);
                        return;
                    }

                    rpt.Load(fullPath);

                    // Set Parameters from query string
                    SetParametersFromQueryString(rpt);

                    // Set Database Connection
                    string server = Request.QueryString["_db_server"];
                    string database = Request.QueryString["_db_name"];
                    string user = Request.QueryString["_db_user"];
                    string pass = Request.QueryString["_db_pass"];

                    // Use query string values if provided, otherwise fall back to config
                    server = !string.IsNullOrEmpty(server) ? server : AppConfig.Instance.CrtServer;
                    database = !string.IsNullOrEmpty(database) ? database : AppConfig.Instance.CrtDatabase;
                    user = !string.IsNullOrEmpty(user) ? user : AppConfig.Instance.CrtUser;
                    pass = !string.IsNullOrEmpty(pass) ? pass : AppConfig.Instance.CrtPass;

                    rpt.DataSourceConnections[0].SetConnection(server, database, user, pass);

                    // Assign to viewer
                    CrystalReportViewer1.ReportSource = rpt;
                    CrystalReportViewer1.Zoom(AppConfig.Instance.CrtZoomDefault);

                    // Store in session for postback
                    Session["CrystalReportDocument"] = rpt;
                }
                catch (Exception ex)
                {
                    ShowError(ex.Message);
                    CrystalReportViewer1.ReportSource = null;
                }
            }
            else
            {
                // Postback — restore from session
                ReportDocument doc = Session["CrystalReportDocument"] as ReportDocument;
                if (doc != null)
                {
                    CrystalReportViewer1.ReportSource = doc;
                }
            }
        }

        /// <summary>
        /// Parse query string parameters and set them on the report.
        /// Skip internal parameters that start with _app_ or _report_ or _db_ or _ssrs_
        /// </summary>
        private void SetParametersFromQueryString(ReportDocument report)
        {
            string[] internalPrefixes = { "_app_", "_report_", "_db_", "_ssrs_" };

            foreach (string key in Request.QueryString.AllKeys)
            {
                if (string.IsNullOrEmpty(key)) continue;
                if (internalPrefixes.Any(p => key.StartsWith(p, StringComparison.OrdinalIgnoreCase))) continue;

                string value = Server.UrlDecode(Request.QueryString[key]);

                try
                {
                    report.SetParameterValue(key, value);
                }
                catch
                {
                    // Parameter not found in report — skip silently
                }
            }
        }

        private void ShowError(string message)
        {
            pnlError.Visible = true;
            lblError.Text = message;
        }

        /// <summary>
        /// Export report to specified format
        /// </summary>
        protected void ExportReport(string format)
        {
            ReportDocument doc = Session["CrystalReportDocument"] as ReportDocument;
            if (doc == null) return;

            CrystalDecisions.Shared.ExportFormatType formatType;
            switch (format.ToUpper())
            {
                case "PDF":
                    formatType = CrystalDecisions.Shared.ExportFormatType.PortableDocFormat;
                    break;
                case "WORD":
                    formatType = CrystalDecisions.Shared.ExportFormatType.WordForWindows;
                    break;
                case "EXCEL":
                    formatType = CrystalDecisions.Shared.ExportFormatType.Excel;
                    break;
                case "CSV":
                    formatType = CrystalDecisions.Shared.ExportFormatType.CharacterSeparatedValues;
                    break;
                default:
                    formatType = CrystalDecisions.Shared.ExportFormatType.PortableDocFormat;
                    break;
            }

            doc.ExportToHttpResponse(formatType, Response, true, "Report");
        }
    }
}
