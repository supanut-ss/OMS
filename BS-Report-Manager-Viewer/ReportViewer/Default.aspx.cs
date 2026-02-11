using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.Script.Serialization;
using ReportViewer.Config;
using ReportViewer.Models;
using ReportViewer.Services;

namespace ReportViewer
{
    /// <summary>
    /// Default page — auto-detect report type and redirect, or show file manager
    /// </summary>
    public partial class Default : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            // Support both GET and POST for report_code
            string reportCode = Request.QueryString["report_code"]
                ?? Request.Form["report_code"];

            // If report_code is specified, route to appropriate viewer
            if (!string.IsNullOrEmpty(reportCode))
            {
                if (!IsPostBack || Request.HttpMethod == "POST")
                {
                    // If POST with json_parameters, parse and store in Session
                    StorePostParametersInSession();
                    RouteToViewer(reportCode);
                }
                return;
            }

            // Always show landing + file manager (must persist on postback for tab switching)
            pnlLanding.Visible = true;
            pnlFileManager.Visible = true;

            if (!IsPostBack)
            {
                LoadFileList("rpt");
            }
        }

        #region Report Routing

        private void RouteToViewer(string reportCode)
        {
            try
            {
                ReportConfig config = ReportConfigService.GetConfig(reportCode);

                SiteMaster master = (SiteMaster)this.Master;
                if (!string.IsNullOrEmpty(config.ReportName))
                {
                    master.ReportTitle = config.ReportName;
                    Page.Title = config.ReportName;
                }

                string targetPage;
                switch (config.ReportType.ToUpper())
                {
                    case "RPT":
                        targetPage = "CrystalReportViewer.aspx";
                        break;
                    case "RDLC":
                        targetPage = "RdlcReportViewer.aspx";
                        break;
                    case "SSRS":
                        string runAs = (config.RunAs ?? "").Trim();
                        if (runAs.Equals("Report Viewer", StringComparison.OrdinalIgnoreCase))
                        {
                            Dictionary<string, string> parameters = GetAllParameters();
                            string ssrsUrl = SsrsReportEngine.BuildViewerUrl(config, parameters);
                            Response.Redirect(ssrsUrl, false);
                            return;
                        }
                        targetPage = "SsrsReportViewer.aspx";
                        break;
                    default:
                        ShowError("Unsupported report type: " + config.ReportType);
                        return;
                }

                // Only append query string params (POST params are in Session)
                string queryParams = BuildParameterQueryString();
                string redirectUrl = targetPage + "?report_code=" + HttpUtility.UrlEncode(reportCode);
                if (!string.IsNullOrEmpty(queryParams))
                    redirectUrl += "&" + queryParams;

                Response.Redirect(redirectUrl, false);
            }
            catch (Exception ex)
            {
                pnlLanding.Visible = false;
                pnlFileManager.Visible = false;
                ShowError(ex.Message);
            }
        }

        /// <summary>
        /// Parse POST json_parameters and store in Session for viewer pages
        /// </summary>
        private void StorePostParametersInSession()
        {
            string jsonParams = Request.Form["json_parameters"];
            if (string.IsNullOrEmpty(jsonParams))
            {
                // No POST params — clear session in case of stale data
                Session.Remove("ReportParameters");
                return;
            }

            try
            {
                var serializer = new JavaScriptSerializer();
                var parameters = serializer.Deserialize<Dictionary<string, string>>(jsonParams);
                Session["ReportParameters"] = parameters;
            }
            catch
            {
                Session.Remove("ReportParameters");
            }
        }

        /// <summary>
        /// Get parameters from both Session (POST) and query string (GET), merged
        /// Session (POST) takes priority over query string
        /// </summary>
        private Dictionary<string, string> GetAllParameters()
        {
            var parameters = GetParametersFromQueryString();

            // Merge Session parameters (from POST) — these take priority
            var sessionParams = Session["ReportParameters"] as Dictionary<string, string>;
            if (sessionParams != null)
            {
                foreach (var kvp in sessionParams)
                {
                    parameters[kvp.Key] = kvp.Value;
                }
            }

            return parameters;
        }

        private string BuildParameterQueryString()
        {
            var parts = new List<string>();
            foreach (string key in Request.QueryString.AllKeys)
            {
                if (string.IsNullOrEmpty(key)) continue;
                if (key.Equals("report_code", StringComparison.OrdinalIgnoreCase)) continue;
                string value = Request.QueryString[key];
                parts.Add(HttpUtility.UrlEncode(key) + "=" + HttpUtility.UrlEncode(value));
            }
            return string.Join("&", parts);
        }

        private Dictionary<string, string> GetParametersFromQueryString()
        {
            var parameters = new Dictionary<string, string>();
            foreach (string key in Request.QueryString.AllKeys)
            {
                if (string.IsNullOrEmpty(key)) continue;
                if (key.Equals("report_code", StringComparison.OrdinalIgnoreCase)) continue;
                parameters[key] = Request.QueryString[key];
            }
            return parameters;
        }

        #endregion

        #region File Manager

        protected void tabRpt_Click(object sender, EventArgs e)
        {
            LoadFileList("rpt");
        }

        protected void tabRdlc_Click(object sender, EventArgs e)
        {
            LoadFileList("rdlc");
        }

        private void LoadFileList(string activeTab)
        {
            pnlFileManager.Visible = true;

            // Load RPT files
            var rptFiles = GetReportFiles("rpt", "*.rpt");
            var rdlcFiles = GetReportFiles("rdlc", "*.rdlc");

            // Set tab text with counts
            tabRpt.Text = "&#x1F48E; Crystal Reports (.rpt) <span class='file-count'>(" + rptFiles.Count + ")</span>";
            tabRdlc.Text = "&#x1F4CB; RDLC Reports (.rdlc) <span class='file-count'>(" + rdlcFiles.Count + ")</span>";

            // Bind RPT
            if (rptFiles.Count > 0)
            {
                rptRptFiles.Visible = true;
                pnlRptEmpty.Visible = false;
                rptRptFiles.DataSource = rptFiles;
                rptRptFiles.DataBind();
            }
            else
            {
                rptRptFiles.Visible = false;
                pnlRptEmpty.Visible = true;
            }

            // Bind RDLC
            if (rdlcFiles.Count > 0)
            {
                rptRdlcFiles.Visible = true;
                pnlRdlcEmpty.Visible = false;
                rptRdlcFiles.DataSource = rdlcFiles;
                rptRdlcFiles.DataBind();
            }
            else
            {
                rptRdlcFiles.Visible = false;
                pnlRdlcEmpty.Visible = true;
            }

            // Set active tab
            if (activeTab == "rdlc")
            {
                tabRpt.CssClass = "section-tab";
                tabRdlc.CssClass = "section-tab active";
                pnlRptTab.Visible = false;
                pnlRdlcTab.Visible = true;
            }
            else
            {
                tabRpt.CssClass = "section-tab active";
                tabRdlc.CssClass = "section-tab";
                pnlRptTab.Visible = true;
                pnlRdlcTab.Visible = false;
            }
        }

        private List<ReportFileInfo> GetReportFiles(string type, string searchPattern)
        {
            string basePath = AppConfig.Instance.AppServerPath;
            if (string.IsNullOrEmpty(basePath))
                basePath = Server.MapPath("~/");

            string folder = Path.Combine(basePath, type);
            var files = new List<ReportFileInfo>();

            if (!Directory.Exists(folder))
                return files;

            foreach (var filePath in Directory.GetFiles(folder, searchPattern))
            {
                var fi = new FileInfo(filePath);
                files.Add(new ReportFileInfo
                {
                    Name = fi.Name,
                    Extension = fi.Extension.TrimStart('.').ToUpper(),
                    Size = fi.Length,
                    SizeDisplay = FormatFileSize(fi.Length),
                    LastModified = fi.LastWriteTime
                });
            }

            return files.OrderBy(f => f.Name).ToList();
        }

        private string FormatFileSize(long bytes)
        {
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1048576) return (bytes / 1024.0).ToString("F1") + " KB";
            return (bytes / 1048576.0).ToString("F1") + " MB";
        }

        #endregion

        #region Upload

        protected void btnUploadRpt_Click(object sender, EventArgs e)
        {
            UploadFile(fuRptUpload, "rpt", ".rpt", pnlRptUploadResult, lblRptUploadResult);
            LoadFileList("rpt");
        }

        protected void btnUploadRdlc_Click(object sender, EventArgs e)
        {
            UploadFile(fuRdlcUpload, "rdlc", ".rdlc", pnlRdlcUploadResult, lblRdlcUploadResult);
            LoadFileList("rdlc");
        }

        private void UploadFile(FileUpload fileUpload, string type, string allowedExt,
            Panel resultPanel, Label resultLabel)
        {
            resultPanel.Visible = true;

            if (!fileUpload.HasFile)
            {
                resultLabel.Text = "Please select a file to upload";
                resultPanel.CssClass = "upload-result upload-error";
                return;
            }

            string fileName = Path.GetFileName(fileUpload.FileName);
            string ext = Path.GetExtension(fileName).ToLower();

            if (ext != allowedExt)
            {
                resultLabel.Text = "Only " + allowedExt + " files are allowed";
                resultPanel.CssClass = "upload-result upload-error";
                return;
            }

            try
            {
                string basePath = AppConfig.Instance.AppServerPath;
                if (string.IsNullOrEmpty(basePath))
                    basePath = Server.MapPath("~/");

                string folder = Path.Combine(basePath, type);
                if (!Directory.Exists(folder))
                    Directory.CreateDirectory(folder);

                string filePath = Path.Combine(folder, fileName);
                fileUpload.SaveAs(filePath);

                resultLabel.Text = "&#x2705; Uploaded successfully: " + fileName;
                resultPanel.CssClass = "upload-result upload-success";
            }
            catch (Exception ex)
            {
                resultLabel.Text = "Upload failed: " + ex.Message;
                resultPanel.CssClass = "upload-result upload-error";
            }
        }

        #endregion

        private void ShowError(string message)
        {
            pnlError.Visible = true;
            lblError.Text = message;
        }
    }

    /// <summary>
    /// Model for report file information display
    /// </summary>
    public class ReportFileInfo
    {
        public string Name { get; set; }
        public string Extension { get; set; }
        public long Size { get; set; }
        public string SizeDisplay { get; set; }
        public DateTime LastModified { get; set; }
    }
}
