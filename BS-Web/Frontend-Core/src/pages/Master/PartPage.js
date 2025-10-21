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

const PartPage = () => {
    const [filters, setFilters] = useState({
        partNo: "",
        partName: "",
        area: "",
    });

    const [selectedRows, setSelectedRows] = useState([]);
    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Master Part
            </Typography>
            {/* ตารางข้อมูล */}
            <BSDataGrid
                bsLocale="th"
                bsPreObj="ams"
                bsObj="tbm_part"
                onCheckBoxSelected={(rows) => setSelectedRows(rows)}
                height={500}
            />
        </Paper>
    );
};

export default PartPage;
