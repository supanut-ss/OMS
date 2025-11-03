import { useState, useMemo } from "react";
import { Button, Box } from "@mui/material";
import BSImportFile from "../../components/BSImportFile";
import AxiosMaster from "../../utils/AxiosMaster";
import SecureStorage from "../../utils/SecureStorage";
import BSAutoComplete from "../../components/BSAutoComplete";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import DownloadIcon from "@mui/icons-material/Download";
import BSDataGridClient from "../../components/BSDataGridClient";
import { useTheme } from "@mui/material/styles";
import Config from "../../utils/Config";
const ImportExcel = () => {
  const theme = useTheme();
  const [select, setSelect] = useState("");
  const [gridData, setGridData] = useState([]);

  const userInfo = useMemo(() => {
    const raw = SecureStorage.get("userInfo");
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw || {};
    } catch (e) {
      console.warn("Invalid userInfo JSON:", raw);
      return {};
    }
  }, []);
  const importResultColumns = [
    {
      field: "code",
      headerName: "Code",
      width: 150,
      type: "string",
    },
    {
      field: "message",
      headerName: "Message",
      width: 600,
      type: "string",
    },
    {
      field: "records",
      headerName: "Records",
      width: 90,
      type: "string",
    },
  ];
  const userId = userInfo?.UserId ?? userInfo?.userId ?? "";

  const handleDownload = async () => {
    if (!select?.import_id) {
      showAlert("error", "Please select an import type before downloading.", {
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }
    const url = `/GetImportMaster?import_id=${select?.import_id}`;
    try {
      const res = await AxiosMaster.get(url);
      const filePath = res.data?.data?.[0]?.excel_example_file_path;
      if (!filePath) {
        showAlert("error", "ไม่พบ path ของไฟล์ Excel");
        return;
      }
      // ใช้ anchor trick เพื่อให้ browser download
      const fileName =
        window.location.origin + "" + Config.BASE_URL + "" + filePath ||
        "template.xlsx";
      /// สร้างลิงก์ดาวน์โหลดไฟล์
      const link = document.createElement("a");
      link.href = fileName;
      link.setAttribute(
        "download",
        fileName.split("/").pop() || "template.xlsx"
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileName);
    } catch (err) {
      showAlert("error", "Download error:", err);
    }
  };
  const showAlert = (icon, text, ...options) =>
    BSAlertSwal2.show(icon, text, ...options);
  const handleBeforeOpen = () => {
    if (!select?.import_id) {
      showAlert("error", "Please select an import type before importing.", {
        timer: 1500,
        showConfirmButton: false,
      });
      return false;
    }
    return true;
  };
  const handleImport = async (files, setProgress) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    formData.append("user_id", userId);
    formData.append("import_id", select?.import_id ?? "");

    try {
      const res = await AxiosMaster.post("/UploadExcel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // ✅ ใช้ event นี้อัปเดต progress
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          }
        },
      });
      const data = res.data;
      if (res.status === 200 && data.code === "0") {
        showAlert("success", data.message || "Import success", {
          timer: 1500,
          showConfirmButton: false,
        });
        setGridData(data.data);
      } else {
        showAlert("error", data.message || "Unknown error");
      }
      const payload = data.data;
      setGridData(payload);
    } catch (err) {
      showAlert("error", "Upload error", err);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
        borderRadius: 2,
      }}
    >
      {/* แถวบน: AutoComplete + ปุ่ม */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {/* AutoComplete ครึ่งหนึ่งของพื้นที่ */}
        <Box sx={{ flex: 1 }}>
          <BSAutoComplete
            bsMode="select"
            bsTitle="เลือก Item เดียว"
            bsPreObj="imp.t_mas_"
            bsObj="import_master"
            bsColumes={[
              { field: "import_id", display: false, filter: false, key: true },
              { field: "import_name", display: true, filter: true, key: false },
            ]}
            bsObjBy="import_name"
            bsObjWh=""
            bsValue={select}
            bsCacheKey="select"
            bsOnChange={(val) => {
              console.log(val);
              setSelect(val);
            }}
            bsLoadOnOpen={true}
          />
        </Box>

        {/* ปุ่ม Choose File */}
        <BSImportFile
          mode="single"
          dialogTitle="IMPORT EXCEL"
          buttonLabel="Browse Excel File"
          accept={[".xlsx", ".xls"]}
          onImport={handleImport}
          beforeOpen={handleBeforeOpen}
        />

        {/* ปุ่ม Download */}
        <Button
          variant="contained"
          color="success"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          DOWNLOAD EXCEL
        </Button>
      </Box>

      {/* ตารางด้านล่าง */}
      <BSDataGridClient data={gridData} columns={importResultColumns} />
    </Box>
  );
};

export default ImportExcel;
