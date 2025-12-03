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
import MenuPage from "./pages/Authentication/Menu";
import SchemaTestPage from "./test/SchemaTestPage";
import SchemaMappingDemo from "./test/SchemaMappingDemo";
import EnhancedSPTestPage from "./pages/Test/EnhancedSPTestPage";
import ImportExcel from "./pages/Import/ImportExcel";
import Resource from "./pages/Configs/Resource";
import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import secureStorage from "./utils/SecureStorage";
import BSTextFieldExamples from "./examples/BSTextFieldExamples";
import BSFilterCustomExamples from "./examples/BSFilterCustomExamples";
import BSDatepickerExamples from "./examples/BSDatepickerExamples";
import BSDataGridWithCustomFilterExample from "./examples/BSDataGridWithCustomFilterExample";
import Home from "./pages/Home";
import ImportMaster from "./pages/Import/ImportMaster";
import UserLogOnPage from "./pages/Authentication/UserLogOn";
import Combobox from "./pages/Configs/Combobox";
import Projects from "./pages/Projects/Projects";
import CustomerPage from "./pages/Master/Customer";
import HolidayPage from "./pages/Master/Holiday";
import SalePage from "./pages/Master/Sale";

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
  };
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage setLang={(v) => onChangeLang(v)} />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout lang={lang} onChangeLang={onChangeLang} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />

        <Route path="test">
          {/* route สำหรับ BSDataGrid Examples */}
          <Route path="bsdatagrid" element={<BSDataGridExamples />} />
          {/* route สำหรับ BSDataGridClient Examples */}
          <Route
            path="bsdatagridclient"
            element={<BSDataGridClientExample />}
          />
          <Route path="autocomplete" element={<BSAutoCompleteExamples />} />
          {/* route สำหรับ Testing BSDataGrid */}
          <Route path="bsdatagrid" element={<TestBSDataGrid />} />
          {/* route สำหรับ Schema Mapping Test */}
          <Route path="schema" element={<SchemaTestPage />} />
          {/* route สำหรับ Schema Mapping Demo */}
          <Route path="schema-demo" element={<SchemaMappingDemo />} />
          {/* route สำหรับ Enhanced SP Test with Metadata */}
          <Route path="test/enhanced-sp" element={<EnhancedSPTestPage />} />
          <Route path="textfield" element={<BSTextFieldExamples />} />
          <Route path="datepicker" element={<BSDatepickerExamples />} />
          <Route path="filtercustom" element={<BSFilterCustomExamples />} />
          <Route
            path="datagrid-custom-filter"
            element={<BSDataGridWithCustomFilterExample />}
          />
        </Route>

        <Route path="import">
          <Route path="importExcel" element={<ImportExcel />} />
          <Route path="importMaster" element={<ImportMaster lang={lang} />} />
        </Route>

        <Route path="authentication">
          <Route path="user_group" element={<UserGroupPage lang={lang} />} />
          <Route path="user" element={<UserPage lang={lang} />} />
          <Route path="assign_menu" element={<AssignMenu />} />
          <Route path="menu" element={<MenuPage lang={lang} />} />
          <Route path="user_logon" element={<UserLogOnPage lang={lang} />} />
        </Route>

        <Route path="configs">
          <Route path="resource" element={<Resource lang={lang} />} />
          <Route path="combobox" element={<Combobox lang={lang} />} />
        </Route>
        <Route path="master">
          <Route path="sale" element={<SalePage lang={lang} />} />
          <Route path="holiday" element={<HolidayPage lang={lang} />} />\
          <Route path="customer" element={<CustomerPage lang={lang} />} />
        </Route>
        <Route path="projects" element={<Projects lang={lang} />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
