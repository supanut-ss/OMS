import { Stack, Button, Chip } from "@mui/material";
import { useEffect, useState } from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
const STATUS = {
    Open: {
        label: "Open",
        color: "#9e9e9e",
    },
    "In Process": {
        label: "In Process",
        color: "#ff9800",
    },
    close: {
        label: "Close",
        color: "#4caf50",
    },
    Cancel: {
        label: "Cancel",
        color: "#90a4ae",
    },  hold: {
        label: "Hold",
        color: "#f44336",
    }
};

export default function Selector({ value, setValue }) {
    const [status, setStatus] = useState("");
    const handleSetStatus = (newStatus) => {
        setStatus(newStatus);
        setValue(newStatus);
    }
    useEffect(() => {
        setStatus(value || "Open");
    }, [value]);
    return (
        <Stack spacing={1} alignItems="flex-start">
            <Chip
                label={STATUS[status]?.label || "Unknown"}
              
                icon={null}
                deleteIcon={<PlayArrowIcon />}
                onDelete={() => {
                    const statusKeys = Object.keys(STATUS);
                    const currentIndex = statusKeys.indexOf(status);
                    const nextIndex = (currentIndex + 1) % statusKeys.length;
                    handleSetStatus(statusKeys[nextIndex]);
                 }}
                sx={{
                    backgroundColor:  STATUS[status]?.color || "#000",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "11px",
                    height: 26,
                    borderRadius: "4px",
                    "& .MuiChip-deleteIcon": {
                        color: "#fff",
                        marginRight: "2px",
                    },
                }}
            />
        </Stack>
    );
}
