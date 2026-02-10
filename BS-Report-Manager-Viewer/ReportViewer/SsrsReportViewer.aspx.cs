using System;
using System.Linq;
using System.Net;
using System.Web.UI;
using Microsoft.Reporting.WebForms;
using ReportViewer.Config;

namespace ReportViewer
{
    public partial class SsrsReportViewerPage : Page
    {
        protected void Page_Load(object sender, EventArgs e)
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

                    // Get SSRS URL and Report Path
                    string ssrsUrl = Request.QueryString["_ssrs_url"];
                    string ssrsPath = Request.QueryString["_ssrs_path"];

                    if (string.IsNullOrEmpty(ssrsUrl))
                        ssrsUrl = AppConfig.Instance.SsrsUrl;

                    if (string.IsNullOrEmpty(ssrsUrl))
                    {
                        ShowError("SSRS URL is required (_ssrs_url)");
                        return;
                    }

                    if (string.IsNullOrEmpty(ssrsPath))
                    {
                        ShowError("SSRS Report Path is required (_ssrs_path)");
                        return;
                    }

                    // Configure Remote Report
                    SsrsReportViewer1.ProcessingMode = ProcessingMode.Remote;
                    SsrsReportViewer1.ServerReport.ReportServerUrl = new Uri(ssrsUrl);
                    SsrsReportViewer1.ServerReport.ReportPath = ssrsPath;

                    // Set SSRS Credentials
                    string ssrsUser = Request.QueryString["_ssrs_user"];
                    string ssrsPass = Request.QueryString["_ssrs_pass"];
                    string ssrsDomain = Request.QueryString["_ssrs_domain"];

                    ssrsUser = !string.IsNullOrEmpty(ssrsUser) ? ssrsUser : AppConfig.Instance.SsrsUser;
                    ssrsPass = !string.IsNullOrEmpty(ssrsPass) ? ssrsPass : AppConfig.Instance.SsrsPass;
                    ssrsDomain = !string.IsNullOrEmpty(ssrsDomain) ? ssrsDomain : AppConfig.Instance.SsrsDomain;

                    if (!string.IsNullOrEmpty(ssrsUser))
                    {
                        SsrsReportViewer1.ServerReport.ReportServerCredentials =
                            new SsrsCredentials(ssrsUser, ssrsPass, ssrsDomain);
                    }

                    // Set Parameters from query string
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
        /// Set report parameters from query string, skipping internal parameters
        /// </summary>
        private void SetParametersFromQueryString()
        {
            string[] internalPrefixes = { "_app_", "_report_", "_db_", "_ssrs_" };

            var reportParams = new System.Collections.Generic.List<ReportParameter>();

            foreach (string key in Request.QueryString.AllKeys)
            {
                if (string.IsNullOrEmpty(key)) continue;
                if (internalPrefixes.Any(p => key.StartsWith(p, StringComparison.OrdinalIgnoreCase))) continue;

                string value = Server.UrlDecode(Request.QueryString[key]);
                reportParams.Add(new ReportParameter(key, value));
            }

            if (reportParams.Count > 0)
            {
                try
                {
                    SsrsReportViewer1.ServerReport.SetParameters(reportParams);
                }
                catch
                {
                    // Some parameters may not exist — skip
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

        public bool GetFormsCredentials(out Cookie authCookie, out string userName, out string password, out string authority)
        {
            authCookie = null;
            userName = _username;
            password = _password;
            authority = _domain;
            return false;
        }
    }
}
