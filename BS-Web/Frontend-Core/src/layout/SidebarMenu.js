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
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import useMenuItems from "../contexts/useMenuItems";
import { useResource } from "../hooks/useResource";
import SidebarSubmenu from "./SidebarSubmenu";

const SidebarMenu = ({ setLoading, open, isMobile, setOpen, theme, lang }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState(null);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const menuItems = useMenuItems();

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
    if (!resourceData) return;
    const data = filterMenuItems(menuItems, search);
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

  // ✅ สร้างเมนู UI
  const menuDiv = filteredMenu?.map(({ text, path, icon, submenu }) => {
    const key = `${text}-${path}`;
    const hasSubmenu = submenu?.length > 0;

    return (
      <div key={key}>
        <Tooltip title={!open ? text : ""} placement="right" arrow>
          <ListItemButton
            onClick={() => {
              if (hasSubmenu) handleExpand(key);
              else {
                setLoading(true);
                navigate(path);
                if (isMobile) setOpen(false);
              }
            }}
            sx={{
              minHeight: 48,
              justifyContent: open ? "initial" : "center",
              px: 2,
              py: 1.5,
              mb: 0.5,
              borderRadius: 2,
              "&:hover": { bgcolor: theme.palette.action.hover },
              "&.Mui-selected": {
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                "&:hover": { bgcolor: theme.palette.primary.dark },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : "auto",
                justifyContent: "center",
                color: "inherit",
              }}
            >
              {icon || <MenuOpenIcon />}
            </ListItemIcon>
            {open && (
              <ListItemText
                primary={text}
                sx={{
                  color: "inherit",
                  "& .MuiTypography-root": { fontWeight: 500 },
                }}
              />
            )}
            {hasSubmenu && open && (expanded[key] ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </Tooltip>

        {/* Submenu */}
        {hasSubmenu && (
          <Collapse in={expanded[key]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {submenu.map((sub) => (
                <SidebarSubmenu
                  key={`${key}-${sub.text}`}
                  text={sub.text}
                  path={sub.path}
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
          p: "2px 4px",
          display: "flex",
          alignItems: "center",
          width: "auto",
          borderRadius: "unset"
        }}
        onSubmit={(e) => e.preventDefault()}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder={open ? "Search" : ""}
          inputProps={{ "aria-label": "search" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <IconButton type="button" sx={{ p: "10px" }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Paper>

      {/* รายการเมนู */}
      <List sx={{ px: 2, py: 1 }}>{menuDiv}</List>
    </Box>
  );
};

export default SidebarMenu;
