import BSImportFile from "../../components/BSImportFile";
import { Box, Typography } from "@mui/material";
// ...existing code...
import { DataGrid } from "@mui/x-data-grid";
// ...existing code...
import AxiosMaster from "../../utils/AxiosMaster";
import SecureStorage from "../../utils/SecureStorage";
import BSAutoComplete from "../../components/BSAutoComplete";
import { useState, useMemo } from "react";
// ...existing code...

const ImportExcel = () => {
  const [select, setSelect] = useState("");
  const [gridRows, setGridRows] = useState([]);
  const [recordsCount, setRecordsCount] = useState(null);

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

  const handleImport = async (files) => {
    if (!select?.import_id) {
      alert("Please select an import type before importing.");
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

      // set records count when provided
      setRecordsCount(typeof data.records === "number" ? data.records : null);

      if (res.status === 200 && data.code == "0") {
        alert(data.message || "Import success");
        // if response contains tabular payload, map it to DataGrid
        const payload = data.data;
        debugger;
        if (payload && typeof payload === "object" && payload.code) {
          setGridRows([{ id: 1, ...payload }]);
        } else {
          // no tabular data — clear grid
          setGridRows([]);
        }
      } else {
        alert("Upload Failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading file.");
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

      <DataGrid
        rows={gridRows}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
      />
    </Box>
  );
};

export default ImportExcel;
