import React, { useState, useCallback, useRef } from "react";
import {
  Typography,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import axios from "axios";

const PartPage = () => {
  // ===============================
  // 📊 State สำหรับเก็บข้อมูล summary
  // ===============================
  const [totals, setTotals] = useState({ qty: 0 });
  const gridRef = useRef();
  // ===============================
  // 🧾 State สำหรับ Dialog และแบบฟอร์ม
  // ===============================
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    part_no: "",
    part_name: "",
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
    setForm({ part_no: "", part_name: "" });
  };

  // เมื่อพิมพ์ใน TextField
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // กด Save
  // 🔹 Save -> call API
  const handleSave = async () => {
    try {
      const payload = {
        Operation: editMode ? "UPDATE" : "INSERT",
        PartId: form.part_id || null,
        PartNo: form.part_no,
        PartName: form.part_name,
        SupplierName: form.supplier_name,
        UnitPrice: parseFloat(form.unit_price) || 0,
        Snp: parseInt(form.snp) || 0,
        AreaCode: form.area_code,
        AreaName: form.area_name,
        Qty: parseInt(form.qty) || 0,
        UserId: "admin",
      };

      const res = await axios.post("/api/part/save", payload);

      if (res.data.success) {
        alert(res.data.message || "Save successful");
        handleClose();
        gridRef.current?.reload?.();
      } else {
        alert("Error: " + res.data.message);
      }
    } catch (err) {
      console.error("❌ Save Error:", err);
      alert("Save failed: " + err.message);
    }
  };

  // ===============================
  // 📦 รับข้อมูลจาก BSDataGrid แล้วคำนวณผลรวม
  // ===============================
  const handleDataBind = useCallback((data) => {
    const totalQty = data.reduce((sum, row) => {
      const qty = parseFloat(row.qty) || 0;
      return sum + qty;
    }, 0);

    setTotals({ qty: totalQty });
  }, []);

  // ===============================
  // 🧩 UI
  // ===============================
  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Master Part
        </Typography>

        {/* ตารางข้อมูล */}
        <BSDataGrid
          bsStoredProcedure="usp_tbm_part"
          bsStoredProcedureSchema="ams"
          bsShowRowNumber={true}
          showAdd={false}
          bsCols="part_no,part_name,supplier_name,unit_price,snp,area_code,area_name,qty,create_by,create_date,update_by,update_date"
          bsLocale="en"
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          bsPageSize={25}
          bsFilterMode="client"
          bsVisibleDelete={false}
          onDataBind={handleDataBind}
          // onEdit={handleOpenEdit}
          bsColumnDefs={[
            {
              field: "part_no",
              // headerName: "Part No.",
              // width: 200,
              // type: "string",
              readOnly: true,
              // required: true,
              //description: "Part Number (ไม่สามารถแก้ไขได้)",
              // align: "left"
            },
            {
              field: "area_code",
              readOnly: true,
            },
          ]}
        />

        {/* สรุปผลรวม */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            textAlign: "right",
            px: 2,
            fontWeight: "bold",
          }}
        >
          <Typography variant="body1">
            Total Qty: {totals.qty.toLocaleString()}
          </Typography>
        </Box>
      </Paper>

      {/* <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit Part" : "Add Part"}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                sx={{ flex: 1 }}
                label="Part No"
                name="part_no"
                value={form.part_no}
                onChange={handleChange}
                disabled={editMode}
              />
              <TextField
                sx={{ flex: 1 }}
                label="Area Code"
                name="area_code"
                value={form.area_code}
                onChange={handleChange}
                disabled={editMode}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                sx={{ flex: 1 }}
                label="Part Name"
                name="part_name"
                value={form.part_name}
                onChange={handleChange}
              />
              <TextField
                sx={{ flex: 1 }}
                label="Area Name"
                name="area_name"
                value={form.area_name}
                onChange={handleChange}
                required
                disabled={editMode}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                sx={{ flex: 1 }}
                label="Supplier Name"
                name="supplier_name"
                value={form.supplier_name}
                onChange={handleChange}
                required
              />
              <TextField
                sx={{ flex: 1 }}
                label="QTY"
                name="qty"
                value={form.qty}
                onChange={handleChange}
                required
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                sx={{ flex: 1 }}
                label="unit Price"
                name="unit_price"
                value={form.unit_price}
                onChange={handleChange}
                required
              />
              <TextField
                sx={{ flex: 1 }}
                label="SNP"
                name="snp"
                value={form.snp}
                onChange={handleChange}

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
      </Dialog> */}
    </>
  );
};

export default PartPage;
