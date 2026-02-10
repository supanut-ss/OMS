using System;
using System.Web.UI;

namespace ReportViewer
{
    public partial class SiteMaster : MasterPage
    {
        /// <summary>
        /// Set report title displayed in the header
        /// </summary>
        public string ReportTitle
        {
            get { return lblReportTitle.Value; }
            set { lblReportTitle.Value = value; }
        }

        protected void Page_Load(object sender, EventArgs e)
        {
        }
    }
}
