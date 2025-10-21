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

const MethodPage = () => {
    const [selectedRows, setSelectedRows] = useState([]);

    // ✅ state เก็บค่าฟิลเตอร์
    const [filters, setFilters] = useState({
        method: "",
    });


    return (
        <>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Master Method
                </Typography>
                {/* ตารางข้อมูล */}
                <BSDataGrid
                    bsLocale="th"
                    bsPreObj="ams"
                    bsObj="tbm_method"
                    onCheckBoxSelected={(rows) => setSelectedRows(rows)}
                    height={500}
                />
            </Paper>
        </>
    );
};

export default MethodPage;
