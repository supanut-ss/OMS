using System.Diagnostics;
using ReportViewer.Models;

namespace ReportViewer.Services
{
    public class JasperReportEngine
    {
        private readonly ReportDataService _reportDataService;
        private readonly string _appServerPath;
        private readonly string _runnerJarPath;

        public JasperReportEngine(
            ReportDataService reportDataService,
            IConfiguration configuration,
            IWebHostEnvironment environment)
        {
            _reportDataService = reportDataService;
            _appServerPath = configuration["ReportViewer:AppServerPath"]
                ?? Path.Combine(environment.ContentRootPath, "Reports");
            _runnerJarPath = ResolveRunnerJarPath(configuration, environment);
        }

        private static string ResolveRunnerJarPath(IConfiguration configuration, IWebHostEnvironment environment)
        {
            var configuredPath = configuration["ReportViewer:JasperRunnerJarPath"];
            var candidatePaths = new List<string>();

            if (!string.IsNullOrWhiteSpace(configuredPath))
            {
                var resolvedConfiguredPath = Path.IsPathRooted(configuredPath)
                    ? configuredPath
                    : Path.GetFullPath(Path.Combine(environment.ContentRootPath, configuredPath));
                candidatePaths.Add(resolvedConfiguredPath);
            }

            var runnerTargetPath = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "..", "JasperRunner", "target"));
            if (Directory.Exists(runnerTargetPath))
            {
                var fatJars = Directory.EnumerateFiles(runnerTargetPath, "*-jar-with-dependencies.jar")
                    .OrderByDescending(File.GetLastWriteTimeUtc);
                candidatePaths.AddRange(fatJars);
            }

            candidatePaths.Add(Path.Combine(environment.ContentRootPath, "jasper-runner", "jasper-runner.jar"));

            var existingPath = candidatePaths.FirstOrDefault(File.Exists);
            return !string.IsNullOrWhiteSpace(existingPath)
                ? existingPath
                : candidatePaths.Last();
        }

        public string GetReportDataJson(ReportConfig config, Dictionary<string, string> parameters)
        {
            return !string.IsNullOrWhiteSpace(config.SqlCommand)
                ? _reportDataService.ExecuteSqlToJson(config, parameters)
                : ResolveJsonParameter(config, parameters);
        }

        public byte[] ExportToFormat(ReportConfig config, Dictionary<string, string> parameters, string? format)
        {
            var outputFormat = !string.IsNullOrWhiteSpace(format)
                ? NormalizeOutputFormat(format)
                : !string.IsNullOrWhiteSpace(config.JasperOutputFormat) ? NormalizeOutputFormat(config.JasperOutputFormat) : "pdf";

            var templatePath = ResolveTemplatePath(config);
            var json = GetReportDataJson(config, parameters);

            return RunLocalJasper(templatePath, json, outputFormat);
        }

        public static void GetContentTypeAndExtension(string? format, out string contentType, out string fileExtension)
        {
            switch (NormalizeOutputFormat(format ?? "pdf"))
            {
                case "xlsx":
                    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    fileExtension = "xlsx";
                    break;
                case "csv":
                    contentType = "text/csv";
                    fileExtension = "csv";
                    break;
                case "html":
                    contentType = "text/html";
                    fileExtension = "html";
                    break;
                case "docx":
                    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    fileExtension = "docx";
                    break;
                default:
                    contentType = "application/pdf";
                    fileExtension = "pdf";
                    break;
            }
        }

        private string ResolveTemplatePath(ReportConfig config)
        {
            var configuredPath = !IsEmptyConfigValue(config.ReportPath)
                ? config.ReportPath
                : null;

            if (string.IsNullOrWhiteSpace(configuredPath))
                return ResolveTemplatePathFromPackage(config.ReportCode);

            var path = configuredPath.Replace("@app_server_path", _appServerPath);
            if (!Path.IsPathRooted(path))
                path = Path.Combine(_appServerPath, "jasper", path);

            if (!File.Exists(path))
                throw new FileNotFoundException("Jasper template file not found: " + path);

            var extension = Path.GetExtension(path);
            if (!extension.Equals(".jasper", StringComparison.OrdinalIgnoreCase) &&
                !extension.Equals(".jrxml", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("report_path must point to a .jasper or .jrxml file: " + path);

            return path;
        }

        private string ResolveTemplatePathFromPackage(string? reportCode)
        {
            if (string.IsNullOrWhiteSpace(reportCode))
                throw new InvalidOperationException("report_path is required for local Jasper report.");

            var folder = Path.Combine(_appServerPath, "jasper");
            var candidates = new[]
            {
                Path.Combine(folder, reportCode + ".jasper"),
                Path.Combine(folder, reportCode + ".jrxml")
            };

            var path = candidates.FirstOrDefault(File.Exists);
            if (!string.IsNullOrWhiteSpace(path))
                return path;

            throw new FileNotFoundException(
                "report_path is not configured and no Jasper template file was found for report: " +
                reportCode +
                ". Expected one of: " +
                string.Join(", ", candidates.Select(Path.GetFileName)));
        }

        private static bool IsEmptyConfigValue(string? value)
        {
            return string.IsNullOrWhiteSpace(value) || value.Trim() == "-";
        }

        private string ResolveJsonParameter(ReportConfig config, Dictionary<string, string> parameters)
        {
            if (parameters.TryGetValue("JSON_DATA", out var jsonData) && !string.IsNullOrWhiteSpace(jsonData))
                return jsonData;

            if (!string.IsNullOrWhiteSpace(config.JsonParameter))
                return config.JsonParameter;

            if (!string.IsNullOrWhiteSpace(config.JasperSampleJson))
                return config.JasperSampleJson;

            if (!string.IsNullOrWhiteSpace(config.JasperSampleJsonPath))
            {
                var path = config.JasperSampleJsonPath.Replace("@app_server_path", _appServerPath);
                if (!Path.IsPathRooted(path))
                    path = Path.Combine(_appServerPath, "jasper", path);
                if (!File.Exists(path))
                    throw new FileNotFoundException("Jasper JSON data file not found: " + path);

                return File.ReadAllText(path);
            }

            throw new InvalidOperationException("No SQL command or JSON data is configured for report: " + config.ReportCode);
        }

        private byte[] RunLocalJasper(string templatePath, string json, string outputFormat)
        {
            if (!File.Exists(_runnerJarPath))
                throw new FileNotFoundException("Jasper local runner not found: " + _runnerJarPath);

            var workDir = Path.Combine(Path.GetTempPath(), "bs-report-viewer", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(workDir);

            try
            {
                var jsonPath = Path.Combine(workDir, "data.json");
                var outputPath = Path.Combine(workDir, "report." + GetExtension(outputFormat));
                File.WriteAllText(jsonPath, json);

                var startInfo = new ProcessStartInfo
                {
                    FileName = "java",
                    RedirectStandardError = true,
                    RedirectStandardOutput = true,
                    UseShellExecute = false
                };
                startInfo.ArgumentList.Add("-Djava.awt.headless=true");
                startInfo.ArgumentList.Add("-jar");
                startInfo.ArgumentList.Add(_runnerJarPath);
                startInfo.ArgumentList.Add(templatePath);
                startInfo.ArgumentList.Add(jsonPath);
                startInfo.ArgumentList.Add(outputFormat);
                startInfo.ArgumentList.Add(outputPath);

                using var process = Process.Start(startInfo)
                    ?? throw new InvalidOperationException("Cannot start Jasper Java runner.");
                if (!process.WaitForExit(180_000))
                {
                    process.Kill(entireProcessTree: true);
                    throw new TimeoutException("Jasper local render timed out after 180 seconds.");
                }

                var stdout = process.StandardOutput.ReadToEnd();
                var stderr = process.StandardError.ReadToEnd();
                if (process.ExitCode != 0)
                {
                    var extraHint = string.Empty;
                    if (stderr.Contains("net/sourceforge/barbecue/", StringComparison.OrdinalIgnoreCase) ||
                        stderr.Contains("org/krysalis/barcode4j/", StringComparison.OrdinalIgnoreCase))
                    {
                        extraHint =
                            " Ensure JasperRunner uses a fat jar (for example '*-jar-with-dependencies.jar') so barcode dependencies are on the classpath.";
                    }

                    throw new InvalidOperationException($"Jasper local render failed. {stderr} {stdout}{extraHint}".Trim());
                }

                if (!File.Exists(outputPath))
                    throw new FileNotFoundException("Jasper output file was not created: " + outputPath);

                return File.ReadAllBytes(outputPath);
            }
            finally
            {
                try
                {
                    Directory.Delete(workDir, recursive: true);
                }
                catch
                {
                    // Ignore temp cleanup errors.
                }
            }
        }

        private static string NormalizeOutputFormat(string format)
        {
            var value = (format ?? "pdf").ToLowerInvariant();
            return value switch
            {
                "excel" => "xlsx",
                "word" => "docx",
                _ => value
            };
        }

        private static string GetExtension(string format)
        {
            return NormalizeOutputFormat(format) switch
            {
                "xlsx" => "xlsx",
                "csv" => "csv",
                "html" => "html",
                "docx" => "docx",
                _ => "pdf"
            };
        }
    }
}
