using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BS_Notify_Worker.Logging
{
    public static class FileLogger
    {
        private static readonly object _lock = new object();

        public static void WriteLog(string message)
        {
            try
            {
                string basePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Logs");
                string year = DateTime.Now.ToString("yyyy");
                string month = DateTime.Now.ToString("MM");
                string day = DateTime.Now.ToString("dd");

                string folderPath = Path.Combine(basePath, year, month);
                Directory.CreateDirectory(folderPath);

                string logFile = Path.Combine(folderPath, $"{day}.log");

                string logMessage = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}";

                lock (_lock)
                {
                    File.AppendAllText(logFile, logMessage + Environment.NewLine);
                }
            }
            catch
            {
                // กัน service ล้มเพราะ log fail
            }
        }
    }
}
