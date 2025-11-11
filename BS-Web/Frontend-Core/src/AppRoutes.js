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
import EnhancedSPTestPage from "./pages/Test/EnhancedSPTestPage";
import ImportExcel from "./pages/Import/ImportExcel";
import ImportMaster from "./pages/Import/ImportMaster";
import CountTag from "./pages/Count/CountTagPage";
import CountReconcile from "./pages/Count/CountReconcile";
import MethodPage from "./pages/Master/MethodPage";
import PartPage from "./pages/Master/PartPage";
import SubPage from "./pages/Master/SubPage";
import TagPage from "./pages/Master/TagPage";
import Resource from "./pages/Authentication/Resource";
import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import secureStorage from "./utils/SecureStorage";
import BSTextFieldExamples from "./examples/BSTextFieldExamples";
import BSFilterCustomExamples from "./examples/BSFilterCustomExamples";
import BSDatepickerExamples from "./examples/BSDatepickerExamples";
import Home from "./pages/Home";

export default function AppRoutes() {
  const [lang, setLang] = useState(secureStorage.get("lang") || "en");
  const { switchLang } = useAuth();
  const onChangeLang = async (lang) => {
    if (secureStorage.get("token")) {
      if (await switchLang(lang)) {
        setLang(lang);
        secureStorage.set("lang", lang);
      }
    }
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage setLang={(v) => onChangeLang(v)} />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout lang={lang} onChangeLang={onChangeLang} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
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
        {/* route สำหรับ Enhanced SP Test with Metadata */}
        <Route path="test/enhanced-sp" element={<EnhancedSPTestPage />} />
        <Route path="import">
          <Route path="importExcel" element={<ImportExcel />} />
          <Route path="importMaster" element={<ImportMaster />} />
        </Route>
        <Route path="test/textfield" element={<BSTextFieldExamples />} />
        <Route path="test/datepicker" element={<BSDatepickerExamples />} />
        <Route path="test/filtercustom" element={<BSFilterCustomExamples />} />
        <Route path="assign_menu" element={<AssignMenu />} />
        <Route path="importExcel" element={<ImportExcel />} />
        <Route path="importMaster" element={<ImportMaster />} />
        <Route path="user" element={<UserPage />} />
        <Route path="user_group" element={<UserGroupPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="user_logon" element={<UserLogOnPage />} />
        <Route path="count">
          <Route path="count_tag" element={<CountTag lang={lang} />} />
          <Route path="count_reconcile" element={<CountReconcile lang={lang} />} />
        </Route>
        <Route path="master">
          <Route path="part_master" element={<PartPage />} />
          <Route path="sub_master" element={<SubPage />} />
          <Route path="tag_master" element={<TagPage />} />
          <Route path="method_master" element={<MethodPage />} />
        </Route>
        <Route path="authentication">
          <Route path="user_group" element={<UserGroupPage />} />
          <Route path="user" element={<UserPage />} />
          <Route path="assign_menu" element={<AssignMenu />} />
          <Route path="resource" element={<Resource lang={lang} />} />
          <Route path="menu" element={<MenuPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
