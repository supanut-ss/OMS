using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web.UI;
using CrystalDecisions.CrystalReports.Engine;
using ReportViewer.Models;
using ReportViewer.Services;

namespace ReportViewer
{
    /// <summary>
    /// Config-driven Crystal Report Viewer
    /// Reads config from rpt.t_com_config_report, executes SQL, assigns DataSource
    /// </summary>
    public partial class CrystalReportViewerPage : Page
    {
        protected void Page_Init(object sender, EventArgs e)
        {
            if (!IsPostBack)
            {
                try
                {
                    string reportCode = Request.QueryString["report_code"];
                    if (string.IsNullOrEmpty(reportCode))
                    {
                        ShowError("report_code is required");
                        return;
                    }

                    // Get report config from DB
                    ReportConfig config = ReportConfigService.GetConfig(reportCode);

                    // Set title
                    SiteMaster master = (SiteMaster)this.Master;
                    if (!string.IsNullOrEmpty(config.ReportName))
                    {
                        master.ReportTitle = config.ReportName;
                        Page.Title = config.ReportName;
                    }

                    // Get parameters from query string
                    Dictionary<string, string> parameters = GetParametersFromQueryString();

                    // Load report with data source assigned
                    ReportDocument rptDoc = CrystalReportEngine.LoadReport(config, parameters);

                    // Assign to viewer
                    CrystalReportViewer1.ReportSource = rptDoc;

                    // Store in session for postback
                    Session["CrystalReportDocument"] = rptDoc;
                    Session["ReportConfig"] = config;
                }
                catch (Exception ex)
                {
                    ShowError(ex.Message);
                    CrystalReportViewer1.ReportSource = null;
                }
            }
            else
            {
                // Postback: restore from session
                ReportDocument doc = Session["CrystalReportDocument"] as ReportDocument;
                if (doc != null)
                {
                    CrystalReportViewer1.ReportSource = doc;
                }
            }
        }

        /// <summary>
        /// Get parameters: Session (POST via Default.aspx) takes priority, then query string (GET)
        /// </summary>
        private Dictionary<string, string> GetParametersFromQueryString()
        {
            var parameters = new Dictionary<string, string>();

            // 1. Read from query string (GET)
            foreach (string key in Request.QueryString.AllKeys)
            {
                if (string.IsNullOrEmpty(key)) continue;
                if (key.Equals("report_code", StringComparison.OrdinalIgnoreCase)) continue;

                parameters[key] = Request.QueryString[key];
            }

            // 2. Merge from Session (POST) — these take priority
            var sessionParams = Session["ReportParameters"] as Dictionary<string, string>;
            if (sessionParams != null)
            {
                foreach (var kvp in sessionParams)
                {
                    parameters[kvp.Key] = kvp.Value;
                }
                // Clear session after reading to prevent stale data
                Session.Remove("ReportParameters");
            }

            return parameters;
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
