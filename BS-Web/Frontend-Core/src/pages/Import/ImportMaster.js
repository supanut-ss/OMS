import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useMemo, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";
import AxiosMaster from "../../utils/AxiosMaster";
import SecureStorage from "../../utils/SecureStorage";
import BSAlertSwal2 from "../../components/BSAlertSwal2";

const STATUS_ENDPOINT = "GetStagingTableStatus";

const parseStoredUserInfo = () => {
  const storedUserInfo = SecureStorage.get("userInfo");

  if (!storedUserInfo) {
    return {};
  }

  if (typeof storedUserInfo === "string") {
    try {
      return JSON.parse(storedUserInfo);
    } catch (error) {
      return {};
    }
  }

  return storedUserInfo;
};

const getUserId = () => {
  const userInfo = parseStoredUserInfo();

  return (
    userInfo?.UserId ||
    userInfo?.userId ||
    userInfo?.user_id ||
    userInfo?.username ||
    "system"
  );
};

const getApiErrorMessage = (error, fallbackMessage = "Request failed") => {
  const message =
    error?.response?.data?.message || error?.message || fallbackMessage;

  return typeof message === "string" && message.trim()
    ? message
    : fallbackMessage;
};

const inferStatusFromMessage = (message = "") => {
  const normalizedMessage = String(message).toLowerCase();

  if (
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("created successfully") ||
    normalizedMessage.includes("table exists")
  ) {
    return "exists";
  }

  if (
    normalizedMessage.includes("not exist") ||
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("does not exist")
  ) {
    return "not_exists";
  }

  return "unknown";
};

const normalizeTableStatus = (payload) => {
  const data = payload?.data;

  if (typeof data === "boolean") {
    return data ? "exists" : "not_exists";
  }

  const statusCandidate =
    data?.status ||
    data?.tableStatus ||
    data?.table_status ||
    payload?.status ||
    payload?.tableStatus ||
    payload?.table_status;

  if (typeof statusCandidate === "string") {
    const normalizedStatus = statusCandidate.toLowerCase();

    if (["exists", "created", "available"].includes(normalizedStatus)) {
      return "exists";
    }

    if (
      ["not_exists", "not-exists", "missing", "dropped"].includes(
        normalizedStatus,
      )
    ) {
      return "not_exists";
    }
  }

  const existsCandidate =
    data?.exists ??
    data?.tableExists ??
    data?.table_exists ??
    payload?.exists ??
    payload?.tableExists ??
    payload?.table_exists;

  if (typeof existsCandidate === "boolean") {
    return existsCandidate ? "exists" : "not_exists";
  }

  if (typeof existsCandidate === "number") {
    return existsCandidate > 0 ? "exists" : "not_exists";
  }

  return inferStatusFromMessage(payload?.message);
};

const requestTableStatus = async (importId, tableName) => {
  try {
    const response = await AxiosMaster.get(STATUS_ENDPOINT, {
      params: {
        import_id: importId,
        table_name: tableName,
        import_temp_table_name: tableName,
      },
    });

    return normalizeTableStatus(response?.data);
  } catch (error) {
    const statusCode = error?.response?.status;

    if (statusCode === 404 || statusCode === 405) {
      return "unknown";
    }

    const inferredStatus = inferStatusFromMessage(
      getApiErrorMessage(error, ""),
    );

    if (inferredStatus !== "unknown") {
      return inferredStatus;
    }

    throw error;
  }
};

const getStatusMeta = (tableStatus, loading, labels) => {
  if (loading) {
    return {
      label: labels.checking,
      color: "warning",
      text: labels.checkingText,
    };
  }

  if (tableStatus === "exists") {
    return {
      label: labels.created,
      color: "success",
      text: labels.createdText,
    };
  }

  if (tableStatus === "not_exists") {
    return {
      label: labels.notCreated,
      color: "default",
      text: labels.notCreatedText,
    };
  }

  return {
    label: "-",
    color: "warning",
    text: "",
  };
};

const ImportMaster = (props) => {
  const theme = useTheme();
  const { permission } = useOutletContext();
  const canAdd = Boolean(permission?.is_add);
  const canEdit = Boolean(permission?.is_edit);
  const canDelete = Boolean(permission?.is_delete);
  const canView = Boolean(permission?.is_view);
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [selectedImport, setSelectedImport] = useState(null);
  const [tableStatus, setTableStatus] = useState("unknown");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dropping, setDropping] = useState(false);
  const dataGridRef = useRef(); // เพิ่ม ref สำหรับ DataGrid

  const selectedImportId = Number(
    selectedImport?.import_id || selectedImport?.ImportId || 0,
  );
  const selectedTableName =
    selectedImport?.import_temp_table_name ||
    selectedImport?.ImportTempTableName ||
    "";
  const isThai = String(locale_id || props.lang || "en")
    .toLowerCase()
    .startsWith("th");

  const text = useMemo(
    () => ({
      header: isThai ? "จัดการข้อมูลนำเข้า" : "Import Master",
      subtitle: isThai
        ? "เลือกแถวจากตารางเพื่อตรวจสอบและจัดการ staging table"
        : "Select one record to inspect and manage its staging table.",
      managementTitle: isThai
        ? "จัดการ Staging Table"
        : "Staging Table Management",
      managementSubtitle: isThai
        ? "สร้างหรือลบตาราง staging ของรายการที่เลือก"
        : "Create or drop the staging table for the selected import setup.",
      noSelection: isThai ? "ยังไม่ได้เลือกรายการ" : "No Selection",
      selectedImportId: isThai ? "Import ID ที่เลือก" : "Selected Import ID",
      selectedTableName: isThai ? "ชื่อตาราง Staging" : "Staging Table Name",
      notConfigured: isThai ? "ยังไม่กำหนดค่า" : "Not configured",
      checking: isThai ? "กำลังตรวจสอบ" : "Checking",
      checkingText: isThai
        ? "กำลังตรวจสอบสถานะของ staging table..."
        : "Checking staging table status...",
      created: isThai ? "สร้างแล้ว" : "Created",
      createdText: isThai
        ? "ตาราง staging พร้อมใช้งาน"
        : "The staging table is available and ready to use.",
      notCreated: isThai ? "ยังไม่สร้าง" : "Not Created",
      notCreatedText: isThai
        ? "ยังไม่มีการสร้างตาราง staging"
        : "The staging table has not been created yet.",
      configWarning: isThai
        ? "ต้องกำหนด import_temp_table_name ก่อนจัดการตาราง staging"
        : "import_temp_table_name must be configured before managing staging table.",
      noAddPermission: isThai
        ? "คุณไม่มีสิทธิ์เพิ่มข้อมูล จึงไม่สามารถสร้าง staging table ได้"
        : "You do not have add permission, so staging create is unavailable.",
      noDeletePermission: isThai
        ? "คุณไม่มีสิทธิ์ลบข้อมูล จึงไม่สามารถลบ staging table ได้"
        : "You do not have delete permission, so staging drop is unavailable.",
      create: isThai ? "สร้าง" : "Create",
      creating: isThai ? "กำลังสร้าง..." : "Creating...",
      drop: isThai ? "ลบ" : "Drop",
      dropping: isThai ? "กำลังลบ..." : "Dropping...",
      processing: isThai ? "กำลังประมวลผล..." : "Processing request...",
      statusTitle: isThai ? "สถานะตาราง" : "Table Status",
      createStagingTable: isThai
        ? "สร้างตาราง Staging"
        : "Create Staging Table",
      dropStagingTable: isThai ? "ลบตาราง Staging" : "Drop Staging Table",
    }),
    [isThai],
  );

  useEffect(() => {
    setLocale_id(props.lang || "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  useEffect(() => {
    let isMounted = true;

    const checkTableStatus = async () => {
      if (!selectedImportId || !selectedTableName) {
        if (isMounted) {
          setTableStatus("unknown");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
      }

      try {
        const nextStatus = await requestTableStatus(
          selectedImportId,
          selectedTableName,
        );

        if (isMounted) {
          setTableStatus(nextStatus);
        }
      } catch (error) {
        if (isMounted) {
          setTableStatus("unknown");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkTableStatus();

    return () => {
      isMounted = false;
    };
  }, [selectedImportId, selectedTableName]);

  const handleSelectedRows = (selectedRows) => {
    setSelectedImport(selectedRows?.[0] || null);
  };

  const refreshImportMasterGrid = async () => {
    if (dataGridRef.current?.forceRefresh) {
      await dataGridRef.current.forceRefresh();
      return;
    }

    if (dataGridRef.current?.refreshData) {
      await dataGridRef.current.refreshData(true);
    }
  };
  const handleCreateStagingTableByRow = async (importId, importName) => {
    if (!canAdd) {
      await BSAlertSwal2.show("error", text.noAddPermission);
      return;
    }
    const confirmed = await BSAlertSwal2.confirm(
      `คุณต้องการสร้างตาราง staging สำหรับ ${importName} ใช่หรือไม่?`,
      {
        confirmButtonText: "Create",
        cancelButtonText: "Cancel",
      },
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setCreating(true);

    try {
      const response = await AxiosMaster.post("CreateStagingTable", null, {
        params: {
          import_id: importId,
          created_by: getUserId(),
        },
      });

      const result = response?.data;

      if (result?.code === "0") {
        setTableStatus("exists");
        await BSAlertSwal2.show(
          "success",
          result?.message || "Staging table created successfully.",
        );
        await refreshImportMasterGrid();
        return;
      }

      const message = result?.message || "Create staging table failed.";
      const inferredStatus = inferStatusFromMessage(message);

      if (inferredStatus !== "unknown") {
        setTableStatus(inferredStatus);
      }

      await BSAlertSwal2.show("error", message);
    } catch (error) {
      const message = getApiErrorMessage(error, "Create staging table failed.");
      const inferredStatus = inferStatusFromMessage(message);

      if (inferredStatus !== "unknown") {
        setTableStatus(inferredStatus);
      }

      await BSAlertSwal2.show("error", message);
    } finally {
      setCreating(false);
      setLoading(false);
    }
  };

  const handleDropStagingTableByRow = async (importId, importName) => {
    if (!canDelete) {
      await BSAlertSwal2.show("error", text.noDeletePermission);
      return;
    }
    const confirmed = await BSAlertSwal2.confirm(
      `คุณต้องการลบตาราง staging สำหรับ ${importName} ใช่หรือไม่?\nข้อมูลทั้งหมดในตารางจะถูกลบ!`,
      {
        confirmButtonText: "Drop",
        cancelButtonText: "Cancel",
      },
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setDropping(true);
    try {
      const response = await AxiosMaster.post("DropStagingTable", null, {
        params: {
          import_id: importId,
        },
      });

      const result = response?.data;

      if (result?.code === "0") {
        setTableStatus("not_exists");
        await BSAlertSwal2.show(
          "success",
          result?.message || "Staging table dropped successfully.",
        );
        await refreshImportMasterGrid();
        return;
      }

      const message = result?.message || "Drop staging table failed.";
      const inferredStatus = inferStatusFromMessage(message);

      if (inferredStatus !== "unknown") {
        setTableStatus(inferredStatus);
      }

      await BSAlertSwal2.show("error", message);
    } catch (error) {
      const message = getApiErrorMessage(error, "Drop staging table failed.");
      const inferredStatus = inferStatusFromMessage(message);

      if (inferredStatus !== "unknown") {
        setTableStatus(inferredStatus);
      }

      await BSAlertSwal2.show("error", message);
    } finally {
      setDropping(false);
      setLoading(false);
    }
  };

  const handleDropStagingTable = async () => {
    if (!canDelete) {
      await BSAlertSwal2.show("error", text.noDeletePermission);
      return;
    }

    if (!selectedImportId) {
      await BSAlertSwal2.show(
        "error",
        "Please select an Import Master record first.",
      );
      return;
    }

    if (!selectedTableName) {
      await BSAlertSwal2.show(
        "error",
        "import_temp_table_name is not configured.",
      );
      return;
    }

    const confirmed = await BSAlertSwal2.confirm(
      `คุณต้องการลบตาราง ${selectedTableName} ใช่หรือไม่?\nข้อมูลทั้งหมดในตารางจะถูกลบ!`,
      {
        confirmButtonText: "Drop",
        cancelButtonText: "Cancel",
      },
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setDropping(true);

    try {
      const response = await AxiosMaster.post("DropStagingTable", null, {
        params: {
          import_id: selectedImportId,
        },
      });

      const result = response?.data;

      if (result?.code === "0") {
        setTableStatus("not_exists");
        await BSAlertSwal2.show(
          "success",
          result?.message || "Staging table dropped successfully.",
        );
        await refreshImportMasterGrid();
        return;
      }

      const message = result?.message || "Drop staging table failed.";
      const inferredStatus = inferStatusFromMessage(message);

      if (inferredStatus !== "unknown") {
        setTableStatus(inferredStatus);
      }

      await BSAlertSwal2.show("error", message);
    } catch (error) {
      const message = getApiErrorMessage(error, "Drop staging table failed.");
      const inferredStatus = inferStatusFromMessage(message);

      if (inferredStatus !== "unknown") {
        setTableStatus(inferredStatus);
      }

      await BSAlertSwal2.show("error", message);
    } finally {
      setDropping(false);
      setLoading(false);
    }
  };

  const statusMeta = getStatusMeta(
    tableStatus,
    loading && !creating && !dropping,
    text,
  );
  const createDisabled =
    loading ||
    creating ||
    !canAdd ||
    !selectedImportId ||
    !selectedTableName ||
    tableStatus === "exists";
  const dropDisabled =
    loading ||
    dropping ||
    !canDelete ||
    !selectedImportId ||
    !selectedTableName ||
    tableStatus === "not_exists";

  return (
    <Box sx={{ height: "100%" }}>
      <Paper
        sx={{
          p: 2,
         // mb: 3,
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="imp"
          bsObj="t_mas_import_master"
          bsObjBy="import_id asc"
          bsCols={[
            "import_id",
            "import_name",
            "description",
            "exec_sql_command",
            "seq",
            "is_active",
            "confirm_message_th",
            "confirm_message_en",
            "confirm_message_other",
            "import_batch_size",
            "import_status",
            "import_temp_table_name",
          ].join(",")}
          bsKeyId="import_id"
          bsShowRowNumber={true}
          bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          showAdd={canAdd}
          bsVisibleEdit={canEdit}
          bsVisibleDelete={canDelete}
          bsAllowDelete={canDelete}
          bsVisibleView={canView}
          bsBulkMode={{
            enable: false,
            addInline: canAdd,
            edit: canEdit,
            delete: canDelete,
            add: canAdd,
            showCheckbox: false,
          }}
          bsColumnDefs={[
            {
              field: "is_active",
              defaultValue: "YES",
            },
            {
              field: "create_date",
              type: "date",
              dateFormat: "dd/MM/yyyy",
            },
            {
              field: "create_staging_table",
              headerName: text.createStagingTable,
              customColumn: true,
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() =>
                        handleCreateStagingTableByRow(
                          params.row.import_id,
                          params.row.import_name,
                        )
                      }
                      sx={{ py: 0.25, lineHeight: 1 }}
                    >
                      {text.createStagingTable}
                    </Button>
                  </Box>
                );
              },
            },
            {
              field: "drop_staging_table",
              headerName: text.dropStagingTable,
              customColumn: true,
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() =>
                        handleDropStagingTableByRow(
                          params.row.import_id,
                          params.row.import_name,
                        )
                      }
                      sx={{ py: 0.25, lineHeight: 1 }}
                    >
                      {text.dropStagingTable}
                    </Button>
                  </Box>
                );
              },
            },
          ]}
        />
      </Paper>
    </Box>
  );
};

export default ImportMaster;
