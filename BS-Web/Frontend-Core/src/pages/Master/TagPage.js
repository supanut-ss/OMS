import React, { useState } from "react";
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


const TagPage = () => {
    const [selectedRows, setSelectedRows] = useState([]);
    const [saving, setSaving] = useState(false);

    // ✅ ปุ่มพิมพ์ tag
    const handlePrintTag = async () => {
        setSaving(true);
        if (selectedRows.length === 0) {
            BSAlertSwal2.show(
                "error",
                "Please select at least one tag to print."
            );
            setSaving(false);
            return;
        }
        let status = await GenerateTagPDF(selectedRows);
        if (status.success) {
            BSAlertSwal2.show("success", status.message);
        } else {
            BSAlertSwal2.show("error", status.message);
        }
        setSelectedRows([]); // เคลียร์การเลือกแถวหลังพิมพ์
        setSaving(false);
    };

    return (
        <>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Master Tag
                </Typography>
                {/* ปุ่ม Import / Print Tag */}
                {saving ? (
                    <Box
                        sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}
                    >
                        <CircularProgress size={18} color="inherit" />
                        Genarate Pdf...
                    </Box>
                ) : (
                    <Box mb={2} display="flex" gap={2}>
                        <Button
                            variant="contained"
                            onClick={handlePrintTag}
                            sx={{
                                backgroundColor: "#FFA726", // สีส้ม (MUI orange[400])
                                color: "#fff",
                                "&:hover": {
                                    backgroundColor: "#FB8C00", // สีส้มเข้มขึ้นตอน hover
                                },
                            }}
                        >
                            Print Tag
                        </Button>
                    </Box>
                )}

                {/* ตารางข้อมูล */}
                {/* <BSDataGrid
                    bsLocale="en"
                    bsPreObj="ams"
                    bsObj="tbm_tag"
                    showAdd={false}
                    bsVisibleDelete={false}
                    bsCols="tag_no,tag_date,part_no,part_name,supplier_name,area_code,area_name,location,audit,remark,double_check,create_by,create_date,update_by,update_date"
                    selectedRows={selectedRows}
                    onCheckBoxSelected={(rows) => {
                        console.log("Selected rows:", rows);
                        setSelectedRows(rows);
                    }}
                /> */}
                <BSDataGrid
                    // Enhanced Stored Procedure Configuration
                    bsStoredProcedure="usp_tbm_tag"
                    bsStoredProcedureSchema="ams"
                    bsCols="tag_no,tag_date,part_no,part_name,supplier_name,area_code,area_name,location,audit,remark,double_check,create_by,create_date,update_by,update_date"
                    selectedRows={selectedRows}
                    bsShowRowNumber={true}
                    showAdd={false}
                    bsVisibleDelete={false}
                    bsLocale="en"
                    bsAllowAdd={true}
                    bsAllowEdit={true}
                    bsAllowDelete={true}
                    bsPageSize={25}
                    bsFilterMode="client"
                    bsVisibleEdit={false}
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