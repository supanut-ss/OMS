import { IconButton, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Config from "../utils/Config";
const SidebarSubmenu = ({ text, path, isMobile, open, setOpen, setLoading, theme }) => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);
    return (
        <ListItemButton
            onClick={() => {
                setLoading(true);
                navigate(path);
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
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <ListItemText primary={text} />
            {hovered && (
                <IconButton
                    size="small"
                    edge="end"
                    sx={{ ml: 1 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(Config.BASE_URL !== "" ? Config.BASE_URL + "" + path : path, "_blank");
                    }}
                >
                    <OpenInNewIcon fontSize="small" />
                </IconButton>
            )}
        </ListItemButton>
    );
}
export default SidebarSubmenu;