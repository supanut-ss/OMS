using Microsoft.AspNetCore.Http.Features;
using ReportViewer.Models;
using ReportViewer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 50 * 1024 * 1024;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddSingleton<ReportConfigService>();
builder.Services.AddSingleton<ReportDataService>();
builder.Services.AddSingleton<JasperReportEngine>();
builder.Services.AddSingleton<ReportFileService>();

var app = builder.Build();

app.UseCors();

app.MapGet("/", () => Results.Content(ReportManagerPage.Html, "text/html"));

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/reports", (ReportConfigService configService) =>
    Results.Ok(configService.GetActiveReports()));

app.MapGet("/api/reports/config/{reportCode}", (string reportCode, ReportConfigService configService) =>
{
    var config = configService.GetConfig(reportCode);
    return Results.Ok(new
    {
        report_code = config.ReportCode,
        report_name = config.ReportName,
        report_type = config.ReportType,
        run_as = config.RunAs,
        is_print_by_server = config.IsPrintByServer,
        json_parameter = config.JsonParameter,
        ssrs_server_url = config.SsrsServerUrl,
        ssrs_report_path = config.SsrsReportPath,
        report_path = config.ReportPath,
        jasper_output_format = config.JasperOutputFormat,
        jasper_sample_json_path = config.JasperSampleJsonPath
    });
});

app.MapGet("/api/reports/{reportCode}/filters", (string reportCode, ReportConfigService configService) =>
    Results.Ok(configService.GetFilters(reportCode)));

app.MapPost("/api/reports/export", (
    ReportExportRequest request,
    ReportConfigService configService,
    JasperReportEngine jasperEngine) =>
{
    return ExportReport(request.ReportCode, request.Parameters, request.OutputFormat, configService, jasperEngine);
});

app.MapPost("/api/reports/data", (
    ReportExportRequest request,
    ReportConfigService configService,
    JasperReportEngine jasperEngine) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(request.ReportCode))
            return Results.BadRequest(new { error = true, message = "report_code is required" });

        var config = configService.GetConfig(request.ReportCode);
        var reportParameters = configService.BuildReportParameters(request.ReportCode, request.Parameters);
        var jsonString = jasperEngine.GetReportDataJson(config, reportParameters);
        return Results.Content(jsonString, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message, statusCode: StatusCodes.Status500InternalServerError);
    }
});

app.MapGet("/ReportExport.ashx", (
    HttpRequest httpRequest,
    ReportConfigService configService,
    JasperReportEngine jasperEngine) =>
{
    var reportCode = httpRequest.Query["report_code"].ToString();
    var outputFormat = httpRequest.Query["output_format"].ToString();
    var parameters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    foreach (var item in httpRequest.Query)
    {
        if (item.Key.Equals("report_code", StringComparison.OrdinalIgnoreCase) ||
            item.Key.Equals("output_format", StringComparison.OrdinalIgnoreCase) ||
            item.Key.Equals("action", StringComparison.OrdinalIgnoreCase))
            continue;

        parameters[item.Key] = item.Value.ToString();
    }

    if (httpRequest.Query["action"].ToString().Equals("config", StringComparison.OrdinalIgnoreCase))
    {
        var config = configService.GetConfig(reportCode);
        return Results.Ok(new
        {
            report_code = config.ReportCode,
            report_name = config.ReportName,
            report_type = config.ReportType,
            run_as = config.RunAs,
            is_print_by_server = config.IsPrintByServer,
            json_parameter = config.JsonParameter,
            ssrs_server_url = config.SsrsServerUrl,
            ssrs_report_path = config.SsrsReportPath,
            report_path = config.ReportPath,
            jasper_output_format = config.JasperOutputFormat,
            jasper_sample_json_path = config.JasperSampleJsonPath
        });
    }

    return ExportReport(reportCode, parameters, outputFormat, configService, jasperEngine);
});

app.MapPost("/ReportExport.ashx", (
    ReportExportRequest request,
    ReportConfigService configService,
    JasperReportEngine jasperEngine) =>
{
    return ExportReport(request.ReportCode, request.Parameters, request.OutputFormat, configService, jasperEngine);
});

app.MapGet("/api/report-files/{type}", (string type, ReportFileService fileService) =>
    Results.Ok(fileService.ListFiles(type)));

app.MapGet("/api/report-packages", (ReportFileService fileService) =>
    Results.Ok(fileService.ListJasperPackages()));

app.MapPost("/api/report-files/{type}", async (string type, IFormFile file, ReportFileService fileService) =>
{
    var saved = await fileService.SaveFileAsync(type, file);
    return Results.Ok(new { file_name = saved });
}).DisableAntiforgery();

app.MapGet("/api/report-files/{type}/{fileName}", (string type, string fileName, ReportFileService fileService) =>
{
    var file = fileService.GetFile(type, fileName);
    return Results.File(file.Stream, file.ContentType, file.FileName);
});

app.MapDelete("/api/report-files/{type}/{fileName}", (string type, string fileName, ReportFileService fileService) =>
{
    var deleted = fileService.DeleteFile(type, fileName);
    return deleted
        ? Results.Ok(new { deleted = true, file_name = fileName })
        : Results.NotFound(new { deleted = false, file_name = fileName });
});

app.Run();

static IResult ExportReport(
    string? reportCode,
    Dictionary<string, string>? parameters,
    string? outputFormat,
    ReportConfigService configService,
    JasperReportEngine jasperEngine)
{
    try
    {
        if (string.IsNullOrWhiteSpace(reportCode))
            return Results.BadRequest(new { error = true, message = "report_code is required" });

        var config = configService.GetConfig(reportCode);
        var reportType = config.ReportType?.Trim().ToUpperInvariant();
        if (reportType != "JASPER")
        {
            return Results.BadRequest(new
            {
                error = true,
                message = $"Report type '{config.ReportType}' is not supported on .NET Core Docker. Use JASPER, or run RDLC/Crystal/SSRS viewer on Windows .NET Framework."
            });
        }

        var format = string.IsNullOrWhiteSpace(outputFormat)
            ? config.JasperOutputFormat ?? "pdf"
            : outputFormat;

        var reportParameters = configService.BuildReportParameters(reportCode, parameters);
        var bytes = jasperEngine.ExportToFormat(config, reportParameters, format);
        JasperReportEngine.GetContentTypeAndExtension(format, out var contentType, out var extension);
        var fileName = $"{config.ReportName ?? config.ReportCode}.{extension}";
        return Results.File(bytes, contentType, fileName);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = true, message = ex.Message });
    }
    catch (FileNotFoundException ex)
    {
        return Results.BadRequest(new { error = true, message = ex.Message });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message, statusCode: StatusCodes.Status500InternalServerError);
    }
}
