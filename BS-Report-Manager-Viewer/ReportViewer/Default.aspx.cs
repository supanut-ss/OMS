using System;
using System.Web;
using System.Web.UI;

namespace ReportViewer
{
    public partial class Default : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            if (!IsPostBack)
            {
                string reportType = Request.QueryString["_report_type"];

                if (string.IsNullOrEmpty(reportType))
                {
                    // Auto-detect from report path extension
                    string reportPath = Request.QueryString["_app_reportpath"];
                    if (!string.IsNullOrEmpty(reportPath))
                    {
                        string ext = System.IO.Path.GetExtension(reportPath).ToLower();
                        switch (ext)
                        {
                            case ".rpt": reportType = "crystal"; break;
                            case ".rdlc": reportType = "rdlc"; break;
                            default: reportType = "crystal"; break;
                        }
                    }
                }

                if (!string.IsNullOrEmpty(reportType))
                {
                    // Build redirect URL preserving all query parameters
                    string queryString = Request.QueryString.ToString();
                    string targetPage = "";

                    switch (reportType.ToLower())
                    {
                        case "crystal":
                            targetPage = "CrystalReportViewer.aspx";
                            break;
                        case "rdlc":
                            targetPage = "RdlcReportViewer.aspx";
                            break;
                        case "ssrs":
                            targetPage = "SsrsReportViewer.aspx";
                            break;
                        default:
                            ShowError("Unknown report type: " + reportType);
                            return;
                    }

                    Response.Redirect($"{targetPage}?{queryString}", false);
                    Context.ApplicationInstance.CompleteRequest();
                    return;
                }

                // No report type specified — show landing page
                pnlLanding.Visible = true;
            }
        }

        private void ShowError(string message)
        {
            pnlError.Visible = true;
            lblError.Text = message;
            pnlLanding.Visible = false;
        }
    }
}
