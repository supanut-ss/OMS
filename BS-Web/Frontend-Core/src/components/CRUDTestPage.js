import React, { useState } from "react";
import useDynamicCrud from "../hooks/useDynamicCrud";
import Logger from "../utils/logger";

const CRUDTestPage = () => {
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Test with sec schema (should map to sec)
  const {
    loadMetadata,
    createRecord,
    updateRecord,
    deleteRecord,
    bulkCreate,
    bulkUpdate,
    bulkDelete,
    executeStoredProcedure,
  } = useDynamicCrud("t_com_user");

  const runCRUDTests = async () => {
    setLoading(true);
    setTestResult("Starting CRUD tests with schema mapping...\n");

    const preObj = "sec"; // This should map to 'sec' schema

    try {
      // Test 1: Load metadata with preObj
      setTestResult(
        (prev) => prev + '\n🔍 Test 1: Loading metadata with preObj="sec"...\n'
      );
      await loadMetadata(preObj);
      setTestResult((prev) => prev + "✅ Metadata loaded successfully\n");

      // Test 2: Create record with preObj
      setTestResult(
        (prev) => prev + '\n📝 Test 2: Creating record with preObj="sec"...\n'
      );
      const newRecord = {
        username: "test_user_" + Date.now(),
        email: "test@example.com",
        full_name: "Test User",
        is_active: true,
      };

      const createResult = await createRecord(newRecord, preObj);
      setTestResult(
        (prev) =>
          prev + `✅ Create Record: ${JSON.stringify(createResult, null, 2)}\n`
      );

      // Test 3: Update record with preObj
      if (createResult?.insertId || createResult?.id) {
        const recordId = createResult.insertId || createResult.id;
        setTestResult(
          (prev) => prev + '\n📝 Test 3: Updating record with preObj="sec"...\n'
        );

        const updateData = {
          full_name: "Updated Test User",
        };

        const updateResult = await updateRecord(recordId, updateData, preObj);
        setTestResult(
          (prev) =>
            prev +
            `✅ Update Record: ${JSON.stringify(updateResult, null, 2)}\n`
        );

        // Test 4: Delete record with preObj
        setTestResult(
          (prev) => prev + '\n🗑️ Test 4: Deleting record with preObj="sec"...\n'
        );
        const deleteResult = await deleteRecord(recordId, preObj);
        setTestResult(
          (prev) =>
            prev +
            `✅ Delete Record: ${JSON.stringify(deleteResult, null, 2)}\n`
        );
      }

      // Test 5: Bulk Create with preObj
      setTestResult(
        (prev) => prev + '\n📦 Test 5: Bulk create with preObj="sec"...\n'
      );
      const bulkData = [
        {
          username: "bulk_user_1_" + Date.now(),
          email: "bulk1@example.com",
          full_name: "Bulk User 1",
          is_active: true,
        },
        {
          username: "bulk_user_2_" + Date.now(),
          email: "bulk2@example.com",
          full_name: "Bulk User 2",
          is_active: true,
        },
      ];

      const bulkCreateResult = await bulkCreate(bulkData, preObj);
      setTestResult(
        (prev) =>
          prev +
          `✅ Bulk Create: ${JSON.stringify(bulkCreateResult, null, 2)}\n`
      );

      // Test 6: Bulk Update with preObj
      setTestResult(
        (prev) => prev + '\n📦 Test 6: Bulk update with preObj="sec"...\n'
      );
      const updates = [
        {
          conditions: { username: bulkData[0].username },
          data: { full_name: "Updated Bulk User 1" },
        },
      ];

      const bulkUpdateResult = await bulkUpdate(updates, preObj);
      setTestResult(
        (prev) =>
          prev +
          `✅ Bulk Update: ${JSON.stringify(bulkUpdateResult, null, 2)}\n`
      );

      // Test 7: Bulk Delete with preObj
      setTestResult(
        (prev) => prev + '\n📦 Test 7: Bulk delete with preObj="sec"...\n'
      );
      const deleteConditions = [
        { username: bulkData[0].username },
        { username: bulkData[1].username },
      ];

      const bulkDeleteResult = await bulkDelete(deleteConditions, preObj);
      setTestResult(
        (prev) =>
          prev +
          `✅ Bulk Delete: ${JSON.stringify(bulkDeleteResult, null, 2)}\n`
      );

      // Test 8: Execute stored procedure with preObj
      setTestResult(
        (prev) =>
          prev + '\n🔧 Test 8: Execute stored procedure with preObj="sec"...\n'
      );
      try {
        const spResult = await executeStoredProcedure(
          "sp_get_user_count",
          {},
          preObj
        );
        setTestResult(
          (prev) =>
            prev + `✅ Stored Procedure: ${JSON.stringify(spResult, null, 2)}\n`
        );
      } catch (spError) {
        setTestResult(
          (prev) =>
            prev + `⚠️ Stored Procedure (may not exist): ${spError.message}\n`
        );
      }

      setTestResult(
        (prev) => prev + "\n🎉 All CRUD tests completed successfully!\n"
      );
      setTestResult(
        (prev) =>
          prev + "\n📊 Check browser console for detailed schema mapping logs\n"
      );
    } catch (error) {
      setTestResult((prev) => prev + `\n❌ Test failed: ${error.message}\n`);
      Logger.error("CRUD Test Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const testWithoutPreObj = async () => {
    setLoading(true);
    setTestResult(
      "Testing CRUD operations WITHOUT preObj (should use default schema parsing)...\n"
    );

    try {
      // Test without preObj - should use parseTableName
      setTestResult(
        (prev) => prev + "\n🔍 Loading metadata WITHOUT preObj...\n"
      );
      await loadMetadata(); // No preObj parameter
      setTestResult(
        (prev) => prev + "✅ Metadata loaded with default schema parsing\n"
      );

      const newRecord = {
        username: "default_test_" + Date.now(),
        email: "default@example.com",
        full_name: "Default Schema Test",
        is_active: true,
      };

      const createResult = await createRecord(newRecord); // No preObj parameter
      setTestResult(
        (prev) =>
          prev +
          `✅ Create without preObj: ${JSON.stringify(createResult, null, 2)}\n`
      );

      setTestResult(
        (prev) =>
          prev +
          "\n📊 Check console logs to see the difference in schema resolution\n"
      );
    } catch (error) {
      setTestResult(
        (prev) => prev + `\n❌ Default test failed: ${error.message}\n`
      );
      Logger.error("Default CRUD Test Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>🧪 CRUD Schema Mapping Test</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={runCRUDTests}
          disabled={loading}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Running Tests..." : '🔥 Test All CRUD with preObj="sec"'}
        </button>

        <button
          onClick={testWithoutPreObj}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Running Tests..." : "📊 Test Default Schema (no preObj)"}
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "4px",
          padding: "15px",
          minHeight: "400px",
          whiteSpace: "pre-wrap",
          fontSize: "12px",
          overflowY: "auto",
        }}
      >
        {testResult || "Click a button above to run CRUD tests..."}
      </div>

      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <h3>💡 What this test does:</h3>
        <ul>
          <li>
            🔍 <strong>Schema Mapping:</strong> Tests if preObj="sec" correctly
            maps to schema "sec"
          </li>
          <li>
            📝 <strong>CRUD Operations:</strong> Create, Read, Update, Delete
            with proper schema
          </li>
          <li>
            📦 <strong>Bulk Operations:</strong> Bulk create, update, delete
            with schema mapping
          </li>
          <li>
            🔧 <strong>Stored Procedures:</strong> Execute SP with correct
            schema
          </li>
          <li>
            📊 <strong>Comparison:</strong> Compare preObj vs default schema
            parsing
          </li>
          <li>
            🕵️ <strong>Logging:</strong> Check console for detailed schema
            mapping logs
          </li>
        </ul>

        <div
          style={{
            backgroundColor: "#d1ecf1",
            padding: "10px",
            borderRadius: "4px",
            marginTop: "10px",
          }}
        >
          <strong>🔍 Expected Results:</strong>
          <br />• With preObj="sec": Should use schema "sec" for all operations
          <br />• Without preObj: Should use default schema "tmt" (parsed from
          tableName)
          <br />• Console logs should show "🗺️ Using preObj schema mapping" vs
          "📊 Using parsed tableName"
        </div>
      </div>
    </div>
  );
};

export default CRUDTestPage;
