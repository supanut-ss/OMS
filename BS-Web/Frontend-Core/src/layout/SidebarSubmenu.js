import { Box, IconButton, ListItemButton, ListItemText, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Config from "../utils/Config";
import { useMenuContext } from "../contexts/MenuContext";
const SidebarSubmenu = ({ submenu, isLast, isMobile, open, setOpen, setLoading, theme, setIsFav }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [hovered, setHovered] = useState(false);
    const isActive = location.pathname === submenu?.path;
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
        } catch (err) {

        }
    }
    return (
        <Tooltip title={submenu?.description ?? ""} placement="right" arrow>
            <ListItemButton
                disableRipple
                selected={location.pathname === submenu?.path}
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
                        cursor: "pointer",
                        "& .MuiTypography-root": {
                            fontSize: "0.85rem",
                            fontWeight: isActive ? 600 : 500,
                            color: isActive
                                ? theme.palette.primary.main
                                : theme.palette.text.primary,
                        },
                        "&:hover .MuiTypography-root": {
                            color: theme.palette.primary.main,
                        },
                    }}
                    onClick={() => {
                    setLoading(true);
                    navigate(submenu?.path ?? "");
                    if (isMobile) setOpen(false);
                }} />
                <IconButton
                    size="small"
                    edge="end"
                    sx={{ ml: 1 }}
                    onClick={() => {
                        callSetFavorite();
                    }}
                >
                    {submenu.favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
                {hovered && (
                    <IconButton
                        size="small"
                        edge="end"
                        sx={{ ml: 1 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(Config.BASE_URL !== "" ? Config.BASE_URL + "" + submenu?.path : submenu?.path, "_blank");
                        }}
                    >
                        <OpenInNewIcon fontSize="small" />
                    </IconButton>
                )}
            </ListItemButton>
        </Tooltip>
    );
}
export default SidebarSubmenu;