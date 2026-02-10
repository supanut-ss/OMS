using System;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web.UI;
using Microsoft.Reporting.WebForms;
using ReportViewer.Config;

namespace ReportViewer
{
    public partial class RdlcReportViewerPage : Page
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

                    // Get Report Path
                    string reportPath = Request.QueryString["_app_reportpath"];
                    if (string.IsNullOrEmpty(reportPath))
                    {
                        ShowError("Report Path is required (_app_reportpath)");
                        return;
                    }

                    // Load RDLC Report
                    string fullPath = Server.MapPath("~/RdlcReports/" + reportPath);
                    if (!System.IO.File.Exists(fullPath))
                    {
                        ShowError("Report file not found: " + reportPath);
                        return;
                    }

                    RdlcReportViewer1.LocalReport.ReportPath = fullPath;
                    RdlcReportViewer1.ProcessingMode = ProcessingMode.Local;

                    // Set Parameters from query string
                    SetParametersFromQueryString();

                    // Load Data Source if specified
                    string dataSourceName = Request.QueryString["_app_datasource"];
                    string storedProc = Request.QueryString["_app_storedproc"];

                    if (!string.IsNullOrEmpty(storedProc))
                    {
                        LoadDataFromStoredProcedure(dataSourceName ?? "DataSet1", storedProc);
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

                try
                {
                    reportParams.Add(new ReportParameter(key, value));
                }
                catch
                {
                    // Parameter not found — skip
                }
            }

            if (reportParams.Count > 0)
            {
                try
                {
                    RdlcReportViewer1.LocalReport.SetParameters(reportParams);
                }
                catch
                {
                    // Some parameters may not exist in report definition — skip
                }
            }
        }

        /// <summary>
        /// Load data from stored procedure and add as report data source
        /// </summary>
        private void LoadDataFromStoredProcedure(string dataSourceName, string storedProcName)
        {
            string connStr = AppConfig.Instance.ReportDbConnectionString;
            if (string.IsNullOrEmpty(connStr))
            {
                // Build connection string from Crystal Report config settings
                connStr = $"Data Source={AppConfig.Instance.CrtServer};Initial Catalog={AppConfig.Instance.CrtDatabase};" +
                          $"User ID={AppConfig.Instance.CrtUser};Password={AppConfig.Instance.CrtPass};";
            }

            using (SqlConnection conn = new SqlConnection(connStr))
            using (SqlCommand cmd = new SqlCommand(storedProcName, conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 300;

                // Add stored procedure parameters from query string
                string[] internalPrefixes = { "_app_", "_report_", "_db_", "_ssrs_" };
                foreach (string key in Request.QueryString.AllKeys)
                {
                    if (string.IsNullOrEmpty(key)) continue;
                    if (internalPrefixes.Any(p => key.StartsWith(p, StringComparison.OrdinalIgnoreCase))) continue;

                    cmd.Parameters.AddWithValue("@" + key, Server.UrlDecode(Request.QueryString[key]));
                }

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                DataTable dt = new DataTable();
                da.Fill(dt);

                RdlcReportViewer1.LocalReport.DataSources.Add(new ReportDataSource(dataSourceName, dt));
            }
        }

        private void ShowError(string message)
        {
            pnlError.Visible = true;
            lblError.Text = message;
        }
    }
}
