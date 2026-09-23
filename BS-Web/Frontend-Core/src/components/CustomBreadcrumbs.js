import { Breadcrumbs, Link, Typography } from "@mui/material";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import SecureStorage from "../utils/SecureStorage";

const formatPathLabel = (value) =>
  decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getMenuLabel = (path, currentPath) => {
  const menus = SecureStorage.get("menu") || [];
  const allMenus = menus.flatMap((group) => [
    ...(group.submenu || []), // ← submenu ก่อน
    ...(group.menu_group_path
      ? [{ menu_path: group.menu_group_path, menu_name: group.menu_group_name }]
      : []), // ← group entry ทีหลัง
  ]);

  const queryMatched = allMenus.find((item) => item.menu_path === currentPath);
  if (queryMatched && path === currentPath.split("?")[0]) {
    return queryMatched.menu_name;
  }

  return allMenus.find((item) => item.menu_path === path)?.menu_name;
};

function CustomBreadcrumbs(props) {
  const location = useLocation();
  const { mode, theme } = props;
  const { getResourceByGroupAndName } = useResource();
  const pathnames = location.pathname.split("/").filter((x) => x);
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{
      mb: 2
      , display: "contents"
      , color: mode === "light" ? theme.palette.text.primary : theme.palette.text.secondary
    }}>
      {/* <Link component={RouterLink} underline="hover" color="inherit" to="/">
        {getResource(resourceData, "Dashboard")}
      </Link> */}

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const menuLabel = getMenuLabel(
          to,
          `${location.pathname}${location.search}`,
        );
        const fallbackLabel = formatPathLabel(value);
        const label =
          getResourceByGroupAndName("Menu", menuLabel || fallbackLabel)
            ?.resource_value ||
          menuLabel ||
          fallbackLabel;
        return isLast ? (
          <Typography color={mode === "light" ? theme.palette.text.primary : theme.palette.text.secondary} key={to}>
            {label}
          </Typography>
        ) : (
          <Typography
            color={mode === "light" ? theme.palette.text.primary : theme.palette.text.secondary}

            key={to}
          >
            {label}
          </Typography>
        );
      })}
    </Breadcrumbs>
  );
}

export default CustomBreadcrumbs;
