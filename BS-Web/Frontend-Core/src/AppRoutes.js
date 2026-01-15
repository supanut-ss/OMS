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
import MyTaskPage from "./pages/Projects/MyTask";
import CustomerPage from "./pages/Master/Customer";
import HolidayPage from "./pages/Master/Holiday";
import SalePage from "./pages/Master/Sale";
import IsoPage from "./pages/Master/Iso";
import PermissionRoute from "./components/Router/PermissionRoute";

export default function AppRoutes() {
  const [lang, setLang] = useState(secureStorage.get("lang") || "en");
  const { switchLang } = useAuth();
  const onChangeLang = async (lang) => {
    if (secureStorage.get("token")) {
      if (await switchLang(lang)) {
        setLang(lang);
        secureStorage.set("lang", lang);
        // Dispatch custom event so all components (including BSDataGrid) can detect language change
        window.dispatchEvent(new CustomEvent('bsLangChange', { detail: { lang } }));
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
          <Route path="importExcel" element={<PermissionRoute>{(p) => <ImportExcel permission={p} />}</PermissionRoute>} />
          <Route path="importMaster" element={<PermissionRoute>{(p) => <ImportMaster lang={lang} permission={p} />}</PermissionRoute>} />
        </Route>

        <Route path="authentication">
          <Route path="user_group" element={<PermissionRoute>{(p) => <UserGroupPage lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="user" element={<PermissionRoute>{(p) => <UserPage lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="assign_menu" element={<PermissionRoute>{(p) => <AssignMenu lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="menu" element={<PermissionRoute>{(p) => <MenuPage lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="user_logon" element={<PermissionRoute>{(p) => <UserLogOnPage lang={lang} permission={p} />}</PermissionRoute>} />
        </Route>

        <Route path="configs">
          <Route path="resource" element={<PermissionRoute>{(p) => <Resource lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="combobox" element={<PermissionRoute>{(p) => <Combobox lang={lang} permission={p} />}</PermissionRoute>} />
        </Route>
        <Route path="master">
          <Route path="sale" element={<PermissionRoute>{(p) => <SalePage lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="holiday" element={<PermissionRoute>{(p) => <HolidayPage lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="customer" element={<PermissionRoute>{(p) => <CustomerPage lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="iso" element={<PermissionRoute>{(p) => <IsoPage lang={lang} permission={p} />}</PermissionRoute>} />
        </Route>
        <Route path="projects">
          <Route path="" element={<PermissionRoute>{(p) => <Projects lang={lang} permission={p} />}</PermissionRoute>} />
          <Route path="ma" element={<PermissionRoute>{(p) => <Projects lang={lang} ma={true} permission={p} />}</PermissionRoute>} />
          <Route path="my-task" element={<PermissionRoute>{(p) => <MyTaskPage lang={lang} permission={p} />}</PermissionRoute>} />
        </Route>

      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
