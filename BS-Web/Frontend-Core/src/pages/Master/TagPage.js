import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import GenerateTagPDF from "../../Reports/Tags/GenerateTagPDF";
import { useResource } from "../../hooks/useResource";

const TagPage = (props) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [saving, setSaving] = useState(false);

  // 🌐 Lang / Resource
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);

  const getLang = async () => {
    try {
      // group ชื่อ "Tag" (ตั้งให้ตรงกับฝั่ง resource ของคุณ)
      const res = await getResources("Tag");
      setResourceData(res);
    } catch (error) {
      console.error("getResources(Tag) error:", error);
    }
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // ✅ ปุ่มพิมพ์ tag
  const handlePrintTag = async () => {
    setSaving(true);
    if (selectedRows.length === 0) {
      BSAlertSwal2.show(
        "error",
        getResource(resourceData, "Please select at least one tag to print.") ||
        "Please select at least one tag to print."
      );
      setSaving(false);
      return;
    }

    let status = await GenerateTagPDF(selectedRows);
    if (status.success) {
      BSAlertSwal2.show(
        "success",
        status.message ||
        getResource(resourceData, "Generate tag PDF success.") ||
        "Generate tag PDF success."
      );
    } else {
      BSAlertSwal2.show(
        "error",
        status.message ||
        getResource(resourceData, "Generate tag PDF failed.") ||
        "Generate tag PDF failed."
      );
    }
    setSelectedRows([]); // เคลียร์การเลือกแถวหลังพิมพ์
    setSaving(false);
  };

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {getResource(resourceData, "Master Tag") || "Master Tag"}
        </Typography>

        {/* ปุ่ม Print Tag */}
        {saving ? (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} color="inherit" />
            {getResource(resourceData, "Generate PDF...") || "Generate PDF..."}
          </Box>
        ) : (
          <Box mb={2} display="flex" gap={2}>
            <Button
              variant="contained"
              onClick={handlePrintTag}
              sx={{
                backgroundColor: "#FFA726",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#FB8C00",
                },
              }}
            >
              {getResource(resourceData, "Print Tag") || "Print Tag"}
            </Button>
          </Box>
        )}

        {/* ตารางข้อมูล */}
        <BSDataGrid
          bsStoredProcedure="usp_tbm_tag"
          bsStoredProcedureSchema="ams"
          bsCols="tag_no,tag_number,tag_date,part_no,part_name,supplier_name,area_code,area_name,location,audit,remark,double_check,create_by,create_date,update_by,update_date"
          selectedRows={selectedRows}
          bsShowRowNumber={true}
          showAdd={false}
          bsVisibleDelete={false}
          bsLocale={props.lang || "en"}
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          bsRowPerPage={20}
          bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          bsFilterMode="client"
          bsVisibleEdit={false}
          bsShowCheckbox={true}
          onCheckBoxSelected={(rows) => {
            console.log("Selected rows:", rows);
            setSelectedRows(rows);
          }}
        />
      </Paper>
    </>
  );
};

export default TagPage;
