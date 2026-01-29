import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import BSDataGrid from "../components/BSDataGrid";

const TestBSDataGrid = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        BSDataGrid Test Page
      </Typography>

      <Typography variant="body1" paragraph>
        This page tests the BSDataGrid component with both Pro and Community
        versions of MUI X.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <Typography variant="h6" gutterBottom>
          Test 1: Basic BSDataGrid with Backend API
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          This should attempt to connect to the backend API. If connection
          fails, it will show offline mode.
        </Typography>
        <Box sx={{ height: 400 }}>
          <BSDataGrid
            bsObj="sec.t_com_user_group"
            bsCols="name"
            bsRowPerPage={10}
            showToolbar={true}
            showAdd={true}
            bsBulkEdit={true}
            bsBulkAdd={true}
            bsFilterMode="server"
            // onAdd={() => console.log("Add clicked")}
            // onEdit={(row) => console.log("Edit:", row)}
            // onDelete={(id) => console.log("Delete:", id)}
            onCheckBoxSelected={(rows) => console.log("Selected:", rows)}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <Typography variant="h6" gutterBottom>
          Test 2: BSDataGrid with Limited Columns
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Test column filtering with bsCols property.
        </Typography>
        <Box sx={{ height: 400 }}>
          <BSDataGrid
            bsObj="t_tmt_customer"
            bsCols="customer_name,email,phone"
            bsRowPerPage={5}
            showToolbar={true}
            bsBulkEdit={false}
            bsBulkAdd={false}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          License Status Check
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Check the browser console for license configuration messages. The
          DataGrid should automatically fallback to community version if Pro
          license fails.
        </Typography>
        <Typography variant="body2">
          Environment License Key:{" "}
          {process.env.REACT_APP_MUI_X_LICENSE_KEY
            ? "✅ Present"
            : "❌ Missing"}
        </Typography>
      </Paper>
    </Box>
  );
};

export default TestBSDataGrid;
