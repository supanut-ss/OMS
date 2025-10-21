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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleSearch = () => {
        console.log("Searching with:", filters);
        // TODO: เรียก API เพื่อค้นหาข้อมูล
    };

    const handleClear = () => {
        setFilters({ partNo: "", partName: "", area: "" });
    };

    const handleImport = () => {
        console.log("Import Excel clicked");
        // TODO: เพิ่มฟังก์ชัน upload Excel
    };


    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Masters &gt; Part
            </Typography>

            {/* ปุ่ม Import Excel */}
            <Box mb={2}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleImport}
                    sx={{ mb: 2 }}
                >
                    Import Excel
                </Button>
            </Box>

            {/* ฟอร์มค้นหา */}
            <Stack spacing={2} mb={2}>
                {/* ช่องกรอกข้อมูล */}
                <Stack direction="row" spacing={2}>
                    <TextField
                        label="Part No"
                        name="partNo"
                        value={filters.partNo}
                        onChange={handleChange}
                        size="small"
                    />
                    <TextField
                        label="Part Name"
                        name="partName"
                        value={filters.partName}
                        onChange={handleChange}
                        size="small"
                    />
                    <TextField
                        label="Area"
                        name="area"
                        value={filters.area}
                        onChange={handleChange}
                        size="small"
                    />
                </Stack>

                {/* ปุ่ม Search / Clear แยกลงมา */}
                <Stack direction="row" spacing={2}>
                    <Button variant="contained" color="primary" onClick={handleSearch}>
                        Search
                    </Button>
                    <Button variant="outlined" onClick={handleClear}>
                        Clear
                    </Button>
                </Stack>
            </Stack>

            <Divider sx={{ mb: 2 }} />

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
