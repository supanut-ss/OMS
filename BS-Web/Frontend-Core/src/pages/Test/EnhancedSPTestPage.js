import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import Logger from "../../utils/logger";

/**
 * Test page for Enhanced Stored Procedure with metadata support
 */
const EnhancedSPTestPage = () => {
  const [error, setError] = useState(null);

  const handleError = (err) => {
    Logger.error("❌ Enhanced SP Test Error:", err);
    setError(err?.message || "An error occurred");
  };

  const handleEdit = (row) => {
    Logger.log("🔧 Edit operation:", row);
  };

  const handleDelete = (id) => {
    Logger.log("🗑️ Delete operation:", id);
  };

  const handleAdd = () => {
    Logger.log("➕ Add operation");
  };

  const handleCheckBoxSelected = (selectedRows) => {
    Logger.log("☑️ Selected rows:", selectedRows);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Enhanced Stored Procedure Test with Metadata
      </Typography>

      <Grid container spacing={3}>
        {/* Info Cards */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Features
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip label="Primary Key Detection" color="primary" />
                <Chip label="Column Metadata" color="primary" />
                <Chip label="Data Type Formatting" color="primary" />
                <Chip label="Auto Column Hiding" color="primary" />
                <Chip label="CRUD Operations" color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Display */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}

        {/* Enhanced SP DataGrid Test */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Enhanced SP: ams.usp_tbm_part
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This test uses the Enhanced Stored Procedure that returns metadata
              from usf_get_column_metadata. Primary keys should be automatically
              detected and hidden from the DataGrid.
            </Typography>

            <Box sx={{ height: 600, mt: 2 }}>
              <BSDataGrid
                bsStoredProcedure="usp_tbm_part"
                bsStoredProcedureSchema="ams"
                bsStoredProcedureParams={{
                  Operation: "SELECT",
                }}
                bsRowPerPage={25}
                bsBulkEdit={true}
                bsBulkAdd={true}
                bsBulkDelete={true}
                bsShowCheckbox={true}
                bsShowRowNumber={true}
                bsVisibleEdit={true}
                bsVisibleDelete={true}
                bsShowCharacterCount={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAdd={handleAdd}
                onCheckBoxSelected={handleCheckBoxSelected}
                onError={handleError}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Debug Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Debug Information
              </Typography>
              <Typography variant="body2">
                Check the browser console for detailed logging about:
              </Typography>
              <ul>
                <li>Metadata extraction from Enhanced SP</li>
                <li>Primary key detection from metadata</li>
                <li>Column hiding based on primary keys</li>
                <li>Data type formatting</li>
                <li>CRUD operation parameters</li>
              </ul>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default EnhancedSPTestPage;
