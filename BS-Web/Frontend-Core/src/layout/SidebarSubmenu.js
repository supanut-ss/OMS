import {
  Box,
  IconButton,
  ListItemButton,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Config from "../utils/Config";
import { useMenuContext } from "../contexts/MenuContext";

const submenuMotion = {
  whileHover: { scale: 1.01, x: 4 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 300, damping: 22 },
};

const iconMotion = {
  whileHover: { scale: 1.12 },
  whileTap: { scale: 0.9 },
  transition: { type: "spring", stiffness: 360, damping: 24 },
};
const SidebarSubmenu = ({
  submenu,
  isLast,
  isMobile,
  open,
  setOpen,
  setLoading,
  theme,
  setIsFav,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hovered, setHovered] = useState(false);

  const normalizePath = useCallback((path) => {
    if (!path) return "";

    const [pathname = "", search = ""] = String(path).split("?");
    const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
    return search ? `${normalizedPathname}?${search}` : normalizedPathname;
  }, []);

  const currentPath = normalizePath(`${location.pathname}${location.search}`);
  const currentPathnameOnly = normalizePath(location.pathname);
  const submenuPath = normalizePath(submenu?.path);
  const isActive = submenuPath === currentPath || submenuPath === currentPathnameOnly;

  const handleNavigate = useCallback(() => {
    if (!submenu?.path) return;

    if (submenuPath === currentPath) {
      if (isMobile) setOpen(false);
      return;
    }

    setLoading(true);
    navigate(submenu.path);
    if (isMobile) setOpen(false);
  }, [
    submenu?.path,
    submenuPath,
    currentPath,
    isMobile,
    setOpen,
    setLoading,
    navigate,
  ]);

  const lineX = open ? 22 : 16;
  const lineWidth = 14;
  const gutter = lineX + lineWidth + 6;
  const { favorite } = useMenuContext();
  const callSetFavorite = async (fav) => {
    try {
      const res = await favorite(submenu.menu_id);
      if (res.message_code === "0") {
        setIsFav();
      }
    } catch (err) { }
  };
  return (
    <Tooltip title={submenu?.description ?? ""} placement="right" arrow>
      <ListItemButton
        id={isActive ? "active-menu-item" : undefined}
        disableRipple
        selected={isActive}
        onClick={handleNavigate}
        sx={{
          pl: open ? 7 : 4.5,
          borderRadius: 1.5,
          minHeight: 38,
          position: "relative",
          color: theme.palette.text.primary,
          "&&:hover": {
            backgroundColor: "transparent",
            backgroundImage: "none",
          },
          "&&.Mui-selected": {
            backgroundColor: "transparent",
            backgroundImage: "none",
            color: theme.palette.primary.main,
            "&:hover": {
              backgroundColor: "transparent",
              backgroundImage: "none",
            },
          },
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Box
          sx={{
            position: "absolute",
            left: lineX,
            top: 0,
            bottom: isLast ? "50%" : 0,
            width: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.divider, 0.9),
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: lineX,
            top: "50%",
            width: lineWidth,
            height: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.divider, 0.9),
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        <ListItemText
          primary={submenu?.text ?? ""}
          sx={{
            minWidth: 0,
            "& .MuiTypography-root": {
              fontSize: "0.85rem",
              fontWeight: isActive ? 600 : 500,
              color: isActive
                ? theme.palette.primary.main
                : theme.palette.text.primary,
              lineHeight: 1.25,
              whiteSpace: "normal",
              wordBreak: "break-word",
            },
            "&:hover .MuiTypography-root": {
              color: theme.palette.primary.main,
            },
          }}
        />
        <Box component={motion.div} {...iconMotion}>
          <IconButton
            size="small"
            edge="end"
            sx={{ ml: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              callSetFavorite();
            }}
          >
            {submenu.favorite ? (
              <StarIcon fontSize="small" />
            ) : (
              <StarBorderIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
        {hovered && (
          <Box component={motion.div} {...iconMotion}>
            <IconButton
              size="small"
              edge="end"
              sx={{ ml: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  Config.BASE_URL !== ""
                    ? Config.BASE_URL + "" + submenu?.path
                    : submenu?.path,
                  "_blank",
                );
              }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </ListItemButton>
    </Tooltip>
  );
};
export default SidebarSubmenu;
