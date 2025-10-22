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

const SubPage = () => {
    const [selectedRows, setSelectedRows] = useState([]);

    // ✅ state เก็บค่าฟิลเตอร์
    const [filters, setFilters] = useState({
        partNo: "",
        partName: "",
        subNo: "",
    });

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Master Sub
            </Typography>

            {/* ตารางข้อมูล */}
            <BSDataGrid
                bsLocale="en"
                bsPreObj="ams"
                bsObj="tbm_sub"
                bsCols="sub_no,part_no,part_name,supplier_name,create_by,create_date,update_by,update_date"
                showAdd={false}
                bsVisibleDelete={false}
            />
        </Paper>
    );
};

export default SubPage;
