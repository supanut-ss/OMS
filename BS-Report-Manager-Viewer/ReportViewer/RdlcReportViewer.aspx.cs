using System;
using System.Collections.Generic;
using System.Web.UI;
using Microsoft.Reporting.WebForms;
using ReportViewer.Models;
using ReportViewer.Services;

namespace ReportViewer
{
    /// <summary>
    /// Config-driven RDLC Report Viewer
    /// Reads config from rpt.t_com_config_report, executes SQL, assigns DataSet
    /// </summary>
    public partial class RdlcReportViewerPage : Page
    {
        protected void Page_Load(object sender, EventArgs e)
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
                    LocalReport localReport = RdlcReportEngine.LoadReport(config, parameters);

                    // Configure viewer
                    RdlcReportViewer1.ProcessingMode = ProcessingMode.Local;
                    RdlcReportViewer1.LocalReport.ReportPath = localReport.ReportPath;
                    RdlcReportViewer1.LocalReport.DataSources.Clear();
                    foreach (var ds in localReport.DataSources)
                    {
                        RdlcReportViewer1.LocalReport.DataSources.Add(ds);
                    }

                    RdlcReportViewer1.LocalReport.Refresh();
                }
                catch (Exception ex)
                {
                    ShowError(ex.Message);
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
                Session.Remove("ReportParameters");
            }

            return parameters;
        }

        private void ShowError(string message)
        {
            pnlError.Visible = true;
            lblError.Text = message;
        }
    }
}
