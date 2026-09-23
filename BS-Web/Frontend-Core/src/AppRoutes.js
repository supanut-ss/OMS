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
import PermissionRoute from "./components/Router/PermissionRoute";
import Banner from "./pages/Configs/Banner";
import RouteTracker from "./RouteTracker";
import ForecastDashboard from "./pages/Dashboard/ForecastDashboard";
import Count from "./pages/Transaction/Count";
import CountReconcile from "./pages/Transaction/CountReconcile";
import Inbound from "./pages/Transaction/Inbound";
import ColumnMapping from "./pages/Import/ColumnMapping";
import Outbound from "./pages/Transaction/Outbound";
import StatusChange from "./pages/Transaction/StatusChange";
import ChangeLocation from "./pages/Transaction/ChangeLocation";
import Adjustment from "./pages/Transaction/Adjustment";
import TransactionLog2 from "./pages/Transaction/TransactionLog2";
import TransactionMatching from "./pages/Transaction/TransactionMatching";
import AIAdminConsole from "./pages/AI/AIAdminConsole";
import DashboardAI from "./pages/Dashboard/DashboardAI";
import ReportViewer from "./components/ReportViewer";

// ── Master Pages ────────────────────────────────────────────────
import Warehouse from "./pages/Master/Warehouse";
import Owner from "./pages/Master/Owner";
import Part from "./pages/Master/Part";
import Zone from "./pages/Master/Zone";
import Location from "./pages/Master/Location";
import Item from "./pages/Master/Item";
import Category from "./pages/Master/Category";
import BusinessPartner from "./pages/Master/BusinessPartner";
import ZoneCategory from "./pages/Master/ZoneCategory";
import ZoneLocation from "./pages/Master/ZoneLocation";
import InventoryViewer from "./pages/Transaction/InventoryViewer";

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
          <Route
            path="dashboard/forecast"
            element={<ForecastDashboard lang={lang} />}
          />
          <Route
            path="dashboard/dashboardAi"
            element={<DashboardAI lang={lang} />}
          />
        </Route>

        <Route path="import" element={<PermissionRoute />}>
          <Route path="importMaster" element={<ImportMaster lang={lang} />} />
          <Route path="columnMapping" element={<ColumnMapping lang={lang} />} />
          <Route path=":importKey" element={<ImportExcel lang={lang} />} />
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

        <Route path="reports">
          <Route path="viewer" element={<ReportViewer lang={lang} />} />
          <Route path=":reportKey" element={<ReportViewer lang={lang} />} />
        </Route>

        <Route path="master" element={<PermissionRoute />}>
          <Route path="warehouse" element={<Warehouse lang={lang} />} />
          <Route path="owner" element={<Owner lang={lang} />} />
          <Route path="part" element={<Part lang={lang} />} />
          <Route path="zone" element={<Zone lang={lang} />} />
          <Route path="location" element={<Location lang={lang} />} />
          <Route path="item" element={<Item lang={lang} />} />
          <Route path="itemCategory" element={<Category lang={lang} />} />
          <Route
            path="businessPartner"
            element={<BusinessPartner lang={lang} />}
          />
          <Route path="zoneCategory" element={<ZoneCategory lang={lang} />} />
          <Route path="zoneLocation" element={<ZoneLocation lang={lang} />} />
        </Route>

        <Route path="transaction" element={<PermissionRoute />}>
          <Route
            path="transactionLog"
            element={<TransactionLog2 lang={lang} />}
          />
          <Route
            path="transactionMatching"
            element={<TransactionMatching lang={lang} />}
          />
          <Route path="inbound" element={<Inbound lang={lang} />} />
          <Route path="outbound" element={<Outbound lang={lang} />} />
          <Route path="statusChange" element={<StatusChange lang={lang} />} />
          <Route
            path="changeLocation"
            element={<ChangeLocation lang={lang} />}
          />
          <Route path="adjustment" element={<Adjustment lang={lang} />} />
          <Route path="count" element={<Count lang={lang} />} />
          <Route
            path="countReconcile"
            element={<CountReconcile lang={lang} />}
          />
          <Route
            path="inventoryViewer"
            element={<InventoryViewer lang={lang} />}
          />
        </Route>

        <Route path="ai" element={<PermissionRoute />}>
          <Route
            path="overview"
            element={<AIAdminConsole lang={lang} section="overview" />}
          />
          <Route
            path="provider-config"
            element={<AIAdminConsole lang={lang} section="provider-config" />}
          />
          <Route
            path="admin-chat"
            element={<AIAdminConsole lang={lang} section="admin-chat" />}
          />
          <Route
            path="page-config"
            element={<AIAdminConsole lang={lang} section="page-config" />}
          />
          <Route
            path="knowledge-documents"
            element={
              <AIAdminConsole lang={lang} section="knowledge-documents" />
            }
          />
          <Route
            path="schema-knowledge"
            element={<AIAdminConsole lang={lang} section="schema-knowledge" />}
          />
          <Route
            path="logs"
            element={<AIAdminConsole lang={lang} section="logs" />}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
