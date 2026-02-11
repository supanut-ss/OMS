using System;
using System.Collections.Generic;
using System.Net;
using System.Web.UI;
using Microsoft.Reporting.WebForms;
using ReportViewer.Models;
using ReportViewer.Services;

namespace ReportViewer
{
    /// <summary>
    /// Config-driven SSRS Report Viewer
    /// Reads config from rpt.t_com_config_report, connects to SSRS server
    /// </summary>
    public partial class SsrsReportViewerPage : Page
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

                    // Validate SSRS config
                    if (string.IsNullOrEmpty(config.SsrsServerUrl))
                    {
                        ShowError("ssrs_server_url is not configured for report: " + reportCode);
                        return;
                    }

                    if (string.IsNullOrEmpty(config.SsrsReportPath))
                    {
                        ShowError("ssrs_report_path is not configured for report: " + reportCode);
                        return;
                    }

                    // Configure Remote Report
                    SsrsReportViewer1.ProcessingMode = ProcessingMode.Remote;
                    SsrsReportViewer1.ServerReport.ReportServerUrl = new Uri(config.SsrsServerUrl);
                    SsrsReportViewer1.ServerReport.ReportPath = config.SsrsReportPath;

                    // Set credentials from config
                    if (!string.IsNullOrEmpty(config.SsrsUsername))
                    {
                        SsrsReportViewer1.ServerReport.ReportServerCredentials =
                            new SsrsCredentials(config.SsrsUsername, config.SsrsPassword, config.SsrsDomainName);
                    }

                    // Set parameters from query string
                    SetParametersFromQueryString();

                    SsrsReportViewer1.ServerReport.Refresh();
                }
                catch (Exception ex)
                {
                    ShowError(ex.Message);
                }
            }
        }

        /// <summary>
        /// Set SSRS report parameters from Session (POST) and query string (GET)
        /// </summary>
        private void SetParametersFromQueryString()
        {
            // Collect parameters from both sources
            var paramDict = new Dictionary<string, string>();

            // 1. Read from query string (GET)
            foreach (string key in Request.QueryString.AllKeys)
            {
                if (string.IsNullOrEmpty(key)) continue;
                if (key.Equals("report_code", StringComparison.OrdinalIgnoreCase)) continue;
                paramDict[key] = Request.QueryString[key];
            }

            // 2. Merge from Session (POST) — these take priority
            var sessionParams = Session["ReportParameters"] as Dictionary<string, string>;
            if (sessionParams != null)
            {
                foreach (var kvp in sessionParams)
                {
                    paramDict[kvp.Key] = kvp.Value;
                }
                Session.Remove("ReportParameters");
            }

            // Build SSRS ReportParameter list
            var reportParams = new List<ReportParameter>();
            foreach (var kvp in paramDict)
            {
                reportParams.Add(new ReportParameter(kvp.Key, kvp.Value));
            }

            if (reportParams.Count > 0)
            {
                try
                {
                    SsrsReportViewer1.ServerReport.SetParameters(reportParams);
                }
                catch
                {
                    // Parameters may not exist in SSRS report — skip
                }
            }
        }

        private void ShowError(string message)
        {
            pnlError.Visible = true;
            lblError.Text = message;
        }
    }

    /// <summary>
    /// Custom credentials for SSRS authentication
    /// </summary>
    public class SsrsCredentials : IReportServerCredentials
    {
        private readonly string _username;
        private readonly string _password;
        private readonly string _domain;

        public SsrsCredentials(string username, string password, string domain)
        {
            _username = username;
            _password = password;
            _domain = domain;
        }

        public System.Security.Principal.WindowsIdentity ImpersonationUser => null;

        public ICredentials NetworkCredentials =>
            new NetworkCredential(_username, _password, _domain);

        public bool GetFormsCredentials(out System.Net.Cookie authCookie, out string userName, out string password, out string authority)
        {
            authCookie = null;
            userName = _username;
            password = _password;
            authority = _domain;
            return false;
        }
    }
}
