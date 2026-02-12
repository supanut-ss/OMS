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
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useResource } from "../hooks/useResource";
import { useMenuItems } from "../hooks/useMenuItems";
import SidebarSubmenu from "./SidebarSubmenu";
import HouseIcon from '@mui/icons-material/House';
import SettingsIcon from '@mui/icons-material/Settings';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import GroupIcon from '@mui/icons-material/Group';
import StarIcon from '@mui/icons-material/Star';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from "../contexts/AuthContext";

const SidebarMenu = ({ setLoading, open, isMobile, setOpen, theme, lang }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const { getResource, getResourceDescription, getResources } = useResource();
  const [resourceData, setResourceData] = useState(null);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const { menuItems } = useMenuItems();
  const { menu } = useAuth();
  // Toggle expand/collapse
  const handleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ✅ ฟังก์ชัน filter แบบไม่แก้ไข array เดิม
  const filterMenuItems = (items, keyword) => {
    if (!items) return [];

    return items
      .map((item) => {
        const newItem = {
          ...item,
          text: getResource(resourceData, item.text),
          description: getResourceDescription(resourceData, item.text),
          submenu: item.submenu
            ? filterMenuItems(item.submenu, keyword)
            : [],
        };

        // Match ตัวเองหรือมี submenu match
        if (
          !keyword ||
          newItem.text.toLowerCase().includes(keyword.toLowerCase()) ||
          newItem.submenu.length > 0
        ) {
          return newItem;
        }
        return null;
      })
      .filter(Boolean);
  };

  // ✅ โหลด resource ใหม่เมื่อ lang เปลี่ยน
  const getLang = async () => {
    const res = await getResources("Menu");
    setResourceData(res);
  };

  // ✅ อัปเดตเมนูเมื่อมี resource หรือ search เปลี่ยน
  const getMenu = () => {
    let menu = menuItems();
    if (!resourceData) return;
    let data = filterMenuItems(menu, search);
    const favoriteMenu = (data || [])
      .map(m => (m.submenu || []).filter(x => x.favorite))
      .flat();

    // Always include Favorite section at index 0 (use hidden flag to control visibility)
    data = [{
      text: "Favorite",
      description: "",
      path: "/",
      submenu: favoriteMenu,
      hidden: favoriteMenu.length === 0  // Hide when no favorites
    }, ...data];

    setFilteredMenu(data);
  };

  // เรียกเมื่อเปลี่ยนภาษา
  useEffect(() => {
    getLang();
  }, [lang]);

  // เรียกเมื่อ resource หรือ search เปลี่ยน
  useEffect(() => {
    getMenu();
  }, [resourceData, search]);

  // ICON MENU
  const showIcon = (index) => {
    switch (index) {
      case 0:
        return <StarIcon />;
      case 1:
        return <HouseIcon />;
      case 2:
        return <GroupIcon />
      case 3:
        return <SettingsIcon />
      case 4:
        return <ImportExportIcon />
      case 5:
        return <LocalOfferIcon />
      case 7:
        return <QueryStatsIcon />
      case 8:
        return <EmojiEventsIcon />
      default:
        return <MenuOpenIcon />
    }
  }
  const RefreshMenu = async () => {
    const status = await menu();
    if (status) {
      getMenu();
    }
  }
  // ✅ สร้างเมนู UI
  const menuDiv = filteredMenu?.map((menu, index) => {
    const key = `${index}-${menu.path}`;
    const hasSubmenu = menu?.submenu?.length > 0;
    const isChildActive = hasSubmenu
      ? menu.submenu.some((sub) => sub?.path === location.pathname)
      : false;
    const isSelected = (!hasSubmenu && location.pathname === menu.path) || isChildActive;
    return (
      <div key={key} style={{ display: menu.hidden ? 'none' : 'block' }}>
        <Tooltip title={menu.description ?? ""} placement="right" arrow>
          <ListItemButton
            selected={isSelected}
            onClick={() => {
              if (hasSubmenu) handleExpand(key);
              else {
                setLoading(true);
                navigate(menu.path);
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
                "& .MuiListItemIcon-root": { color: theme.palette.primary.main },
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
              {menu.icon || showIcon(index)}
            </ListItemIcon>
            {open && (
              <ListItemText
                primary={menu.text}
                sx={{
                  color: "inherit",
                  "& .MuiTypography-root": {
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  },
                }}
              />
            )}
            {hasSubmenu && open && (expanded[key] ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </Tooltip>

        {/* Submenu */}
        {hasSubmenu && open && (
          <Collapse in={expanded[key] || isChildActive} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {menu.submenu.map((sub, subIndex) => (
                <SidebarSubmenu
                  key={`${key}-${sub.text}`}
                  submenu={sub}
                  isLast={subIndex === menu.submenu.length - 1}
                  setIsFav={() => {
                    RefreshMenu();
                  }}
                  isMobile={isMobile}
                  open={open}
                  setOpen={setOpen}
                  setLoading={setLoading}
                  theme={theme} />
              ))}
            </List>
          </Collapse>
        )}
      </div>
    );
  });

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
          sx={{ ml: 2, flex: 1, color: theme.palette.text.primary ,}}
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
