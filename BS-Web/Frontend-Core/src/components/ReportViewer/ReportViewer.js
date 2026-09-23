import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { Assessment, Download as DownloadIcon } from "@mui/icons-material";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Config from "../../utils/Config";
import SecureStorage from "../../utils/SecureStorage";
import BSAlertSwal2 from "../BSAlertSwal2";
import BSFilterCustom from "../BSFilterCustom";
import { useResource } from "../../hooks/useResource";
import { getLocaleText } from "./locales";
import {
  getReportPreviewSx,
  getReportViewerRootSx,
} from "./ReportViewerLayout.mjs";
import {
  resolveReportFilterText,
  resolveReportViewerLocale,
} from "./ReportViewerResource.mjs";

export const getReportViewerBaseUrl = () => {
  const configured =
    Config.REPORT_VIEWER_URL || process.env.REACT_APP_REPORT_VIEWER_URL;
  if (configured) return configured.replace(/\/$/, "");

  const apiUrl = Config.API_URL || "";
  if (apiUrl.includes("/gateway/")) {
    return apiUrl.replace(/\/gateway\/.*$/i, "/report-viewer");
  }

  return apiUrl.replace(/\/v\d+\/api\/?$/i, "");
};

const parseOptions = (filter) => {
  if (Array.isArray(filter?.options) && filter.options.length > 0) {
    return filter.options.map((item) => ({
      value: item.value ?? item.Value ?? "",
      label: item.label ?? item.Label ?? item.value ?? item.Value ?? "",
    }));
  }

  if (!filter?.optionJson && !filter?.option_json) return [];
  try {
    const raw = JSON.parse(filter.optionJson || filter.option_json);
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (typeof item === "string") return { value: item, label: item };
      return {
        value: item.value ?? item.id ?? item.code ?? "",
        label: item.label ?? item.name ?? item.text ?? item.value ?? "",
      };
    });
  } catch {
    return [];
  }
};

const normalizeReport = (item) => ({
  reportCode: item.reportCode ?? item.report_code,
  reportName: item.reportName ?? item.report_name,
  reportType: item.reportType ?? item.report_type,
  outputFormat: item.outputFormat ?? item.output_format,
});

const normalizeReportKey = (value) =>
  String(value || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

const findReportByKey = (reportList, reportKey) => {
  const normalizedKey = normalizeReportKey(reportKey);
  if (!normalizedKey) return null;

  return (
    reportList.find((report) => {
      const keys = [
        report.reportCode,
        report.reportName,
        normalizeReportKey(report.reportCode).replace(/-/g, ""),
      ];
      return keys.some((key) => normalizeReportKey(key) === normalizedKey);
    }) || null
  );
};

const normalizeFilter = (item) => ({
  id: item.id,
  reportCode: item.reportCode ?? item.report_code,
  parameterName: item.parameterName ?? item.parameter_name,
  resourceGroup: item.resourceGroup ?? item.resource_group,
  resourceName: item.resourceName ?? item.resource_name,
  label: item.label,
  inputType: (item.inputType ?? item.input_type ?? "text").toLowerCase(),
  dataType: (item.dataType ?? item.data_type ?? "string").toLowerCase(),
  sqlFieldName: item.sqlFieldName ?? item.sql_field_name,
  operator: item.operator ?? "=",
  defaultValue: item.defaultValue ?? item.default_value ?? "",
  placeholder: item.placeholder ?? "",
  optionSourceType: item.optionSourceType ?? item.option_source_type,
  optionJson: item.optionJson ?? item.option_json,
  options: item.options ?? item.Options ?? [],
  isRequired: Boolean(item.isRequired ?? item.is_required),
  sortOrder: item.sortOrder ?? item.sort_order ?? 0,
});

const buildParameters = (filters, values) => {
  const parameters = {};

  filters.forEach((filter) => {
    const key = filter.parameterName;
    if (!key) return;

    const value = values.find((item) => item.field === key)?.value;
    if (value === null || value === undefined || value === "") return;

    parameters[key] = Array.isArray(value) ? value.join(",") : String(value);
  });

  return parameters;
};

const RESERVED_QUERY_PARAMS = new Set(["r", "hideFilters", "autoRun"]);

const getQueryReportParameters = (searchParams) => {
  const parameters = {};
  searchParams.forEach((value, key) => {
    if (RESERVED_QUERY_PARAMS.has(key) || value === "") return;
    parameters[key] = value;
  });
  return parameters;
};

const getQueryValueForFilter = (filter, queryParameters) => {
  const key = filter.parameterName;
  if (!key) return undefined;

  if (queryParameters[key] !== undefined) return queryParameters[key];
  if (
    filter.sqlFieldName &&
    queryParameters[filter.sqlFieldName] !== undefined
  ) {
    return queryParameters[filter.sqlFieldName];
  }

  const prefix = `${key}_`.toLowerCase();
  const matchedEntry = Object.entries(queryParameters).find(([queryKey]) =>
    queryKey.toLowerCase().startsWith(prefix),
  );

  return matchedEntry?.[1];
};

const buildValuesFromQuery = (filters, queryParameters) =>
  filters
    .map((filter) => {
      const key = filter.parameterName;
      const queryValue = getQueryValueForFilter(filter, queryParameters);
      if (!key || queryValue === undefined) return null;
      return {
        field: key,
        operator: mapDefaultOperator(filter.operator),
        value: queryValue,
      };
    })
    .filter(Boolean);

const getUnmappedQueryParameters = (filters, queryParameters) => {
  const mappedQueryKeys = new Set(
    filters.flatMap((filter) => {
      const keys = [filter.parameterName, filter.sqlFieldName].filter(Boolean);
      const matchedEntry = Object.keys(queryParameters).find(
        (queryKey) =>
          filter.parameterName &&
          queryKey
            .toLowerCase()
            .startsWith(`${filter.parameterName}_`.toLowerCase()),
      );
      return matchedEntry ? [...keys, matchedEntry] : keys;
    }),
  );

  return Object.fromEntries(
    Object.entries(queryParameters).filter(
      ([key]) => !mappedQueryKeys.has(key),
    ),
  );
};

const mapDefaultOperator = (operator) => {
  switch ((operator || "=").toUpperCase()) {
    case "LIKE":
      return "contains";
    case ">":
      return "greaterThan";
    case ">=":
      return "greaterThanOrEqual";
    case "<":
      return "lessThan";
    case "<=":
      return "lessThanOrEqual";
    default:
      return "equals";
  }
};

const mapFilterField = (filter, lang, getResourceByGroupAndName) => {
  const options = parseOptions(filter);
  const localizedText = resolveReportFilterText(
    filter,
    lang,
    getResourceByGroupAndName,
  );
  const common = {
    field: filter.parameterName,
    bsTitle: localizedText.label || filter.parameterName,
    placeholder: localizedText.placeholder,
    required: filter.isRequired,
    type: filter.dataType === "number" ? "number" : filter.dataType,
    defaultOperator: mapDefaultOperator(filter.operator),
    xs: 12,
    sm: 6,
    md: 4,
    lg: 3,
  };

  if (filter.inputType === "date") {
    return {
      ...common,
      component: "BSDatepicker",
      type: "date",
      defaultOperator: "is",
      isDateOnly: true,
      format: "DD/MM/YYYY",
    };
  }

  if (
    (filter.inputType === "select" || filter.inputType === "multi-select") &&
    options.length > 0
  ) {
    return {
      ...common,
      component: "BSAutoComplete",
      bsMode: filter.inputType === "multi-select" ? "multi" : "single",
      bsData: options.map((item) => ({
        code: item.value,
        value: item.label,
      })),
    };
  }

  return {
    ...common,
    component: "BSTextField",
    type: filter.dataType === "number" ? "number" : "string",
  };
};

const getErrorMessage = async (error, fallback) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    const text = await data.text();
    try {
      const json = JSON.parse(text);
      return json.message || json.detail || fallback;
    } catch {
      return text || fallback;
    }
  }

  return data?.message || data?.detail || error?.message || fallback;
};

const isNoReportDataMessage = (message) =>
  String(message || "")
    .toLowerCase()
    .includes("no report data found");

const ReportViewer = ({
  lang: langProp,
  reportCode,
  reportParameters,
  hideFilters: hideFiltersProp,
  embedded = false,
  showDownloadJson = true,
}) => {
  const theme = useTheme();
  const { getResourceByGroupAndName } = useResource();
  const { reportKey: pathReportKey } = useParams();
  const [searchParams] = useSearchParams();
  const reportViewerBaseUrl = useMemo(getReportViewerBaseUrl, []);
  const requestedReportKey =
    reportCode || searchParams.get("r") || pathReportKey || "";
  const hideFilters =
    hideFiltersProp !== undefined
      ? Boolean(hideFiltersProp)
      : searchParams.get("hideFilters") === "true";
  const queryReportParameters = useMemo(
    () =>
      reportParameters
        ? Object.fromEntries(
            Object.entries(reportParameters).filter(
              ([, value]) =>
                value !== null && value !== undefined && value !== "",
            ),
          )
        : getQueryReportParameters(searchParams),
    [reportParameters, searchParams],
  );
  const queryParameterKey = useMemo(
    () => JSON.stringify(queryReportParameters),
    [queryReportParameters],
  );
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState([]);
  const [values, setValues] = useState([]);
  const [viewerUrl, setViewerUrl] = useState("");
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadedFilterReportCode, setLoadedFilterReportCode] = useState("");
  const [rendering, setRendering] = useState(false);
  const [autoRenderKey, setAutoRenderKey] = useState("");
  const [lang, setLang] = useState(
    langProp || SecureStorage.get("lang") || "en",
  );

  useEffect(() => {
    if (langProp) {
      setLang(langProp);
      return;
    }
    const handleLangChange = (e) => setLang(e.detail.lang);
    window.addEventListener("bsLangChange", handleLangChange);
    return () => window.removeEventListener("bsLangChange", handleLangChange);
  }, [langProp]);

  const [isAltPressed, setIsAltPressed] = useState(false);
  const altTimeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Alt") {
        if (altTimeoutRef.current) {
          clearTimeout(altTimeoutRef.current);
          altTimeoutRef.current = null;
        }
        setIsAltPressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === "Alt") {
        if (altTimeoutRef.current) {
          clearTimeout(altTimeoutRef.current);
        }
        altTimeoutRef.current = setTimeout(() => {
          setIsAltPressed(false);
          altTimeoutRef.current = null;
        }, 3000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (altTimeoutRef.current) {
        clearTimeout(altTimeoutRef.current);
      }
    };
  }, []);

  const t = useMemo(
    () =>
      resolveReportViewerLocale(
        getLocaleText(lang),
        lang,
        getResourceByGroupAndName,
      ),
    [getResourceByGroupAndName, lang],
  );

  const reportApi = useMemo(() => {
    const instance = axios.create({ baseURL: reportViewerBaseUrl });
    instance.interceptors.request.use((config) => {
      const token =
        SecureStorage.get("token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    });
    return instance;
  }, [reportViewerBaseUrl]);

  const loadReports = useCallback(async () => {
    try {
      const response = await reportApi.get("/api/reports");
      setReports((response.data || []).map(normalizeReport));
    } catch (error) {
      await BSAlertSwal2.show("error", t.loadReportListFailed);
    }
  }, [reportApi, t]);

  const loadFilters = useCallback(
    async (reportCode) => {
      if (!reportCode) return;
      setLoadingFilters(true);
      setLoadedFilterReportCode("");
      setFilters([]);
      setValues([]);
      setViewerUrl("");

      try {
        const response = await reportApi.get(
          `/api/reports/${encodeURIComponent(reportCode)}/filters`,
        );
        const nextFilters = (response.data || []).map(normalizeFilter);
        setFilters(nextFilters);
        setValues([]);
        setLoadedFilterReportCode(reportCode);
      } catch (error) {
        await BSAlertSwal2.show("error", t.loadReportFiltersFailed);
      } finally {
        setLoadingFilters(false);
      }
    },
    [reportApi, t],
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!requestedReportKey || reports.length === 0) return;

    const matchedReport = findReportByKey(reports, requestedReportKey);
    if (
      matchedReport &&
      matchedReport.reportCode !== selectedReport?.reportCode
    ) {
      setSelectedReport(matchedReport);
    }
  }, [requestedReportKey, reports, selectedReport?.reportCode]);

  useEffect(() => {
    if (selectedReport?.reportCode) {
      loadFilters(selectedReport.reportCode);
    }
  }, [selectedReport, loadFilters]);

  const filterFields = useMemo(
    () =>
      filters.map((filter) =>
        mapFilterField(filter, lang, getResourceByGroupAndName),
      ),
    [filters, getResourceByGroupAndName, lang],
  );

  const validateFilters = useCallback(
    (currentValues = values) => {
      const missing = filters.filter(
        (filter) =>
          filter.isRequired &&
          (() => {
            const value = currentValues.find(
              (item) => item.field === filter.parameterName,
            )?.value;
            return (
              value === undefined ||
              value === null ||
              value === "" ||
              (Array.isArray(value) && value.length === 0)
            );
          })(),
      );
      return missing;
    },
    [filters, values],
  );

  const handleView = useCallback(
    async (currentValues = values) => {
      if (!selectedReport?.reportCode || rendering) return;

      const missing = validateFilters(currentValues);
      if (missing.length > 0) {
        await BSAlertSwal2.show(
          "warning",
          `${t.required}: ${missing.map((item) => item.label).join(", ")}`,
        );
        return;
      }

      setRendering(true);
      try {
        const payload = {
          report_code: selectedReport.reportCode,
          output_format: selectedReport.outputFormat || "pdf",
          parameters: {
            ...getUnmappedQueryParameters(filters, queryReportParameters),
            ...buildParameters(filters, currentValues),
          },
        };

        const response = await reportApi.post("/api/reports/export", payload, {
          responseType: "blob",
        });

        if (viewerUrl) URL.revokeObjectURL(viewerUrl);
        setViewerUrl(URL.createObjectURL(response.data));
      } catch (error) {
        const errorMessage = await getErrorMessage(error, t.renderFailed);
        if (isNoReportDataMessage(errorMessage)) {
          if (viewerUrl) URL.revokeObjectURL(viewerUrl);
          setViewerUrl("");
          await BSAlertSwal2.show("info", t.noReportDataFound);
          return;
        }

        await BSAlertSwal2.show("error", errorMessage);
      } finally {
        setRendering(false);
      }
    },
    [
      selectedReport,
      rendering,
      validateFilters,
      filters,
      reportApi,
      viewerUrl,
      values,
      queryReportParameters,
      t,
    ],
  );

  useEffect(() => {
    if (!selectedReport?.reportCode || loadingFilters || rendering) return;
    if (loadedFilterReportCode !== selectedReport.reportCode) return;
    if (Object.keys(queryReportParameters).length === 0) return;

    const nextValues = buildValuesFromQuery(filters, queryReportParameters);
    const nextAutoRenderKey = `${selectedReport.reportCode}|${queryParameterKey}`;
    if (autoRenderKey === nextAutoRenderKey) return;

    setValues(nextValues);
    setAutoRenderKey(nextAutoRenderKey);
    handleView(nextValues);
  }, [
    selectedReport?.reportCode,
    loadingFilters,
    loadedFilterReportCode,
    rendering,
    filters,
    queryReportParameters,
    queryParameterKey,
    autoRenderKey,
    handleView,
  ]);

  const handleFilterChange = useCallback(
    (nextValues) => {
      const activeValues = Array.isArray(nextValues) ? nextValues : [];
      setValues(activeValues);

      if (activeValues.length === 0) {
        if (viewerUrl) URL.revokeObjectURL(viewerUrl);
        setViewerUrl("");
      } else {
        handleView(activeValues);
      }
    },
    [viewerUrl, handleView],
  );

  const handleDownloadJson = useCallback(async () => {
    if (!selectedReport) return;

    const isConfirmed = await BSAlertSwal2.confirm(
      t.downloadJsonConfirm || "Do you want to download the JSON data?",
      {
        confirmButtonText: t.downloadJsonButton || "Download JSON",
        cancelButtonText: lang === "th" ? "ยกเลิก" : "Cancel",
      },
    );

    if (!isConfirmed) return;

    try {
      const payload = {
        report_code: selectedReport.reportCode,
        output_format: selectedReport.outputFormat || "pdf",
        parameters: {
          ...getUnmappedQueryParameters(filters, queryReportParameters),
          ...buildParameters(filters, values),
        },
      };

      const response = await reportApi.post("/api/reports/data", payload);
      const reportData = response.data;

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(reportData, null, 2),
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `${selectedReport.reportCode}_data.json`,
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      await BSAlertSwal2.show(
        "success",
        t.downloadJsonSuccess || "JSON data downloaded successfully",
      );
    } catch (error) {
      const errorMessage = await getErrorMessage(error, t.downloadJsonFailed);
      await BSAlertSwal2.show(
        isNoReportDataMessage(errorMessage) ? "info" : "error",
        isNoReportDataMessage(errorMessage)
          ? t.noReportDataFound
          : t.downloadJsonFailed,
      );
    }
  }, [selectedReport, filters, values, queryReportParameters, reportApi, t, lang]);

  useEffect(
    () => () => {
      if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    },
    [viewerUrl],
  );

  return (
    <Box
      sx={getReportViewerRootSx(embedded)}
    >
      {showDownloadJson && isAltPressed && !embedded && selectedReport && (
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}
        >
          <Button
            variant="outlined"
            size="small"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadJson}
          >
            {t.downloadJsonButton || "Download JSON"}
          </Button>
        </Box>
      )}
      {selectedReport && !hideFilters ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {loadingFilters ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ p: 1.5 }}
            >
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {t.loadingFilters}
              </Typography>
            </Stack>
          ) : filters.length > 0 ? (
            <Box sx={{ p: 1.5 }}>
              <BSFilterCustom
                bsFilterField={filterFields}
                bsFilterValue={values}
                bsFilterValueOnChanage={handleFilterChange}
                bsGridSize={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                bsSearch
                bsLoading={rendering}
                bsClear
                bsLang={lang}
                spacing={1}
              />
            </Box>
          ) : (
            <Alert severity="info" sx={{ m: 1.5 }}>
              {t.noFiltersConfigured}
            </Alert>
          )}
        </Paper>
      ) : null}

      <Box
        sx={{
          ...getReportPreviewSx(embedded),
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
        }}
      >
        {viewerUrl ? (
          <iframe
            title={t.reportViewerTitle}
            src={viewerUrl}
            style={{
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ height: "100%" }}
            spacing={1}
          >
            {rendering ? (
              <>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary">
                  {t.rendering}
                </Typography>
              </>
            ) : !hideFilters ? (
              <>
                <Assessment sx={{ color: "text.disabled", fontSize: 48 }} />
                <Typography variant="body2" color="text.secondary">
                  {t.configureFilters}
                </Typography>
              </>
            ) : null}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default ReportViewer;
