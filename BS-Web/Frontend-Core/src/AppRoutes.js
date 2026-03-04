import { Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import AssignMenu from "./pages/Authentication/AssignMenu";
import ProtectedRoute from "./components/ProtectedRoute";
import UserPage from "./pages/Authentication/User";
import UserGroupPage from "./pages/Authentication/UserGroup";
import MenuPage from "./pages/Authentication/Menu";
import ImportExcel from "./pages/Import/ImportExcel";
import Resource from "./pages/Configs/Resource";
import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import secureStorage from "./utils/SecureStorage";
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
import ManPowerPage from "./pages/Projects/ManPower";
import Incentive from "./pages/Incentive";
import Performance from "./pages/Performance";
import Banner from "./pages/Configs/Banner";
import RouteTracker from "./RouteTracker";

export default function AppRoutes() {
  const [lang, setLang] = useState(secureStorage.get("lang") || "en");
  const { switchLang } = useAuth();
  const onChangeLang = async (lang) => {
    if (secureStorage.get("token")) {
      if (await switchLang(lang)) {
        setLang(lang);
        secureStorage.set("lang", lang);
        // Dispatch custom event so all components (including BSDataGrid) can detect language change
        window.dispatchEvent(
          new CustomEvent("bsLangChange", { detail: { lang } }),
        );
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
            <>
            <RouteTracker />
            <MainLayout lang={lang} onChangeLang={onChangeLang} />
            </>
          </ProtectedRoute>
        }
      >
        <Route element={<PermissionRoute />}>
          <Route index element={<Home lang={lang} />} />
        </Route>

        {/* <Route path="test">
          <Route path="bsdatagrid" element={<BSDataGridExamples />} />
          <Route
            path="bsdatagridclient"
            element={<BSDataGridClientExample />}
          />
          <Route path="autocomplete" element={<BSAutoCompleteExamples />} />
          <Route path="bsdatagrid" element={<TestBSDataGrid />} />
          <Route path="schema" element={<SchemaTestPage />} />
          <Route path="schema-demo" element={<SchemaMappingDemo />} />
          <Route path="test/enhanced-sp" element={<EnhancedSPTestPage />} />
          <Route path="textfield" element={<BSTextFieldExamples />} />
          <Route path="datepicker" element={<BSDatepickerExamples />} />
          <Route path="filtercustom" element={<BSFilterCustomExamples />} />
          <Route
            path="datagrid-custom-filter"
            element={<BSDataGridWithCustomFilterExample />}
          />
        </Route> */}

        <Route path="import" element={<PermissionRoute />}>
          <Route path="importExcel" element={<ImportExcel />} />
          <Route path="importMaster" element={<ImportMaster lang={lang} />} />
        </Route>

        <Route path="authentication" element={<PermissionRoute />}>
          <Route path="user_group" element={<UserGroupPage lang={lang} />} />
          <Route path="user" element={<UserPage lang={lang} />} />
          <Route path="assign_menu" element={<AssignMenu lang={lang} />} />
          <Route path="menu" element={<MenuPage lang={lang} />} />
          <Route path="user_logon" element={<UserLogOnPage lang={lang} />} />
        </Route>

        <Route path="configs" element={<PermissionRoute />}>
          <Route path="resource" element={<Resource lang={lang} />} />
          <Route path="combobox" element={<Combobox lang={lang} />} />
          <Route path="banner" element={<Banner lang={lang} />} />
        </Route>
        <Route path="master" element={<PermissionRoute />}>
          <Route path="sale" element={<SalePage lang={lang} />} />
          <Route path="holiday" element={<HolidayPage lang={lang} />} />
          <Route path="customer" element={<CustomerPage lang={lang} />} />
          <Route path="iso" element={<IsoPage lang={lang} />} />
        </Route>
        <Route path="projects" element={<PermissionRoute />}>
          <Route path="" element={<Projects lang={lang} />} />
          <Route path="ma" element={<Projects lang={lang} ma={true} />} />
          <Route path="my-task" element={<MyTaskPage lang={lang} />} />
          <Route path="manpower" element={<ManPowerPage lang={lang} />} />
        </Route>
        <Route path="performance" element={<PermissionRoute />}>
          <Route path="" element={<Performance lang={lang} />} />
          <Route path="incentive" element={<Incentive lang={lang} />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
