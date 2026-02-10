using System.Configuration;

namespace ReportViewer.Config
{
    /// <summary>
    /// Singleton configuration helper for reading app settings
    /// </summary>
    public class AppConfig
    {
        #region Singleton
        private static AppConfig _instance;
        public static AppConfig Instance
        {
            get
            {
                if (_instance == null)
                    _instance = new AppConfig();
                return _instance;
            }
        }
        #endregion

        #region Crystal Report Settings
        public string CrtServer => ConfigurationManager.AppSettings["crtServer"] ?? "localhost";
        public string CrtUser => ConfigurationManager.AppSettings["crtUser"] ?? "sa";
        public string CrtPass => ConfigurationManager.AppSettings["crtPass"] ?? "";
        public string CrtDatabase => ConfigurationManager.AppSettings["crtDatabase"] ?? "";
        public int CrtZoomDefault => int.TryParse(ConfigurationManager.AppSettings["crtZoomDefault"], out int z) ? z : 100;
        public string MapDriveReport => ConfigurationManager.AppSettings["MapDriveReport"] ?? "";
        #endregion

        #region SSRS Settings
        public string SsrsUrl => ConfigurationManager.AppSettings["ssrsUrl"] ?? "";
        public string SsrsUser => ConfigurationManager.AppSettings["ssrsUser"] ?? "";
        public string SsrsPass => ConfigurationManager.AppSettings["ssrsPass"] ?? "";
        public string SsrsDomain => ConfigurationManager.AppSettings["ssrsDomain"] ?? "";
        #endregion

        #region Application Settings
        public string AppTitle => ConfigurationManager.AppSettings["AppTitle"] ?? "BS Report Viewer";
        #endregion

        #region Connection String
        public string ReportDbConnectionString => ConfigurationManager.ConnectionStrings["ReportDB"]?.ConnectionString ?? "";
        #endregion
    }
}
