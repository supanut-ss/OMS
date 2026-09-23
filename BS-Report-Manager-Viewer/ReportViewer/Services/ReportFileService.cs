using Microsoft.AspNetCore.Http;

namespace ReportViewer.Services
{
    public class ReportFileService
    {
        private static readonly Dictionary<string, string[]> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["jasper"] = new[] { ".jasper", ".jrxml", ".json" },
            ["json"] = new[] { ".json" },
            ["rpt"] = new[] { ".rpt" },
            ["rdlc"] = new[] { ".rdlc" }
        };

        private readonly string _basePath;

        public ReportFileService(IConfiguration configuration, IWebHostEnvironment environment)
        {
            var configuredPath = configuration["ReportViewer:AppServerPath"];
            _basePath = string.IsNullOrWhiteSpace(configuredPath)
                ? Path.Combine(environment.ContentRootPath, "Reports")
                : configuredPath;
        }

        public IEnumerable<object> ListFiles(string type)
        {
            var folder = GetFolder(type);
            if (!Directory.Exists(folder))
                return Enumerable.Empty<object>();

            return Directory.GetFiles(folder)
                .Select(ToManagedFile)
                .OrderBy(file => file.file_name)
                .ToList();
        }

        public IEnumerable<object> ListJasperPackages()
        {
            var folder = GetFolder("jasper");
            if (!Directory.Exists(folder))
                return Enumerable.Empty<object>();

            return Directory.GetFiles(folder)
                .Select(ToManagedFile)
                .GroupBy(file => Path.GetFileNameWithoutExtension(file.file_name), StringComparer.OrdinalIgnoreCase)
                .Select(group =>
                {
                    var files = group
                        .OrderBy(file => GetTypeOrder(file.extension))
                        .ThenBy(file => file.file_name)
                        .ToList();

                    return new
                    {
                        package_name = group.Key,
                        file_count = files.Count,
                        last_modified = files.Max(file => file.last_modified),
                        total_size = files.Sum(file => file.size),
                        total_size_text = FormatSize(files.Sum(file => file.size)),
                        files
                    };
                })
                .OrderBy(package => package.package_name)
                .ToList();
        }

        public async Task<string> SaveFileAsync(string type, IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("No file uploaded");

            var fileName = Path.GetFileName(file.FileName);
            var extension = Path.GetExtension(fileName);
            if (!AllowedExtensions.TryGetValue(type, out var allowed) ||
                !allowed.Contains(extension, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"File type '{extension}' is not allowed for '{type}'");

            var folder = GetFolder(type);
            Directory.CreateDirectory(folder);

            var path = Path.Combine(folder, fileName);
            await using var stream = File.Create(path);
            await file.CopyToAsync(stream);
            return fileName;
        }

        public bool DeleteFile(string type, string fileName)
        {
            fileName = Path.GetFileName(fileName);
            var path = Path.Combine(GetFolder(type), fileName);
            if (!File.Exists(path))
                return false;

            File.Delete(path);
            return true;
        }

        public ReportFileResult GetFile(string type, string fileName)
        {
            fileName = Path.GetFileName(fileName);
            var path = Path.Combine(GetFolder(type), fileName);
            if (!File.Exists(path))
                throw new FileNotFoundException("File not found: " + fileName);

            return new ReportFileResult
            {
                Stream = File.OpenRead(path),
                FileName = fileName,
                ContentType = GetContentType(Path.GetExtension(fileName))
            };
        }

        private string GetFolder(string type)
        {
            var folderName = type.Equals("json", StringComparison.OrdinalIgnoreCase)
                ? "jasper"
                : type.ToLowerInvariant();

            return Path.Combine(_basePath, folderName);
        }

        private static ManagedReportFile ToManagedFile(string path)
        {
            var file = new FileInfo(path);
            var extension = file.Extension.TrimStart('.').ToUpperInvariant();
            return new ManagedReportFile
            {
                file_name = file.Name,
                package_name = Path.GetFileNameWithoutExtension(file.Name),
                extension = extension,
                type = extension,
                description = GetDescription(extension),
                size = file.Length,
                size_text = FormatSize(file.Length),
                last_modified = file.LastWriteTime
            };
        }

        private static string GetDescription(string extension)
        {
            return extension.ToUpperInvariant() switch
            {
                "JASPER" => "Compiled Jasper file",
                "JRXML" => "Jasper XML template",
                "JSON" => "Sample mapping",
                _ => "Report file"
            };
        }

        private static string GetContentType(string extension)
        {
            return extension.ToLowerInvariant() switch
            {
                ".json" => "application/json",
                ".jrxml" => "application/xml",
                ".jasper" => "application/octet-stream",
                _ => "application/octet-stream"
            };
        }

        private static int GetTypeOrder(string extension)
        {
            return extension.ToUpperInvariant() switch
            {
                "JASPER" => 1,
                "JRXML" => 2,
                "JSON" => 3,
                _ => 99
            };
        }

        private static string FormatSize(long bytes)
        {
            if (bytes >= 1024 * 1024)
                return $"{bytes / 1024d / 1024d:0.#} MB";
            if (bytes >= 1024)
                return $"{bytes / 1024d:0.#} KB";
            return $"{bytes} B";
        }
    }

    public class ManagedReportFile
    {
        public string file_name { get; set; } = string.Empty;
        public string package_name { get; set; } = string.Empty;
        public string extension { get; set; } = string.Empty;
        public string type { get; set; } = string.Empty;
        public string description { get; set; } = string.Empty;
        public long size { get; set; }
        public string size_text { get; set; } = string.Empty;
        public DateTime last_modified { get; set; }
    }

    public class ReportFileResult
    {
        public Stream Stream { get; set; } = Stream.Null;
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/octet-stream";
    }
}
