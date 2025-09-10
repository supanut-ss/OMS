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
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import {useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import useMenuItems from "../contexts/useMenuItems";

const SidebarMenu = ({ setLoading, open, isMobile, setOpen, theme }) => {
 const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");

  const menuItems = useMenuItems();

  // toggle expand/collapse
  const handleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ฟังก์ชัน search แบบ recursive
  const filterMenuItems = (items, keyword) => {
    if (!keyword) return items; // ถ้า search ว่าง return ทุกตัว
    return items
      .map(item => {
        // filter children ก่อน
        const filteredSubmenu = item.submenu ? filterMenuItems(item.submenu, keyword) : [];
        // match ตัวเองหรือมี submenu match
        if (item.text.toLowerCase().includes(keyword.toLowerCase()) || filteredSubmenu.length > 0) {
          return {
            ...item,
            submenu: filteredSubmenu, // เก็บเฉพาะ submenu ที่ match
          };
        }
        return null; // ไม่ match
      })
      .filter(Boolean);
  };

  const filteredMenu = filterMenuItems(menuItems, search);

  return (
    <>
      <Paper
        component="form"
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: "auto" }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Search"
          inputProps={{ 'aria-label': 'search' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Paper>

      <List sx={{ px: 2, py: 1 }}>
        {filteredMenu?.map(({ text, path, icon, submenu }) => {
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
                  {open && <ListItemText primary={text} sx={{ color: "inherit", "& .MuiTypography-root": { fontWeight: 500 } }} />}
                  {hasSubmenu && open && (expanded[key] ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>
              </Tooltip>

              {/* Submenu */}
              {hasSubmenu && (
                <Collapse in={expanded[key]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {submenu.map((sub) => (
                      <ListItemButton
                        key={`${key}-${sub.text}`}
                        onClick={() => {
                          setLoading(true);
                          navigate(sub.path);
                          if (isMobile) setOpen(false);
                        }}
                        sx={{
                          pl: open ? 6 : 4,
                          borderRadius: 2,
                          "&:hover": { bgcolor: theme.palette.action.hover },
                          "&.Mui-selected": {
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            "&:hover": { bgcolor: theme.palette.primary.dark },
                          },
                        }}
                      >
                        <ListItemText primary={sub.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </div>
          );
        })}
      </List>
    </>
  );
}
export default SidebarMenu;
