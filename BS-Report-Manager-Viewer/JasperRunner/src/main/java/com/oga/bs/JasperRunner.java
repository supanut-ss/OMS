package com.oga.bs;

import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JsonQLDataSource;
import net.sf.jasperreports.engine.export.JRCsvExporter;
import net.sf.jasperreports.engine.export.ooxml.JRDocxExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.export.SimpleCsvExporterConfiguration;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleHtmlExporterOutput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimpleWriterExporterOutput;
import net.sf.jasperreports.engine.export.HtmlExporter;

public class JasperRunner {
    public static void main(String[] args) throws Exception {
        System.setProperty("java.awt.headless", "true");

        if (args.length < 4) {
            System.err.println("Usage: java -jar jasper-runner.jar <templatePath> <jsonPath> <outputFormat> <outputPath>");
            System.exit(2);
        }

        String templatePath = args[0];
        String jsonPath = args[1];
        String outputFormat = args[2] == null ? "pdf" : args[2].toLowerCase(Locale.ROOT);
        String outputPath = args[3];

        File templateFile = new File(templatePath);
        File jsonFile = new File(jsonPath);
        if (!templateFile.exists()) {
            throw new IllegalArgumentException("Jasper template file not found: " + templatePath);
        }
        if (!jsonFile.exists()) {
            throw new IllegalArgumentException("Jasper JSON data file not found: " + jsonPath);
        }

        JasperReport report;
        if (templatePath.toLowerCase(Locale.ROOT).endsWith(".jrxml")) {
            report = JasperCompileManager.compileReport(templatePath);
        } else {
            Object loaded = net.sf.jasperreports.engine.util.JRLoader.loadObject(templateFile);
            if (!(loaded instanceof JasperReport)) {
                throw new IllegalArgumentException("File is not a Jasper report: " + templatePath);
            }
            report = (JasperReport) loaded;
        }

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("JSON_DATA", Files.readString(jsonFile.toPath(), StandardCharsets.UTF_8));

        try (FileInputStream input = new FileInputStream(jsonFile)) {
            JsonQLDataSource dataSource = new JsonQLDataSource(input);
            JasperPrint print = JasperFillManager.fillReport(report, parameters, dataSource);
            export(print, outputFormat, outputPath);
        }
    }

    private static void export(JasperPrint print, String format, String outputPath) throws Exception {
        switch (format) {
            case "pdf":
                JasperExportManager.exportReportToPdfFile(print, outputPath);
                break;
            case "html":
                HtmlExporter htmlExporter = new HtmlExporter();
                htmlExporter.setExporterInput(new SimpleExporterInput(print));
                htmlExporter.setExporterOutput(new SimpleHtmlExporterOutput(outputPath));
                htmlExporter.exportReport();
                break;
            case "xlsx":
            case "excel":
                JRXlsxExporter xlsxExporter = new JRXlsxExporter();
                xlsxExporter.setExporterInput(new SimpleExporterInput(print));
                xlsxExporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputPath));
                xlsxExporter.exportReport();
                break;
            case "csv":
                JRCsvExporter csvExporter = new JRCsvExporter();
                csvExporter.setExporterInput(new SimpleExporterInput(print));
                csvExporter.setExporterOutput(new SimpleWriterExporterOutput(outputPath));
                csvExporter.setConfiguration(new SimpleCsvExporterConfiguration());
                csvExporter.exportReport();
                break;
            case "docx":
            case "word":
                JRDocxExporter docxExporter = new JRDocxExporter();
                docxExporter.setExporterInput(new SimpleExporterInput(print));
                docxExporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputPath));
                docxExporter.exportReport();
                break;
            default:
                throw new IllegalArgumentException("Unsupported output format: " + format);
        }
    }
}
