import React, { useState, useCallback, useRef } from "react";
import { Typography, Box, Paper, Chip } from "@mui/material";
import { Inventory } from "@mui/icons-material";
import BSDataGrid from "../../components/BSDataGrid";

const PartPage = () => {
  const dataGridRef = useRef();
  //  dataGridRef.current
  // ===============================
  // 📊 State สำหรับเก็บข้อมูล summary
  // ===============================
  const [totals, setTotals] = useState({ qty: 0 });

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
          ref={dataGridRef}
          bsStoredProcedure="usp_tbm_part"
          bsStoredProcedureSchema="ams"
          bsShowRowNumber={true}
          showAdd={false}
          bsCols="part_no,part_name,supplier_name,unit_price,snp,area_code,area_name,qty,create_by,create_date,update_by,update_date"
          bsLocale="en"
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          bsRowPerPage={20}
          bsPageSizeOptions={[20,100, 200, 500, 1000]}
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
            {
              field: "area_name",
              readOnly: true,
            },
          ]}
        />

        {/* สรุปผลรวม */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            mt: 2,
          }}
        >
          <Chip
            icon={<Inventory />}
            label={`Total Qty: ${totals.qty.toLocaleString()}`}
            color="primary"
            variant="outlined"
            sx={{
              fontSize: "0.95rem",
              color: "black",
              px: 1,
              py: 2,
            }}
          />
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
