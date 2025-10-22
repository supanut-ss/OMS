import { Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import AssignMenu from "./pages/Authentication/AssignMenu";
import ProtectedRoute from "./components/ProtectedRoute";
import BSAutoCompleteExamples from "./examples/BSAutoCompleteExamples";
import BSDataGridExamples from "./examples/BSDataGridExamples";
import BSDataGridClientExample from "./pages/Examples/BSDataGridClientExample";
import TestBSDataGrid from "./test/TestBSDataGrid";
import UserPage from "./pages/Authentication/User";
import UserGroupPage from "./pages/Authentication/UserGroup";
import UserLogOnPage from "./pages/Authentication/UserLogOn";
import MenuPage from "./pages/Authentication/Menu";
import SchemaTestPage from "./test/SchemaTestPage";
import SchemaMappingDemo from "./test/SchemaMappingDemo";
import ImportExcel from "./pages/Import/ImportExcel";
import ImportMaster from "./pages/Import/ImportMaster";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<div />} />
        <Route path="autocomplete" element={<BSAutoCompleteExamples />} />
        {/* route สำหรับ BSDataGrid Examples */}
        <Route path="examples/bsdatagrid" element={<BSDataGridExamples />} />
        {/* route สำหรับ BSDataGridClient Examples */}
        <Route
          path="examples/bsdatagridclient"
          element={<BSDataGridClientExample />}
        />
        {/* route สำหรับ Testing BSDataGrid */}
        <Route path="test/bsdatagrid" element={<TestBSDataGrid />} />
        {/* route สำหรับ Schema Mapping Test */}
        <Route path="test/schema" element={<SchemaTestPage />} />
        {/* route สำหรับ Schema Mapping Demo */}
        <Route path="test/schema-demo" element={<SchemaMappingDemo />} />

        <Route
          path="timesheet"
          element={<div>Timesheet Page - Coming Soon</div>}
        />
        <Route path="tasks" element={<div>Tasks Page - Coming Soon</div>} />
        <Route
          path="calendar"
          element={<div>Calendar Page - Coming Soon</div>}
        />
        <Route path="reports" element={<div>Reports Page - Coming Soon</div>} />
        <Route path="team" element={<div>Team Page - Coming Soon</div>} />
        <Route path="assign_menu" element={<AssignMenu />} />
        <Route path="importExcel" element={<ImportExcel />} />
        <Route path="importMaster" element={<ImportMaster />} />
        <Route path="user" element={<UserPage />} />
        <Route path="user_group" element={<UserGroupPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="user_logon" element={<UserLogOnPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
