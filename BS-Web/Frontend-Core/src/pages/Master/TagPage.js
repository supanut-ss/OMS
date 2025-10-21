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

    // ✅ ฟังก์ชันเปลี่ยนค่า input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    // ✅ ปุ่มค้นหา
    const handleSearch = () => {
        console.log("Searching with:", filters);
        // TODO: เขียน logic เรียก API เพื่อค้นหาข้อมูล
    };

    // ✅ ปุ่มล้างข้อมูล
    const handleClear = () => {
        setFilters({
            partNo: "",
            partName: "",
            supplierName: "",
            tagNo: "",
        });
    };

    // ✅ ปุ่ม import excel
    const handleImport = () => {
        console.log("Import Excel clicked");
        // TODO: เพิ่มฟังก์ชัน upload Excel
    };

    // ✅ ปุ่มพิมพ์ tag
    const handlePrintTag = () => {
        console.log("Print tag clicked");
        // TODO: logic สำหรับพิมพ์ tag
    };

    return (
        <>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Masters &gt; Tag
                </Typography>
                {/* ปุ่ม Import / Print Tag */}
                <Box mb={2} display="flex" gap={2}>
                    <Button variant="contained" color="primary" onClick={handleImport}>
                        Import Excel
                    </Button>
                    <Button variant="outlined" color="secondary" onClick={handlePrintTag}>
                        Print Tag
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
                            label="Supplier Name"
                            name="supplierName"
                            value={filters.supplierName}
                            onChange={handleChange}
                            size="small"
                        />
                        <TextField
                            label="Tag No"
                            name="tagNo"
                            value={filters.tagNo}
                            onChange={handleChange}
                            size="small"
                        />
                    </Stack>

                    {/* ปุ่ม Search / Clear */}
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


                <BSDataGrid
                    bsLocale="th"
                    bsPreObj="ams"
                    bsObj="tbm_tag"
                // bsCols="user_id,first_name,last_name,locale_id,domain,is_active,create_by,create_date,update_by,update_date"
                // bsObjBy="user_id asc"
                // //   bsObjWh="status='active'"
                // bsPinColsLeft="user_id,first_name,last_name"
                // bsPinColsRight="actions"
                // bsRowPerPage={20}
                // bsBulkEdit={true}
                // bsBulkAdd={true}
                // bsShowDescColumn={false}
                // onCheckBoxSelected={(rows) => {
                //     console.log("Selected rows:", rows);
                //     setSelectedRows(rows);
                // }}
                // onEdit={(row) => console.log("Edit:", row)}
                // onDelete={(id) => console.log("Delete:", id)}
                // onAdd={() => console.log("Add new record")}
                // height={500}
                />
            </Paper>
        </>
    );
};

export default TagPage;