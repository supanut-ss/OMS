import { IconButton, ListItemButton, ListItemText, Tooltip } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Config from "../utils/Config";
import { useMenuContext } from "../contexts/MenuContext";
const SidebarSubmenu = ({ submenu, isMobile, open, setOpen, setLoading, theme, setIsFav }) => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);
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
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <ListItemText primary={submenu?.text ?? ""} onClick={() => {
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