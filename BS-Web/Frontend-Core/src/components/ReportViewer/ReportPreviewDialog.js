import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import ReportViewer, { getReportViewerBaseUrl } from "./ReportViewer";
import BSAlertSwal2 from "../BSAlertSwal2";
import BSDialog from "../BSDialog";
import SecureStorage from "../../utils/SecureStorage";
import { useResource } from "../../hooks/useResource";
import { getLocaleText } from "./locales";
import { resolveReportViewerLocale } from "./ReportViewerResource.mjs";

const isNoReportDataMessage = (message) =>
  String(message || "")
    .toLowerCase()
    .includes("no report data found");

const getErrorMessage = async (error, fallback) => {
  const data = error?.response?.data;
  return data?.message || data?.detail || error?.message || fallback;
};

const ReportPreviewDialog = ({
  open,
  onClose,
  title = "Report Preview",
  reportCode,
  parameters,
  lang,
  showDownloadJson = true,
}) => {
  const { getResourceByGroupAndName } = useResource();
  const t = React.useMemo(
    () =>
      resolveReportViewerLocale(
        getLocaleText(lang),
        lang,
        getResourceByGroupAndName,
      ),
    [getResourceByGroupAndName, lang],
  );
  const [isAltPressed, setIsAltPressed] = React.useState(false);
  const altTimeoutRef = React.useRef(null);

  React.useEffect(() => {
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

  const handleDownloadJson = React.useCallback(async () => {
    const isConfirmed = await BSAlertSwal2.confirm(
      t.downloadJsonConfirm || "Do you want to download the JSON data?",
      {
        confirmButtonText: t.downloadJsonButton || "Download JSON",
        cancelButtonText: lang === "th" ? "ยกเลิก" : "Cancel",
      },
    );

    if (!isConfirmed) return;

    try {
      const baseUrl = getReportViewerBaseUrl();
      const token =
        SecureStorage.get("token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const payload = {
        report_code: reportCode,
        output_format: "pdf",
        parameters: parameters || {},
      };

      const response = await axios.post(
        `${baseUrl}/api/reports/data`,
        payload,
        { headers },
      );
      const reportData = response.data;

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(reportData, null, 2),
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `${reportCode}_data.json`);
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
  }, [reportCode, parameters, t, lang]);

  return (
    <BSDialog
      open={open}
      onClose={onClose}
      fullScreen
      // showMinimize={false}
      title={
        <Box
          component="span"
          sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
        >
          <PrintIcon color="primary" />
          <Typography component="span" variant="h6" noWrap>
            {title}
          </Typography>
        </Box>
      }
      titleSx={{
        gap: 1,
        py: 1.25,
        borderBottom: 1,
        borderColor: "divider",
      }}
      titleTypographyProps={{
        sx: {
          flex: 1,
          minWidth: 0,
        },
      }}
      titleActions={
        showDownloadJson && isAltPressed ? (
          <IconButton
            onClick={handleDownloadJson}
            size="small"
            color="primary"
            aria-label="Download JSON"
          >
            <DownloadIcon />
          </IconButton>
        ) : null
      }
      PaperProps={{
        sx: {
          height: "100dvh",
          maxHeight: "100dvh",
        },
      }}
      contentSx={{ p: 0, minHeight: 0, overflow: "hidden" }}
    >
      {open ? (
        <ReportViewer
          lang={lang}
          reportCode={reportCode}
          reportParameters={parameters}
          hideFilters
          embedded
          showDownloadJson={showDownloadJson}
        />
      ) : null}
    </BSDialog>
  );
};

export default ReportPreviewDialog;
