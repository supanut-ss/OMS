import BSImportFile from "../../components/BSImportFile";
import { Box, Button } from "@mui/material";
import AxiosMaster from "../../utils/AxiosMaster";

const ImportExcel = () => {
  const handleImport = async (files) => {
    const formData = new FormData();

    // 🧾 ใส่ file (ถ้ารับหลายไฟล์ ใส่เฉพาะอันแรกก็ได้)
    formData.append("file", files[0]);

    // 🧍‍♂️ ใส่ค่า ExcelImportRequest ลงใน FormData
    formData.append("user_id", "USR001");
    formData.append("device", "WEB");
    formData.append("import_id", 123);

    try {
      const res = await AxiosMaster.post("/UploadExcel", formData, {
        // ไม่ต้องใส่ Content-Type header เอง
      });

      const data = res.data;
      if (res.status === 200 && data.success) {
        alert("Upload Success!");
      } else {
        alert("Upload Failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    }
  };
  const handleTest = async () => {
    const import_id = 2; // or any dynamic value you want
    try {
      const res = await AxiosMaster.get(
        `/GetImportMaster?import_id=${import_id}`
      );
      const data = res.data;
      if (res.status === 200 && data.success) {
        alert("Fetch Success!");
      } else {
        alert("Fetch Failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching import master.");
    }
  };
  return (
    <Box>
      <BSImportFile
        mode="single"
        accept={[".xlsx", ".xls"]}
        dialogTitle="Import Excel"
        buttonLabel="Choose Excel File"
        onImport={handleImport}
      />
      <Button onClick={handleTest}>Test</Button>
    </Box>
  );
};

export default ImportExcel;
