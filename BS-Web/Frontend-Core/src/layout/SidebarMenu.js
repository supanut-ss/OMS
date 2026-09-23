import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Collapse,
  InputBase,
  IconButton,
  Paper,
  Box,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useResource } from "../hooks/useResource";
import { useMenuItems } from "../hooks/useMenuItems";
import SidebarSubmenu from "./SidebarSubmenu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ShieldIcon from "@mui/icons-material/Shield";
import StarIcon from "@mui/icons-material/Star";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useAuth } from "../contexts/AuthContext";
import UploadFileIcon from '@mui/icons-material/UploadFile';

const menuItemMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 300, damping: 22 },
};

const iconMotion = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.94 },
  transition: { type: "spring", stiffness: 350, damping: 20 },
};

const SidebarMenu = ({ setLoading, open, isMobile, setOpen, theme, lang, activeMenuRef }) => {

  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { getResource, getResourceDescription, getResources } = useResource();
  const [resourceData, setResourceData] = useState(null);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const { menuItems } = useMenuItems();
  const { menu } = useAuth();

  const normalizePath = useCallback((path) => {
    if (!path) return "";

    const [pathname = "", search = ""] = String(path).split("?");
    const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
    return search ? `${normalizedPathname}?${search}` : normalizedPathname;
  }, []);

  const navigateToMenuPath = useCallback(
    (path) => {
      if (!path) return;

      const nextPath = normalizePath(path);
      const exactCurrentPath = normalizePath(`${location.pathname}${location.search}`);

      if (!nextPath || nextPath === exactCurrentPath) return;

      setLoading(true);
      navigate(path);
    },
    [location.pathname, location.search, navigate, normalizePath, setLoading],
  );

  // Toggle expand/collapse
  const handleExpand = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  // ✅ ฟังก์ชัน filter แบบไม่แก้ไข array เดิม
  const filterMenuItems = useCallback(
    (items, keyword) => {
      if (!items) return [];

      return items
        .map((item) => {
          const rawText = item?.text ?? "";
          const localizedText = getResource(resourceData, rawText);
          const displayText =
            typeof localizedText === "string" && localizedText.trim() !== ""
              ? localizedText
              : rawText;
          const newItem = {
            ...item,
            text: displayText,
            description: getResourceDescription(resourceData, rawText),
            submenu: item.submenu ? filterMenuItems(item.submenu, keyword) : [],
          };

          // Match ตัวเองหรือมี submenu match
          if (
            !keyword ||
            (newItem.text || "")
              .toLowerCase()
              .includes(keyword.toLowerCase()) ||
            newItem.submenu.length > 0
          ) {
            return newItem;
          }
          return null;
        })
        .filter(Boolean);
    },
    [getResource, getResourceDescription, resourceData],
  );

  // ✅ โหลด resource ใหม่เมื่อ lang เปลี่ยน
  const getLang = useCallback(async () => {
    const res = await getResources("Menu");
    setResourceData(res);
  }, [getResources]);

  // ✅ อัปเดตเมนูเมื่อมี resource หรือ search เปลี่ยน
  const getMenu = useCallback(() => {
    let menu = menuItems();
    let data = filterMenuItems(menu, deferredSearch);
    const favoriteMenu = (data || [])
      .map((m) => (m.submenu || []).filter((x) => x.favorite))
      .flat();

    // Always include Favorite section at index 0 (use hidden flag to control visibility)
    data = [
      {
        text: "Favorite",
        description: "",
        path: "/",
        submenu: favoriteMenu,
        hidden: favoriteMenu.length === 0, // Hide when no favorites
      },
      ...data,
    ];

    setFilteredMenu(data);
  }, [
    filterMenuItems,
    menuItems,
    deferredSearch,
  ]);
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById("active-menu-item");

        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
    });
  }, [location.pathname]);
  const prevVisible = useRef(false);

  useEffect(() => {
    if (open && !prevVisible.current) {
      setTimeout(() => {
        const el = document.getElementById("active-menu-item");

        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 300);
    }

    prevVisible.current = open;
  }, [open]);
  // เรียกเมื่อเปลี่ยนภาษา
  useEffect(() => {
    getLang();
  }, [lang, getLang]);

  // เรียกเมื่อ resource หรือ search เปลี่ยน
  useEffect(() => {
    getMenu();
  }, [getMenu]);

  useEffect(() => {
    const handleSecureStorageChange = (event) => {
      if (event?.detail?.key === "menu") {
        getMenu();
      }
    };

    window.addEventListener("secureStorageChange", handleSecureStorageChange);
    return () => {
      window.removeEventListener(
        "secureStorageChange",
        handleSecureStorageChange,
      );
    };
  }, [getMenu]);

  // ICON MENU
  const showIcon = (menu) => {
    const text = (menu?.text || "").toLowerCase();
    const path = (menu?.path || "").toLowerCase();

    if (text.includes("favorite")) return <StarIcon />;
    if (text.includes("dashboard") || path.includes("dashboard"))
      return <DashboardIcon />;
    if (text.includes("auth") || path.includes("auth")) return <ShieldIcon />;
    if (text.includes("config") || path.includes("config"))
      return <SettingsIcon />;
    if (text.includes("import") || path.includes("import"))
      return <UploadFileIcon />;
    if (text.includes("master") || path.includes("master"))
      return <AccountTreeIcon />;
    if (text.includes("transaction") || path.includes("transaction"))
      return <ReceiptLongIcon />;
    if (text.includes("report") || path.includes("report"))
      return <AssessmentIcon />;
    if (text.includes("order") || path.includes("order"))
      return <ShoppingCartIcon />;

    return <MenuOpenIcon />;
  };
  const RefreshMenu = async () => {
    const status = await menu();
    if (status) {
      getMenu();
    }
  };
  const currentPath = normalizePath(`${location.pathname}${location.search}`);
  const isPathActive = useCallback(
    (path) =>
      path &&
      (normalizePath(path) === currentPath ||
        normalizePath(path) === normalizePath(location.pathname)),
    [currentPath, location.pathname, normalizePath],
  );
  // ✅ สร้างเมนู UI
  const menuDiv = filteredMenu?.map((menu, index) => {
    const key = `${index}-${menu.path}`;
    const hasSubmenu = menu?.submenu?.length > 0;
    const isChildActive = hasSubmenu
      ? menu.submenu.some((sub) => isPathActive(sub?.path))
      : false;
    const isSelected =
      (!hasSubmenu && isPathActive(menu.path)) || isChildActive;
    return (
      <div key={key} style={{ display: menu.hidden ? "none" : "block" }}>
        <Tooltip title={menu.description ?? ""} placement="right" arrow>
          <Box component={motion.div} {...menuItemMotion}>
            <ListItemButton
              selected={isSelected}

              ref={isSelected ? activeMenuRef : null}
              onClick={() => {
                if (hasSubmenu) handleExpand(key);
                else {
                  navigateToMenuPath(menu.path);
                  if (isMobile) setOpen(false);
                }
              }}
              sx={{
                minHeight: 44,
                position: "relative",
                justifyContent: open ? "initial" : "center",
                px: 1.5,
                py: 1,
                mb: 0.5,
                borderRadius: 1.5,
                color: theme.palette.text.primary,
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                  color: theme.palette.text.primary,
                  "& .MuiListItemIcon-root": {
                    color: theme.palette.primary.main,
                  },
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 4,
                    height: 20,
                    borderRadius: 4,
                    bgcolor: theme.palette.primary.main,
                  },
                },
                "& .MuiListItemIcon-root": {
                  color: theme.palette.text.secondary,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 1.5 : "auto",
                  justifyContent: "center",
                }}
              >
                <Box component={motion.div} {...iconMotion}>
                  {menu.icon || showIcon(menu)}
                </Box>
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={menu.text}
                  sx={{
                    color: "inherit",
                    minWidth: 0,
                    "& .MuiTypography-root": {
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      lineHeight: 1.25,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    },
                  }}
                />
              )}
              {hasSubmenu &&
                open &&
                (expanded[key] ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </Box>
        </Tooltip>

        {/* Submenu */}
        {hasSubmenu && open && (
          <Collapse
            in={!!expanded[key]}
            timeout="auto"
            unmountOnExit
          >
            <List component="div" disablePadding>
              {menu.submenu.map((sub, subIndex) => (
                <SidebarSubmenu
                  key={`${key}-${sub.menu_id ?? sub.path ?? subIndex}`}
                  submenu={sub}
                  isLast={subIndex === menu.submenu.length - 1}
                  setIsFav={() => {
                    RefreshMenu();
                  }}
                  isMobile={isMobile}
                  open={open}
                  setOpen={setOpen}
                  setLoading={setLoading}
                  theme={theme}
                />
              ))}
            </List>
          </Collapse>
        )}
      </div>
    );
  });
  useEffect(() => {
    const autoExpanded = {};

    filteredMenu.forEach((menu, index) => {
      const key = `${index}-${menu.path}`;

      const hasActiveChild =
        menu?.submenu?.some((sub) => isPathActive(sub?.path));

      if (hasActiveChild) {
        autoExpanded[key] = true;
      }
    });

    setExpanded((prev) => ({
      ...autoExpanded,
      ...prev,
    }));
  }, [location.pathname, location.search, filteredMenu, isPathActive]);

  // ✅ Return JSX
  return (
    <Box>
      <Paper
        component="form"
        sx={{
          ml: 2,
          mr: 2,
          p: "2px 4px",
          display: open ? "flex" : "none",
          alignItems: "center",
          width: "auto",
          borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
        onSubmit={(e) => e.preventDefault()}
      >
        <InputBase
          sx={{ ml: 2, flex: 1, color: theme.palette.text.primary }}
          placeholder={open ? "Search" : ""}
          inputProps={{ "aria-label": "search" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <IconButton
          type="button"
          sx={{ p: "10px", color: theme.palette.text.secondary }}
          aria-label="search"
        >
          <SearchIcon />
        </IconButton>
      </Paper>

      {/* รายการเมนู */}
      <List
        sx={{
          px: 2,
          py: 1,
          maxHeight: "calc(100vh - 180px)",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha(theme.palette.primary.main, 0.5)} transparent`,
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(theme.palette.primary.main, 0.4),
            borderRadius: 8,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.6),
          },
        }}
      >
        {menuDiv}
      </List>
    </Box>
  );
};

export default SidebarMenu;
