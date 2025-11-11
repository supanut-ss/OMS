import { Box, Button, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import AxiosMaster from "../../utils/AxiosMaster";
import { useRef } from "react";
const ExportToExcel = async () => {
  console.log("Export to Excel clicked");

  try {
    const response = await AxiosMaster.get("/Excel/ExportSummaryReport", {
      responseType: "blob", // ต้องใส่เพื่อรับ binary file
    });
    // ดึงชื่อไฟล์จาก header (Content-Disposition)
    const contentDisposition = response.headers["content-disposition"];
    // ✅ สร้างชื่อไฟล์ตามรูปแบบ yyyyMMdd_HHmmss
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const formattedDate =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) + "_" +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    let fileName = `inventory_check_${formattedDate}.xlsx`;
    if (contentDisposition) {
      // รองรับทั้ง filename และ filename* (UTF-8 encoded)
      const utf8FileNameMatch = contentDisposition.match(/filename\*=['"]?UTF-8''([^;\r\n"]+)/);
      const asciiFileNameMatch = contentDisposition.match(/filename=['"]?([^;\r\n"]+)/);

      if (utf8FileNameMatch) {
        fileName = decodeURIComponent(utf8FileNameMatch[1]);
      } else if (asciiFileNameMatch) {
        fileName = asciiFileNameMatch[1];
      }
    }

    // สร้าง Blob จาก response
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // สร้างลิงก์ดาวน์โหลดไฟล์
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
  }
};

const CountReconcile = (props) => {
  const dataGridRef = useRef();
  return <Box>
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Count Reconcile
      </Typography>
      <Box mt={3}>
        <Box>
          <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={ExportToExcel}>
            Export to Excel
          </Button>
        </Box>
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="ams"
          bsObj="v_ams_count_reconcile"
          bsCols="area_code
	,area_name
	, part_no
	, part_name
	, status
	, count_tag_plan
	, count_tag_actual
	, total_qty_plan
	, total_qty_actual
	, diff"
          bsObjBy="status asc"
          bsPinColsLeft=""
          bsPinColsRight=""
          //  bsRowPerPage={20}
          showAdd={false}
          readOnly={true}
          bsBulkDelete={false}
          bsBulkEdit={false}
          bsBulkAdd={false}
          bsShowDescColumn={false}

          //   onCheckBoxSelected={(rows) => {
          //     console.log("Selected rows:", rows);
          //    // setSelectedRows(rows);
          //   }}
          // onEdit={(row) => console.log("Edit:", row)}
          //    onDelete={(id) => console.log("Delete:", id)}
          //  onAdd={() => console.log("Add new record")}
          bsPageSize={20}
          bsShowRowNumber={true}
        />
      </Box>
    </Paper>

  </Box >;
}
export default CountReconcile;