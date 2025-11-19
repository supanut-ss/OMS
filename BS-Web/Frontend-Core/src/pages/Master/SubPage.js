import React, { useState, useEffect } from "react";
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
import { useResource } from "../../hooks/useResource";

const SubPage = (props) => {
    // ===============================
    // 🌐 Lang / Resource
    // ===============================
    const { getResource, getResources } = useResource();
    const [resourceData, setResourceData] = useState([]);

    const getLang = async () => {
        try {
            // ตั้ง key group ชื่อ "Sub" (คุณจะตั้งเป็นอะไรก็ได้ แต่ต้องตรงกับฝั่ง resource)
            const res = await getResources("Sub");
            setResourceData(res);
        } catch (error) {
            console.error("getResources(Sub) error:", error);
        }
    };

    useEffect(() => {
        getLang();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.lang]);

    // ===============================
    // 📊 State สำหรับ Dialog และแบบฟอร์ม
    // ===============================
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // เก็บค่าที่เลือกจาก AutoComplete
    const [selectedPart, setSelectedPart] = useState(null);

    const [form, setForm] = useState({
        sub_no: "",
        part_no: "",
        part_name: "",
        supplier_name: "",
    });

    // ===============================
    // ✏️ ฟังก์ชันเปิด Dialog สำหรับแก้ไข
    // ===============================
    const handleOpenEdit = (row) => {
        setForm({
            sub_no: row.sub_no ?? "",
            part_no: row.part_no ?? "",
            part_name: row.part_name ?? "",
            supplier_name: row.supplier_name ?? "",
        });
        setEditMode(true);
        setOpen(true);
    };

    // ถ้าจะเปิดแบบ Add จากปุ่มอื่นในอนาคต เรียกอันนี้
    const handleOpenAdd = () => {
        setForm({
            sub_no: "",
            part_no: "",
            part_name: "",
            supplier_name: "",
        });
        setSelectedPart(null);
        setEditMode(false);
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
            supplier_name: "",
        });
        setSelectedPart(null);
    };

    // เมื่อพิมพ์ใน TextField
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // กด Save
    const handleSave = () => {
        console.log(editMode ? "Updating..." : "Creating...", form);
        // TODO: เรียก API สำหรับ Insert/Update ผ่าน Stored Procedure ที่ BSDataGrid ใช้อยู่
        handleClose();
    };

    // เมื่อเลือก Part จาก AutoComplete
    const handlePartChange = (val) => {
        setSelectedPart(val);

        // val น่าจะมี field ตามที่กลับมาจาก view/obj: part_no, part_name, supplier_name ฯลฯ
        if (val) {
            setForm((prev) => ({
                ...prev,
                part_no: val.part_no ?? prev.part_no,
                part_name: val.part_name ?? prev.part_name,
                supplier_name: val.supplier_name ?? prev.supplier_name,
            }));
        }
    };

    // ===============================
    // 🧩 UI
    // ===============================
    return (
        <>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {getResource(resourceData, "Master Sub") || "Master Sub"}
                </Typography>

                {/* ตารางข้อมูล */}
                <BSDataGrid
                    bsStoredProcedure="usp_tbm_sub"
                    bsStoredProcedureSchema="ams"
                    bsShowRowNumber={true}
                    bsCols="sub_no,part_no,part_name,supplier_name,create_by,create_date,update_by,update_date"
                    bsLocale={props.lang || "en"}
                    bsAllowAdd={true}
                    bsAllowEdit={true}
                    bsAllowDelete={true}
                    bsRowPerPage={20}
                    bsPageSizeOptions={[20, 100, 200, 500, 1000]}
                    bsFilterMode="client"
                    onEdit={handleOpenEdit}
                    // ถ้าคุณมีปุ่ม Add เอง อาจจะใช้ onAdd แล้วไปเรียก handleOpenAdd
                    showAdd={false}
                    bsVisibleEdit={false}
                    bsVisibleDelete={false}
                // ถ้าต้องการใช้ bulkEdit:
                // bsBulkEdit={true}
                />
            </Paper>

            {/* Dialog แก้ไขข้อมูล */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editMode
                        ? getResource(resourceData, "Edit Sub") || "Edit Sub"
                        : getResource(resourceData, "Add Sub") || "Add Sub"}
                </DialogTitle>

                <DialogContent>
                    <Box component="form" sx={{ mt: 1 }}>
                        {/* Row 1 */}
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                sx={{ flex: 1 }}
                                label={getResource(resourceData, "Sub No") || "Sub No"}
                                name="sub_no"
                                value={form.sub_no}
                                onChange={handleChange}
                                disabled={editMode} // ถ้าไม่อยาก lock ตอน Edit ก็เปลี่ยนเป็น false
                            />
                            <Box sx={{ flex: 1 }}>
                                <BsAutoComplete
                                    bsMode="single"
                                    bsTitle={getResource(resourceData, "Select Part No") || "Select Part No"}
                                    bsPreObj="ams.tbm_"
                                    bsObj="part"
                                    bsColumes={[
                                        {
                                            field: "part_no",
                                            display: false,
                                            filter: false,
                                            key: true,
                                        },
                                        {
                                            field: "part_no",
                                            display: true,
                                            filter: true,
                                            key: false,
                                        },
                                        {
                                            field: "part_name",
                                            display: true,
                                            filter: true,
                                            key: false,
                                        },
                                    ]}
                                    bsObjBy="part_no asc"
                                    bsObjWh=""
                                    bsValue={selectedPart}
                                    bsOnChange={handlePartChange}
                                    bsLoadOnOpen={true}
                                />
                            </Box>
                        </Box>

                        {/* Row 2 */}
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                sx={{ flex: 1 }}
                                label={getResource(resourceData, "Part Name") || "Part Name"}
                                name="part_name"
                                value={form.part_name}
                                onChange={handleChange}
                                disabled={editMode} // หรือจะให้แก้ก็ได้ เปลี่ยนเป็น false
                            />
                            <TextField
                                sx={{ flex: 1 }}
                                label={getResource(resourceData, "Supplier Name") || "Supplier Name"}
                                name="supplier_name"
                                value={form.supplier_name}
                                onChange={handleChange}
                                disabled={editMode}
                            />
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose}>
                        {getResource(resourceData, "Cancel") || "Cancel"}
                    </Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        {editMode
                            ? getResource(resourceData, "Save") || "Save"
                            : getResource(resourceData, "Add") || "Add"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SubPage;
