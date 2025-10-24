import React, { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Divider,
    Button,
    TextField,
    Stack,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";


const TagPage = () => {
    const [selectedRows, setSelectedRows] = useState([]);
    // ✅ state เก็บค่าฟิลเตอร์
    const [filters, setFilters] = useState({
        partNo: "",
        partName: "",
        supplierName: "",
        tagNo: "",
    });


    // ✅ ปุ่มพิมพ์ tag
    const handlePrintTag = () => {
        console.log("Print tag clicked");
        // TODO: logic สำหรับพิมพ์ tag
    };

    return (
        <>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Master Tag
                </Typography>
                {/* ปุ่ม Import / Print Tag */}
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
                {/* ตารางข้อมูล */}
                <BSDataGrid
                    bsLocale="en"
                    bsPreObj="ams"
                    bsObj="tbm_tag"
                    showAdd={false}
                    bsVisibleDelete={false}
                    bsCols="tag_no,tag_date,part_no,part_name,supplier_name,area_code,area_name,location,audit,remark,double_check,create_by,create_date,update_by,update_date"
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