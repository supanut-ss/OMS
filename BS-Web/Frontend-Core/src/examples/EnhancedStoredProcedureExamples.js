import React from "react";
import BSDataGrid from "../components/BSDataGrid";
import { Container, Typography, Paper, Box, Alert } from "@mui/material";

/**
 * Enhanced Stored Procedure Examples for BSDataGrid
 *
 * This file demonstrates how to use BSDataGrid with Enhanced Stored Procedures
 * that support SELECT, UPDATE, DELETE operations in a single stored procedure.
 */

export const EnhancedStoredProcedureExamples = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        📋 Enhanced Stored Procedure Examples
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Enhanced Stored Procedures</strong> allow you to create a
          single stored procedure that handles SELECT, INSERT, UPDATE, and
          DELETE operations. This approach provides better control over business
          logic and data validation directly in the database.
        </Typography>
      </Alert>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom color="primary">
          🧑‍💼 Example 1: Customer Management
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Uses <code>sp_enhanced_customer_management</code> stored procedure
          with pagination and filtering.
        </Typography>

        <Box sx={{ height: 600, width: "100%" }}>
          <BSDataGrid
            bsStoredProcedure="sp_enhanced_customer_management"
            bsStoredProcedureSchema="dbo"
            bsStoredProcedureParams={{
              Status: "Active", // Additional filter parameter
            }}
            bsRowPerPage={15}
            bsShowRowNumber={true}
            bsShowCheckbox={true}
            bsBulkEdit={true}
            bsBulkDelete={true}
            bsAllowAdd={true}
            bsAllowEdit={true}
            bsAllowDelete={true}
            onCheckBoxSelected={(selectedRows) =>
              console.log("Selected customers:", selectedRows)
            }
          />
        </Box>
      </Paper>

      {/* Example 2: Product Management */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom color="primary">
          📦 Example 2: Product Management
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Uses <code>sp_enhanced_product_management</code> with advanced search
          capabilities.
        </Typography>

        <Box sx={{ height: 600, width: "100%" }}>
          <BSDataGrid
            bsStoredProcedure="sp_enhanced_product_management"
            bsStoredProcedureSchema="dbo"
            bsRowPerPage={25}
            bsShowDescColumn={true}
            bsVisibleEdit={true}
            bsVisibleDelete={true}
            bsAllowAdd={true}
            bsAllowEdit={true}
            bsAllowDelete={true}
            bsFilterMode="server"
          />
        </Box>
      </Paper>

      {/* Example 3: Order Management with Date Range */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom color="primary">
          📋 Example 3: Order Management with Date Range
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Uses <code>sp_enhanced_order_management</code> with custom date range
          parameters.
        </Typography>

        <Box sx={{ height: 600, width: "100%" }}>
          <BSDataGrid
            bsStoredProcedure="sp_enhanced_order_management"
            bsStoredProcedureSchema="dbo"
            bsStoredProcedureParams={{
              DateFrom: "2024-01-01",
              DateTo: "2024-12-31",
            }}
            bsRowPerPage={25}
            bsLocale="th" // Thai locale for date formatting
            bsShowRowNumber={true}
            bsShowCheckbox={false}
            bsVisibleEdit={true}
            bsVisibleDelete={false} // Hide delete for orders
            bsAllowAdd={true}
            bsAllowEdit={true}
            bsAllowDelete={false}
          />
        </Box>
      </Paper>

      {/* Example 4: Read-Only Data Display */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom color="primary">
          📊 Example 4: Read-Only Data Display
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Display data from stored procedure in read-only mode with custom
          parameters.
        </Typography>

        <Box sx={{ height: 400, width: "100%" }}>
          <BSDataGrid
            bsStoredProcedure="sp_enhanced_customer_management"
            bsStoredProcedureSchema="dbo"
            bsStoredProcedureParams={{
              Status: "All", // Show all statuses
            }}
            bsRowPerPage={10}
            bsShowRowNumber={false}
            bsShowCheckbox={false}
            bsVisibleEdit={false}
            bsVisibleDelete={false}
            readOnly={true}
            showAdd={false}
            bsBulkEdit={false}
            bsBulkDelete={false}
          />
        </Box>
      </Paper>

      {/* Usage Documentation */}
      <Paper elevation={3} sx={{ p: 3, backgroundColor: "#f5f5f5" }}>
        <Typography variant="h5" gutterBottom>
          📖 Usage Guide
        </Typography>

        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Basic Props for Enhanced Stored Procedures:
        </Typography>

        <Box
          component="pre"
          sx={{
            backgroundColor: "#fff",
            p: 2,
            borderRadius: 1,
            overflow: "auto",
            fontSize: "0.875rem",
            fontFamily: "monospace",
          }}
        >
          {`<BSDataGrid
  bsStoredProcedure="your_procedure_name"     // Required: SP name
  bsStoredProcedureSchema="dbo"               // Optional: Default "dbo"
  bsStoredProcedureParams={{                  // Optional: Custom parameters
    param1: "value1",
    param2: "value2"
  }}
  bsRowPerPage={25}                          // Optional: Page size
  bsLocale="th"                              // Optional: Locale
  bsShowRowNumber={true}                     // Optional: Row numbers
  bsShowCheckbox={true}                      // Optional: Selection
  bsVisibleEdit={true}                       // Optional: Edit button
  bsVisibleDelete={true}                     // Optional: Delete button
  bsBulkEdit={true}                          // Optional: Bulk edit
  bsBulkDelete={true}                        // Optional: Bulk delete
/>`}
        </Box>

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          Stored Procedure Requirements:
        </Typography>

        <Box component="ul" sx={{ pl: 2 }}>
          <li>
            Must accept <code>@Operation</code> parameter (SELECT, INSERT,
            UPDATE, DELETE)
          </li>
          <li>
            Must support pagination parameters: <code>@Page</code>,{" "}
            <code>@PageSize</code>
          </li>
          <li>
            Must support sorting: <code>@OrderBy</code>
          </li>
          <li>
            Must support filtering: <code>@FilterModel</code>
          </li>
          <li>
            Must have output parameters: <code>@OutputRowCount</code>,{" "}
            <code>@OutputMessage</code>
          </li>
          <li>
            Should support audit: <code>@UserId</code>
          </li>
        </Box>

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          Benefits:
        </Typography>

        <Box component="ul" sx={{ pl: 2 }}>
          <li>
            ✅ <strong>Single Point of Control:</strong> All operations in one
            stored procedure
          </li>
          <li>
            ✅ <strong>Business Logic in Database:</strong> Complex validation
            and rules
          </li>
          <li>
            ✅ <strong>Better Performance:</strong> Optimized queries and
            indexing
          </li>
          <li>
            ✅ <strong>Enhanced Security:</strong> Parameterized queries and
            access control
          </li>
          <li>
            ✅ <strong>Audit Trail:</strong> Built-in logging and tracking
          </li>
          <li>
            ✅ <strong>Data Consistency:</strong> Transaction control and
            constraints
          </li>
        </Box>
      </Paper>
    </Container>
  );
};

export default EnhancedStoredProcedureExamples;
