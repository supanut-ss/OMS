import { useEffect, useState, useMemo, useRef } from "react";
import { Alert, Paper, Box, Tabs, Tab } from "@mui/material";
import { useParams, useOutletContext } from "react-router-dom";
import BSImportFile from "../../components/BSImportFile";
import AxiosMaster from "../../utils/AxiosMaster";
import SecureStorage from "../../utils/SecureStorage";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import BSDataGrid from "../../components/BSDataGrid";

const getImportStatusStyle = (statusValue) => {
  const status = String(statusValue || "")
    .trim()
    .toUpperCase();

  if (status === "SUCCESS") {
    return { color: "#059669" };
  }

  if (status === "FAILED") {
    return { color: "#ef4444" };
  }

  return { color: "#64748b" };
};

const ImportExcel = (props) => {
  const { importKey } = useParams();
  const { permission } = useOutletContext();
  const canAdd = Boolean(permission?.is_add);
  const canView = Boolean(permission?.is_view);

  const importFileRef = useRef(null);
  const dataGridRef = useRef(null); // เพิ่ม ref สำหรับสั่งงานตัวตาราง BSDataGrid
  const historyGridRef = useRef(null);

  const [currentImportConfig, setCurrentImportConfig] = useState(null);
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [activeTab, setActiveTab] = useState(0);
  const responsePopupDelayMs = 6000;

  const displayLocale = useMemo(() => {
    const lang = (locale_id || props.lang || "en").toString().toLowerCase();
    return lang.startsWith("th") ? "th" : "en";
  }, [locale_id, props.lang]);
  const isThai = displayLocale === "th";

  const text = useMemo(
    () => ({
      title: isThai ? "นำเข้าไฟล์ Excel" : "Excel Import",
      importPermissionDenied: isThai
        ? "คุณไม่มีสิทธิ์นำเข้าข้อมูล"
        : "You do not have permission to import data.",
      importTypePermissionDenied: isThai
        ? "คุณไม่มีสิทธิ์ดูข้อมูลประเภทการนำเข้า"
        : "You do not have permission to view import types.",
      refreshed: isThai
        ? "รีเฟรชข้อมูลเรียบร้อย"
        : "Data refreshed successfully",
      importDialogTitle: isThai ? "นำเข้าไฟล์ Excel" : "IMPORT EXCEL",
      importAction: isThai ? "นำเข้า" : "Import",
      importingAction: isThai ? "กำลังนำเข้า..." : "Importing...",
      cancelAction: isThai ? "ยกเลิก" : "Cancel",
      browseFile: isThai ? "เลือกไฟล์ Excel" : "Browse Excel File",
      downloadExcel: isThai ? "ดาวน์โหลดเทมเพลต" : "Download Template",
      uploadTab: isThai ? "นำเข้าข้อมูล" : "Upload",
      historyTab: isThai ? "ประวัติการอัปโหลด" : "Upload History",
      notFound: isThai
        ? "ไม่พบข้อมูลประเภทการนำเข้าที่ระบุ"
        : "Import configuration not found.",
    }),
    [isThai],
  );

  useEffect(() => {
    setLocale_id(props.lang || "en");
  }, [props.lang]);

  const userInfo = useMemo(() => {
    const raw = SecureStorage.get("userInfo");
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw || {};
    } catch (e) {
      console.warn("Invalid userInfo JSON:", raw);
      return {};
    }
  }, []);

  const userId = userInfo?.UserId ?? userInfo?.userId ?? "";

  // ตัดคำจาก import_temp_table_name เช่น "[inv].[t_inv_import_location]"
  const parsedTableConfig = useMemo(() => {
    const rawTableName = currentImportConfig?.import_temp_table_name || "";
    if (!rawTableName) return { bsPreObj: "", bsObj: "" };

    const cleanString = rawTableName.replace(/[\[\]]/g, "");
    const parts = cleanString.split(".");

    if (parts.length >= 2) {
      return {
        bsPreObj: parts[0], // "inv"
        bsObj: parts.slice(1).join("."), // "t_inv_import_location"
      };
    }
    return {
      bsPreObj: "",
      bsObj: cleanString,
    };
  }, [currentImportConfig]);

  const gridExportFileName = useMemo(() => {
    return (
      currentImportConfig?.import_name ||
      currentImportConfig?.import_id ||
      "import_staging"
    );
  }, [currentImportConfig]);

  const gridPrintTitle = useMemo(() => {
    const selectedType =
      currentImportConfig?.import_name || currentImportConfig?.import_id || "-";
    return `${text.title} - ${selectedType}`;
  }, [currentImportConfig, text.title]);

  const showAlert = (icon, text, ...options) =>
    BSAlertSwal2.show(icon, text, ...options);

  const historyColumnDefs = useMemo(
    () => [
      { field: "import_history_id", hide: true, showInForm: false },
      {
        field: "import_date",
        headerName: "Import Date",
        width: 180,
      },
      { field: "file_name", headerName: "File Name", width: 240 },
      {
        field: "total_rows",
        headerName: "Total Rows",
        type: "number",
        width: 120,
      },
      {
        field: "success_rows",
        headerName: "Success",
        type: "number",
        width: 110,
      },
      {
        field: "failed_rows",
        headerName: "Failed",
        type: "number",
        width: 100,
      },
      { field: "imported_by", headerName: "Imported By", width: 150 },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        renderCell: (params) => (
          <Box
            sx={{
              ...getImportStatusStyle(params?.value),
              minWidth: 88,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "0.8125rem",
              py: 0.5,
            }}
          >
            {params?.value || "-"}
          </Box>
        ),
      },
    ],
    [],
  );

  // Load configuration จากตาราง Master เมื่อเข้าหน้านี้มา
  useEffect(() => {
    const loadImportConfigFromUrl = async () => {
      if (!importKey) return;

      try {
        const res = await AxiosMaster.get(
          `/GetImportMaster?import_id=${importKey}`,
        );

        if (res.data && res.data.code === "0") {
          let masterData = res.data.data;
          if (Array.isArray(masterData)) {
            masterData = masterData[0];
          } else if (!masterData) {
            masterData = res.data;
          }

          if (masterData && masterData.import_id) {
            setCurrentImportConfig(masterData);
          } else {
            setCurrentImportConfig(null);
            showAlert("error", text.notFound);
          }
        } else {
          setCurrentImportConfig(null);
          showAlert("error", text.notFound);
        }
      } catch (err) {
        console.error("❌ Failed to fetch import master:", err);
        setCurrentImportConfig(null);
        showAlert("error", text.notFound);
      }
    };

    loadImportConfigFromUrl();
  }, [importKey, text.notFound]);

  // ฟังก์ชันรีเฟรชข้อมูลของตาราง
  const refreshImportGrid = async () => {
    if (dataGridRef.current?.forceRefresh) {
      await dataGridRef.current.forceRefresh();
    } else if (dataGridRef.current?.refreshData) {
      await dataGridRef.current.refreshData(true);
    }
  };

  const refreshUploadHistory = async () => {
    if (historyGridRef.current?.forceRefresh) {
      await historyGridRef.current.forceRefresh();
    } else if (historyGridRef.current?.refreshData) {
      await historyGridRef.current.refreshData(true);
    }
  };

  // 🆕เพิ่ม useEffect ตรวจจับเมื่อชื่อตารางถูกจัดเตรียมเสร็จ (parsedTableConfig.bsObj มีค่า)
  // จะสั่งให้ตัวตารางดึงข้อมูลอัตโนมัติทันทีโดยไม่ต้องกดปุ่มค้นหา
  useEffect(() => {
    if (parsedTableConfig.bsObj) {
      // หน่วงเวลาเล็กน้อยเพื่อให้ตัวตาราง Render เสร็จและจับ Ref ได้มั่นคง
      const timer = setTimeout(() => {
        refreshImportGrid();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [parsedTableConfig.bsObj]);

  const handleDownload = async () => {
    if (!currentImportConfig?.import_id) return;

    const url = `/DownloadTemplateByMapping?import_id=${currentImportConfig?.import_id}`;
    try {
      const res = await AxiosMaster.get(url, { responseType: "blob" });
      const contentDisposition =
        res.headers["content-disposition"] ||
        res.headers["Content-Disposition"];
      let fileNameFromHeader = null;

      if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(
          /filename\*=(?:UTF-8'')?(.+?)(?:;|$)/i,
        );
        if (filenameStarMatch) {
          fileNameFromHeader = decodeURIComponent(filenameStarMatch[1]).trim();
        }
        if (!fileNameFromHeader) {
          const filenameMatch = contentDisposition.match(
            /filename=(?:"([^"]+)"|([^;]+))/i,
          );
          if (filenameMatch) {
            fileNameFromHeader = (filenameMatch[1] || filenameMatch[2]).trim();
          }
        }
      }

      const safeName = (
        currentImportConfig?.import_name ||
        String(currentImportConfig?.import_id) ||
        "import_template"
      )
        .replace(/[^\w\u0E00-\u0E7F]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      const fallbackName = `${safeName}.xlsx`;
      const fileName = fileNameFromHeader || fallbackName;

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      showAlert("error", "Download error: " + err.message);
    }
  };

  const handleBeforeOpen = () => {
    if (!canAdd) {
      showAlert("error", text.importPermissionDenied, {
        timer: 1500,
        showConfirmButton: false,
      });
      return false;
    }
    return true;
  };

  const handleImport = async (files, setProgress) => {
    if (!canAdd || !files || files.length === 0) return;

    const rawMsg = currentImportConfig?.[`confirm_message_${locale_id}`];
    const confirmMsg =
      typeof rawMsg === "string" &&
      rawMsg.trim() !== "" &&
      rawMsg.trim().toLowerCase() !== "null"
        ? rawMsg.trim()
        : null;

    if (confirmMsg) {
      const result = await showAlert("warning", confirmMsg, {
        showCancelButton: true,
        showConfirmButton: true,
        cancelButtonText: isThai ? "ยกเลิก" : "Cancel",
        confirmButtonText: isThai ? "ตกลง" : "OK",
      });

      if (result.isConfirmed) {
        await ImportExcelFile(files, setProgress);
      }
    } else {
      await ImportExcelFile(files, setProgress);
    }
  };

  async function ImportExcelFile(files, setProgress) {
    const uploadFormData = new FormData();
    for (let i = 0; i < files.length; i++) {
      uploadFormData.append("files", files[i]);
    }

    const requestLang = (locale_id || props.lang || "EN").toString().trim();
    uploadFormData.append("user_id", userId);
    uploadFormData.append("import_id", currentImportConfig?.import_id ?? "");
    uploadFormData.append("lang", requestLang || "EN");

    try {
      const res = await AxiosMaster.post("/UploadExcelBulk", uploadFormData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          }
        },
      });

      const data = res.data;
      if (res.status === 200 && (data.code === "0" || data.code === "-1")) {
        if (data.code === "0") {
          showAlert("success", data.message || "Import success", {
            timer: responsePopupDelayMs,
            showConfirmButton: false,
          });
        } else if (data.code === "-1") {
          showAlert(
            "warning",
            data.message || "Import completed with warnings",
            {
              timer: responsePopupDelayMs,
              showConfirmButton: false,
            },
          );
        }
        await refreshImportGrid(); // เรียกรันคำสั่งรีเฟรชตารางหลังอัปโหลดสำเร็จ
        await refreshUploadHistory();
      } else {
        showAlert("error", data.message || "Import failed", {
          timer: responsePopupDelayMs,
          showConfirmButton: false,
        });
        await refreshImportGrid();
        await refreshUploadHistory();
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      showAlert("error", `Upload error: ${err.message}`, {
        timer: responsePopupDelayMs,
        showConfirmButton: false,
      });
    }
  }

  const handleTriggerImportClick = () => {
    if (!canAdd) {
      showAlert("error", text.importPermissionDenied, {
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    const hiddenUploadButton = importFileRef.current?.querySelector("button");
    if (hiddenUploadButton) {
      hiddenUploadButton.click();
    }
  };

  const gridCustomActions = useMemo(() => {
    if (!currentImportConfig) return [];
    return [
      {
        label: text.downloadExcel,
        icon: <DownloadIcon />,
        onClick: handleDownload,
        // variant: "outlined",
        color: "success",
        sx: {
          borderColor: "success.main",
          "&:hover": {
            bgcolor: "success.main",
            color: "white",
          },
        },
      },
      {
        label: text.browseFile,
        icon: <UploadFileIcon />,
        onClick: handleTriggerImportClick,
        disabled: !canAdd,
        variant: "contained",
      },
    ];
  }, [currentImportConfig, canAdd, text]);

  return (
    <Paper
      sx={{
        p: 2,
        //  mb: 3,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {!canView && (
        <Alert severity="warning">{text.importTypePermissionDenied}</Alert>
      )}
      {!canAdd && <Alert severity="info">{text.importPermissionDenied}</Alert>}

      <div ref={importFileRef} style={{ display: "none" }}>
        <BSImportFile
          mode="single"
          dialogTitle={text.importDialogTitle}
          buttonLabel={text.browseFile}
          importText={text.importAction}
          importingText={text.importingAction}
          cancelText={text.cancelAction}
          accept={[".xlsx", ".xls"]}
          onImport={handleImport}
          beforeOpen={handleBeforeOpen}
          disabled={!canAdd}
        />
      </div>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          aria-label="Excel import tabs"
        >
          <Tab label={text.uploadTab} />
          <Tab label={text.historyTab} disabled={!canView} />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box
          sx={{
            flex: "1 1 0",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {parsedTableConfig.bsObj ? (
            <BSDataGrid
              ref={dataGridRef}
              height="auto"
              bsLocale={locale_id}
              bsPreObj={parsedTableConfig.bsPreObj}
              bsObj={parsedTableConfig.bsObj}
              bsObjBy="row_number asc"
              bsKeyId="imp_data_id"
              bsPageSizeOptions={[20, 100, 200, 500, 1000]}
              showAdd={false}
              bsVisibleEdit={false}
              bsVisibleDelete={false}
              bsAllowDelete={false}
              bsVisibleView={canView}
              bsShowRowNumber={true}
              bsExportFileName={gridExportFileName}
              bsPrintTitle={gridPrintTitle}
              onRefresh={refreshImportGrid}
              bsCustomActions={gridCustomActions}
              bsBulkMode={{
                enable: false,
                addInline: false,
                edit: false,
                delete: false,
                add: false,
                showCheckbox: false,
              }}
              bsColumnDefs={[
                {
                  field: "imp_data_id",
                  hide: true,
                },
                {
                  field: "session_id",
                  hide: true,
                },
                {
                  field: "import_id",
                  hide: true,
                },
                {
                  field: "import_name",
                  hide: true,
                },
                {
                  field: "row_number",
                  hide: true,
                },
                {
                  field: "processed_date",
                  hide: true,
                },
              ]}
            />
          ) : (
            canView && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Alert severity="info">{text.notFound}</Alert>
              </Box>
            )
          )}
        </Box>
      )}

      {activeTab === 1 && canView && (
        <Box
          sx={{
            flex: "1 1 0",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <BSDataGrid
            ref={historyGridRef}
            height="auto"
            bsLocale={locale_id}
            bsPreObj="imp"
            bsObj="t_log_import_upload"
            bsObjWh={`import_id=${Number(currentImportConfig?.import_id) || 0}`}
            bsObjBy="import_date desc, import_history_id desc"
            bsCols="import_history_id,import_date,file_name,total_rows,success_rows,failed_rows,imported_by,status"
            bsKeyId="import_history_id"
            bsPageSizeOptions={[20, 100, 200, 500]}
            showAdd={false}
            bsVisibleEdit={false}
            bsVisibleDelete={false}
            bsAllowDelete={false}
            bsVisibleView={false}
            bsShowRowNumber={true}
            bsExportFileName={`${gridExportFileName}_upload_history`}
            bsPrintTitle={`${gridPrintTitle} - ${text.historyTab}`}
            bsBulkMode={{
              enable: false,
              addInline: false,
              edit: false,
              delete: false,
              add: false,
              showCheckbox: false,
            }}
            bsColumnDefs={historyColumnDefs}
          />
        </Box>
      )}
    </Paper>
  );
};

export default ImportExcel;
