import { Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import AssignMenu from "./pages/Authentication/AssignMenu";
import ImportMaster from "./pages/Import/ImportMaster";
import ProtectedRoute from "./components/ProtectedRoute";
import BSAutoCompleteExamples from "./examples/BSAutoCompleteExamples";
import BSDataGridExamples from "./examples/BSDataGridExamples";
import TestBSDataGrid from "./test/TestBSDataGrid";
import ImportExcel from "./pages/Import/ImportExcel";

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
        {/* route สำหรับ Testing BSDataGrid */}
        <Route path="test/bsdatagrid" element={<TestBSDataGrid />} />

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
        <Route path="ImportMaster" element={<ImportMaster />} />
        <Route path="ImportExcel" element={<ImportExcel />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
