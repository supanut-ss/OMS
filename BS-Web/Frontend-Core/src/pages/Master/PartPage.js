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





    const handleOpenDelete = async (payload) => {
        try {
            console.log("onDelete payload:", payload);

            // รองรับหลายรูปแบบ: payload เป็น string/number (part_no) หรือ object ที่มี .row / .data / .id / ชื่อฟิลด์ต่างๆ
            const source = payload?.row ?? payload?.data ?? payload;
            const part_no =
                (typeof source === "string" || typeof source === "number") ? String(source) : source?.part_no
            if (!part_no) {
                alert("ไม่พบ part_no ที่จะลบ — ตรวจสอบ console.log รูปร่างของ payload");
                return;
            }

            // เรียก API ตรวจสอบ tbm_sub ว่ามีรายการที่เชื่อมกับ part_no หรือไม่
            const checkRes = await fetch(`/api/tbm_sub/count?part_no=${encodeURIComponent(part_no)}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!checkRes.ok) throw new Error("ไม่สามารถตรวจสอบข้อมูลใน tbm_sub ได้");

            const checkData = await checkRes.json();
            const count = typeof checkData.count === "number" ? checkData.count : (Array.isArray(checkData) ? checkData.length : 0);

            if (count > 0) {
                alert(`ไม่สามารถลบ part_no: ${part_no} เนื่องจากมี ${count} รายการที่เชื่อมโยงใน tbm_sub`);
                return;
            }

            if (!window.confirm(`ยืนยันการลบ part_no: ${part_no} ?`)) return;

            const delRes = await fetch(`/api/tbm_part/${encodeURIComponent(part_no)}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (!delRes.ok) throw new Error("ลบข้อมูลไม่สำเร็จ");

            alert("ลบข้อมูลสำเร็จ");
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการลบข้อมูล");
        }
    };

    const handleOpenEdit = async (row) => {
        try {

        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
        }
    };



    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Master Part
            </Typography>
            {/* ตารางข้อมูล */}
            <BSDataGrid
                bsLocale="en"
                bsPreObj="ams"
                bsObj="tbm_part"
                // showAdd={false}
                bsCols="part_no,part_name,supplier_name,unit_price,snp,area_code,area_name,qty,create_by,create_date,update_by,update_date"
                onDelete={handleOpenDelete}
                onEdit={handleOpenEdit}
            />
        </Paper>
    );
};

export default PartPage;
