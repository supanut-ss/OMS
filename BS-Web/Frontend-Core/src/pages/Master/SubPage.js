import React, { useState } from "react";
import {
    Typography,
    Paper,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BsAutoComplete from "../../components/BSAutoComplete";

const SubPage = () => {
    // ===============================
    // 📊 State สำหรับ Dialog และแบบฟอร์ม
    // ===============================
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [single, setSingle] = useState("");
    const [form, setForm] = useState({
        sub_no: "",
        part_no: "",
        part_name: "",
        area_name: "",
    });

    // ===============================
    // ✏️ ฟังก์ชันเปิด Dialog สำหรับแก้ไข
    // ===============================
    const handleOpenEdit = (row) => {
        setForm(row);
        setEditMode(true);
        setOpen(true);
    };

    // ปิด Dialog
    const handleClose = () => {
        setOpen(false);
        setEditMode(false);
        setForm({
            sub_no: "",
            part_no: "",
            part_name: "",
            area_name: "",
        });
    };

    // เมื่อพิมพ์ใน TextField
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // กด Save
    const handleSave = () => {
        console.log(editMode ? "Updating..." : "Creating...", form);
        handleClose();
    };

    // ===============================
    // 🧩 UI
    // ===============================
    return (
        <>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Master Sub
                </Typography>

                {/* ตารางข้อมูล */}
                <BSDataGrid
                    bsStoredProcedure="usp_tbm_sub"
                    bsStoredProcedureSchema="ams"
                    bsShowRowNumber={true}
                    bsCols="sub_no,part_no,part_name,supplier_name,create_by,create_date,update_by,update_date"
                    bsLocale="en"
                    bsAllowAdd={true}
                    bsAllowEdit={true}
                    bsAllowDelete={true}
                    bsPageSize={25}
                    bsFilterMode="client"
                    onEdit={handleOpenEdit}
                    showAdd={false}
                    bsVisibleEdit={false}
                    bsVisibleDelete={false}
                // bsBulkEdit={true}

                />
            </Paper>

            {/* Dialog แก้ไขข้อมูล */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{editMode ? "Edit Sub" : "Add Sub"}</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ mt: 1 }}>
                        {/* Row 1 */}
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                sx={{ flex: 1 }}
                                label="Sub No"
                                name="sub_no"
                                value={form.sub_no}
                                onChange={handleChange}
                                disabled={editMode}
                            />
                            <Box sx={{ flex: 1 }}>
                                <BsAutoComplete
                                    bsMode="single"
                                    bsTitle="Select Part No"
                                    bsPreObj="ams.tbm_"
                                    bsObj="part"
                                    bsColumes={[
                                        { field: "part_no", display: false, filter: false, key: true },
                                        { field: "part_no", display: true, filter: true, key: false }
                                    ]}
                                    bsObjBy=""
                                    bsObjWh=""
                                    bsValue={single} // ค่าเริ่มต้น = code ของ option
                                    bsOnChange={(val) => {
                                        console.log(val);
                                        setSingle(val)
                                    }}
                                    bsLoadOnOpen={true}
                                />
                            </Box>


                        </Box>

                        {/* Row 2 */}
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                sx={{ flex: 1 }}
                                label="Part Name"
                                name="part_name"
                                value={form.part_name}
                                onChange={handleChange}
                                disabled={editMode}
                            />
                            <TextField
                                sx={{ flex: 1 }}
                                label="Supplier Name"
                                name="supplier_name"
                                value={form.supplier_name}
                                onChange={handleChange}
                                disabled={editMode}
                            />
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        {editMode ? "Save" : "Add"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SubPage;
