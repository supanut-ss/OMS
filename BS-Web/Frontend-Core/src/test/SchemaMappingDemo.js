import React from "react";
import { Box, Typography, Paper, Divider, Alert } from "@mui/material";
import BSDataGrid from "../components/BSDataGrid";

/**
 * Comprehensive test of the schema mapping fix
 */
const SchemaMappingDemo = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Schema Mapping Fix Demonstration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This page demonstrates the fix for the schema mapping issue where
        <code>bsPreObj="sec"</code> was incorrectly using{" "}
        <code>schemaName=tmt</code>
        instead of <code>schemaName=sec</code> in API calls.
      </Alert>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Check the browser console for API calls. You should see logs with "🗺️
        Using preObj schema mapping" showing the correct schema being used based
        on the bsPreObj parameter.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Test 1: Using dbo schema (should work) */}
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <Typography variant="h6" gutterBottom>
          Test 1: bsPreObj="dbo" (t_com_user table exists in dbo schema)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Expected API call:{" "}
          <code>GET /dynamic/metadata/t_com_user?schemaName=dbo</code>
        </Typography>
        <BSDataGrid bsPreObj="dbo" bsObj="t_com_user" height={300} />
      </Paper>

      {/* Test 2: Using default mapping */}
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <Typography variant="h6" gutterBottom>
          Test 2: bsPreObj="default" (maps to tmt schema)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Expected API call:{" "}
          <code>GET /dynamic/metadata/t_tmt_holiday?schemaName=tmt</code>
        </Typography>
        <BSDataGrid bsPreObj="default" bsObj="t_tmt_holiday" height={300} />
      </Paper>

      {/* Test 3: Original problem case */}
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <Typography variant="h6" gutterBottom>
          Test 3: bsPreObj="sec" (The original problematic case)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Expected API call:{" "}
          <code>GET /dynamic/metadata/t_com_user?schemaName=sec</code>
          <br />
          <strong>Note:</strong> This may fail if t_com_user doesn't exist in
          sec schema, but the important thing is that it's now using the correct
          schema name.
        </Typography>
        <BSDataGrid bsPreObj="sec" bsObj="t_com_user" height={300} />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
        <Typography variant="h6" gutterBottom>
          Debug Information
        </Typography>
        <Typography variant="body2">
          <strong>Fixed Issue:</strong> Previously, the bsPreObj parameter was
          ignored when loading metadata, causing all API calls to use the
          default schema (tmt) regardless of the bsPreObj value.
          <br />
          <br />
          <strong>Solution:</strong> Created a schema mapping utility that maps
          bsPreObj values to actual schema names:
          <ul>
            <li>
              <code>bsPreObj="default"</code> → <code>schemaName="tmt"</code>
            </li>
            <li>
              <code>bsPreObj="sec"</code> → <code>schemaName="sec"</code>
            </li>
            <li>
              <code>bsPreObj="dbo"</code> → <code>schemaName="dbo"</code>
            </li>
            <li>
              <code>bsPreObj="tmt"</code> → <code>schemaName="tmt"</code>
            </li>
          </ul>
          <br />
          <strong>Files Modified:</strong>
          <ul>
            <li>
              Created: <code>src/utils/SchemaMapping.js</code>
            </li>
            <li>
              Modified: <code>src/hooks/useDynamicCrud.js</code>
            </li>
            <li>
              Modified: <code>src/components/BSDataGrid.js</code>
            </li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
};

export default SchemaMappingDemo;
