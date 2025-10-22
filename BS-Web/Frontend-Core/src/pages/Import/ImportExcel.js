import BSImportFile from "../../components/BSImportFile";
import { Box } from "@mui/material";
// ...existing code...
import { DataGrid } from "@mui/x-data-grid";
// ...existing code...
import AxiosMaster from "../../utils/AxiosMaster";
import SecureStorage from "../../utils/SecureStorage";
import BSAutoComplete from "../../components/BSAutoComplete";
import { useState, useMemo } from "react";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import DownloadIcon from "@mui/icons-material/Download";
import { Button } from "@mui/material";
import BSDataGridClient from "../../components/BSDataGridClient";
// ...existing code...

const ImportExcel = () => {
  const [select, setSelect] = useState("");
  const [gridRows, setGridRows] = useState([]);
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
  const columns = [
    {
      field: "code",
      headerName: "Code",
      width: 150,
    },
    {
      field: "message",
      headerName: "Message",
      width: 600,
    },
    { field: "records", headerName: "Records", width: 90 },
  ];
  const userId = userInfo?.UserId ?? userInfo?.userId ?? "";

  const handleDownload = async () => {
    if (!select?.import_id) {
      BSAlertSwal2.show(
        "error",
        "Please select an import type before downloading."
      );
      return;
    }
    const url = `/GetImportMaster?import_id=${select?.import_id}`;
    try {
      const res = await AxiosMaster.get(url);
      const filePath = res.data?.data?.[0]?.excel_example_file_path;
      if (!filePath) {
        BSAlertSwal2.show("error", "ไม่พบ path ของไฟล์ Excel");
        return;
      }
      // ใช้ anchor trick เพื่อให้ browser download
      const fileName = filePath.split("/").pop();
      // 📥 สร้างลิงก์ดาวน์โหลด
      const link = document.createElement("a");
      link.href = filePath;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      BSAlertSwal2.show("error", "Upload error:", err);
    }
  };
  const handleImport = async (files) => {
    if (!select?.import_id) {
      BSAlertSwal2.show(
        "error",
        "Please select an import type before importing."
      );
      return;
    }
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("user_id", userId);
    formData.append("import_id", select?.import_id ?? "");

    try {
      // let AxiosMaster/browser set multipart Content-Type & boundary
      const res = await AxiosMaster.post("/UploadExcel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const data = res.data;

      if (res.status === 200 && data.code === "0") {
        BSAlertSwal2.show("success", data.message || "Import success");
        // if response contains tabular payload, map it to DataGrid
      } else {
        BSAlertSwal2.show("error", data.message || "Unknown error");
      }
      const payload = data.data;
      console.log(payload);
      setGridData(payload);
    } catch (err) {
      BSAlertSwal2.show("error", "Upload error:", err);
    }
  };

  return (
    <Box>
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
        bsValue={select} // ค่าเริ่มต้น = code ของ option
        bsCacheKey="select"
        bsOnChange={(val) => {
          console.log(val);
          setSelect(val);
        }}
        bsLoadOnOpen={true}
      />
      <BSImportFile
        mode="single"
        accept={[".xlsx", ".xls"]}
        dialogTitle="Import Excel"
        buttonLabel="Choose Excel File"
        onImport={handleImport}
      />
      <Button
        variant="contained"
        color="success"
        startIcon={<DownloadIcon />}
        onClick={handleDownload}
      >
        Download Excel
      </Button>
      <BSDataGridClient data={gridData} />
    </Box>
  );
};

export default ImportExcel;
