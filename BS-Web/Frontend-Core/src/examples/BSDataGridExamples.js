import React, { useState } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import BSDataGrid from "../components/BSDataGrid";

/**
 * ตัวอย่างการใช้งาน BSDataGrid
 */
const BSDataGridExamples = () => {
  const [selectedRows, setSelectedRows] = useState([]);

  // ตัวอย่าง 1: การใช้งานพื้นฐาน
  const BasicExample = () => (
    <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
      <Typography variant="h6" gutterBottom>
        1. การใช้งานพื้นฐาน
      </Typography>
      <BSDataGrid bsObj="t_tmt_holiday" height={400} />

      <BSDataGrid bsPreObj="sec" bsObj="t_com_user_group" height={400} />

      <BSDataGrid
        bsPreObj="sec"
        bsObj="t_com_user_group"
        bsCols="name,description,is_active,create_by,create_date,update_by,update_date"
        bsObjBy="name asc"
        bsRowPerPage={25}
        bsShowDescColumn={false}
        bsBulkAdd={true}
        bsComboBox={[
          {
            Column: "app_id",
            Display: "application_name",
            Value: "app_id",
            Default: "--- Select Application ---",
            PreObj: "sec",
            Obj: "t_com_application",
            ObjWh: "is_active='YES'",
            ObjBy: "application_name asc",
          },
        ]}
        onCheckBoxSelected={(rows) => {
          console.log("Selected rows:", rows);
          setSelectedRows(rows);
        }}
        //   onEdit={(row) => console.log("Edit:", row)}
        //   onDelete={(id) => console.log("Delete:", id)}
        //   onAdd={() => console.log("Add new record")}
        height={500}
      />
    </Paper>
  );

  // ตัวอย่าง 2: การใช้งานแบบเต็มรูปแบบ
  const AdvancedExample = () => (
    <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
      <Typography variant="h6" gutterBottom>
        2. การใช้งานแบบเต็มรูปแบบ
      </Typography>
      <BSDataGrid
        bsLocale="th"
        bsPreObj="tmt"
        bsObj="t_tmt_customer"
        bsCols="customer_id,customer_name,email,phone,create_date"
        bsObjBy="customer_name asc, create_date desc"
        bsObjWh="is_active='YES'"
        bsPinColsLeft="customer_id,customer_name"
        bsPinColsRight="actions"
        bsRowPerPage={25}
        bsBulkEdit={true}
        bsBulkAdd={true}
        bsShowDescColumn={false}
        bsComboBox={[
          {
            Column: "status",
            Display: "name",
            Value: "id",
            Default: "--- Select Status ---",
            PreObj: "default",
            Obj: "t_wms_status",
            ObjWh: "active=1",
            ObjBy: "name asc",
            valueOptions: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "pending", label: "Pending" },
            ],
          },
        ]}
        onCheckBoxSelected={(rows) => {
          console.log("Selected rows:", rows);
          setSelectedRows(rows);
        }}
        onEdit={(row) => console.log("Edit:", row)}
        onDelete={(id) => console.log("Delete:", id)}
        onAdd={() => console.log("Add new record")}
        height={500}
      />
    </Paper>
  );

  // ตัวอย่าง 3: ใช้กับ Legacy API
  const LegacyExample = () => (
    <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
      <Typography variant="h6" gutterBottom>
        3. ใช้กับ Legacy API (เก่า)
      </Typography>
      <BSDataGrid
        tableName="t_tmt_customer"
        onEdit={(row) => console.log("Legacy Edit:", row)}
        onDelete={(id) => console.log("Legacy Delete:", id)}
        onAdd={() => console.log("Legacy Add")}
        height={400}
      />
    </Paper>
  );

  // ตัวอย่าง 4: Read-only mode
  const ReadOnlyExample = () => (
    <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
      <Typography variant="h6" gutterBottom>
        4. Read-only Mode
      </Typography>
      <BSDataGrid
        bsObj="t_tmt_customer"
        readOnly={true}
        showAdd={false}
        bsCols="customer_name,email,phone"
        height={350}
      />
    </Paper>
  );

  // ตัวอย่าง 5: Bulk Operations
  const BulkExample = () => (
    <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
      <Typography variant="h6" gutterBottom>
        5. Bulk Operations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Selected rows: {selectedRows.length}
      </Typography>
      <BSDataGrid
        bsObj="t_tmt_customer"
        bsBulkEdit={true}
        bsBulkAdd={true}
        onCheckBoxSelected={setSelectedRows}
        height={400}
      />
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        BSDataGrid Examples
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        ตัวอย่างการใช้งาน BSDataGrid ในรูปแบบต่างๆ
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <BasicExample />
      <AdvancedExample />
      <LegacyExample />
      <ReadOnlyExample />
      <BulkExample />

      {/* Debug Info */}
      <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
        <Typography variant="h6" gutterBottom>
          Debug Information
        </Typography>
        <Typography variant="body2">
          Selected Rows Count: {selectedRows.length}
        </Typography>
        <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "200px" }}>
          {JSON.stringify(selectedRows, null, 2)}
        </pre>
      </Paper>
    </Box>
  );
};

export default BSDataGridExamples;
