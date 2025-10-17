import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Button, Alert } from "@mui/material";
import { getSchemaFromPreObj } from "../utils/SchemaMapping";
import Logger from "../utils/logger";

/**
 * Test component to verify schema mapping functionality
 */
const SchemaTestPage = () => {
  const [testResults, setTestResults] = useState([]);

  const runTests = () => {
    Logger.log("🧪 Running schema mapping tests...");

    const tests = [
      {
        preObj: "sec",
        expected: "sec",
        description: "sec should map to sec schema",
      },
      {
        preObj: "default",
        expected: "tmt",
        description: "default should map to tmt schema",
      },
      {
        preObj: "tmt",
        expected: "tmt",
        description: "tmt should map to tmt schema",
      },
      {
        preObj: "dbo",
        expected: "dbo",
        description: "dbo should map to dbo schema",
      },
      {
        preObj: null,
        expected: "tmt",
        description: "null should default to tmt schema",
      },
      {
        preObj: "invalid",
        expected: "tmt",
        description: "invalid preObj should fallback to tmt schema",
      },
    ];

    const results = tests.map((test) => {
      const actual = getSchemaFromPreObj(test.preObj);
      const passed = actual === test.expected;

      Logger.log(`🧪 Test: ${test.description}`, {
        preObj: test.preObj,
        expected: test.expected,
        actual,
        passed,
      });

      return {
        ...test,
        actual,
        passed,
      };
    });

    setTestResults(results);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Schema Mapping Test
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Testing the schema mapping functionality for BSDataGrid preObj
        parameter.
      </Typography>

      <Button variant="contained" onClick={runTests} sx={{ mb: 3 }}>
        Run Tests Again
      </Button>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Test Results
        </Typography>

        {testResults.map((result, index) => (
          <Alert
            key={index}
            severity={result.passed ? "success" : "error"}
            sx={{ mb: 1 }}
          >
            <strong>{result.description}</strong>
            <br />
            Input: <code>{result.preObj || "null"}</code> → Expected:{" "}
            <code>{result.expected}</code> → Actual:{" "}
            <code>{result.actual}</code>
            {result.passed ? " ✅" : " ❌"}
          </Alert>
        ))}
      </Paper>

      <Paper sx={{ p: 2, mt: 3, backgroundColor: "#f5f5f5" }}>
        <Typography variant="h6" gutterBottom>
          API Test Instructions
        </Typography>
        <Typography variant="body2">
          Open the browser console and check for API calls when visiting:
          <br />
          <code>/examples/bsdatagrid</code>
          <br />
          <br />
          Look for logs with "🗺️ Using preObj schema mapping" to verify the
          schema mapping is working.
          <br />
          The API call should now use <code>schemaName=sec</code> instead of{" "}
          <code>schemaName=tmt</code>
          for the BSDataGrid with <code>bsPreObj="sec"</code>.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SchemaTestPage;
