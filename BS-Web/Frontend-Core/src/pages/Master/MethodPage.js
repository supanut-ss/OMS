import React from "react";
import {
    Typography,
    Paper,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const MethodPage = () => {


    const handleOpenDelete = async (payload) => {
        try {
            console.log("onDelete payload:", payload);
            // ที่นี่สามารถเพิ่ม logic ลบข้อมูลได้ เช่น call API delete
        } catch (error) {
            console.error("Error in handleOpenDelete:", error);
            alert("เกิดข้อผิดพลาดในการลบข้อมูล");
        }
    };



    return (
        <>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Master Method
                </Typography>
                {/* ตารางข้อมูล */}
                <BSDataGrid
                    bsLocale="en"
                    bsPreObj="ams"
                    bsObj="tbm_method"
                    bsCols="method,create_by,create_date,update_by,update_date"
                    onDelete={handleOpenDelete}

                />
            </Paper>
        </>
    );
};

export default MethodPage;
