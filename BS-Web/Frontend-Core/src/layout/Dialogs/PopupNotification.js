import { Box, Button, Dialog, DialogContent, IconButton, Typography, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight, Close } from "@mui/icons-material";
import { useEffect, useState } from "react";

export default function PopupNotification({ data }) {
    const [open, setOpen] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const theme = useTheme();
    const safeData = Array.isArray(data) ? data : [];

    const slides = safeData.flatMap((item) => {
        if (Array.isArray(item.list) && item.list.length > 0) {
            return item.list.map((img) => ({
                title: item.title,
                description: item.description,
                imageUrl: img.imageUrl,
                link: img.link || item.link,
                name: img.name,
            }));
        }

        if (Array.isArray(item.image) && item.image.length > 0) {
            return item.image.flatMap((imgGroup) => {
                if (Array.isArray(imgGroup?.list) && imgGroup.list.length > 0) {
                    return imgGroup.list.map((img) => ({
                        title: item.title,
                        description: item.description,
                        imageUrl: img.imageUrl,
                        link: imgGroup.link || item.link,
                        name: img.name,
                    }));
                }

                return [{
                    title: item.title,
                    description: item.description,
                    imageUrl: imgGroup.imageUrl,
                    link: imgGroup.link || item.link,
                    name: imgGroup.name,
                }];
            });
        }

        return [{
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            link: item.link,
            name: item.name,
        }];
    });
    const total = slides.length;
    const currentItem = slides[activeIndex] || {};
    const showNav = total > 1;

    const handleNext = () => {
        if (total === 0) return;
        setActiveIndex((prev) => (prev + 1) % total);
    };

    const handlePrev = () => {
        if (total === 0) return;
        setActiveIndex((prev) => (prev - 1 + total) % total);
    };

    const handleKeyDown = (event) => {
        if (!showNav) return;
        if (event.key === "ArrowRight") handleNext();
        if (event.key === "ArrowLeft") handlePrev();
    };

    useEffect(() => {
        setActiveIndex(0);
    }, [data]);

    useEffect(() => {
        if (!open || !showNav) return undefined;
        const intervalId = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % total);
        }, 4000);

        return () => clearInterval(intervalId);
    }, [open, showNav, total]);

    if (slides.length === 0) return null;

    return (
        <Dialog
            open={open}
            // fullScreen
            maxWidth="lg"
            fullWidth
            onClose={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            PaperProps={{ sx: { overflow: "hidden" } }}
        >
            <DialogContent sx={{ p: 0, height: "100vh", width: "100%", overflow: "hidden" }}>
                <Box sx={{ position: "relative", height: "100%", width: "100%", bgcolor: "background.default" }}>
                    <img
                        src={currentItem.imageUrl}
                        alt={currentItem.title || "popup"}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            objectPosition: "center",
                        }}
                    />

                    {showNav && (
                        <>
                            <IconButton
                                aria-label="previous"
                                onClick={handlePrev}
                                sx={{
                                    position: "absolute",
                                    left: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    bgcolor: "rgba(0, 0, 0, 0.45)",
                                    color: "common.white",
                                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.65)" },
                                }}
                            >
                                <ChevronLeft fontSize="large" />
                            </IconButton>
                            <IconButton
                                aria-label="next"
                                onClick={handleNext}
                                sx={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    bgcolor: "rgba(0, 0, 0, 0.45)",
                                    color: "common.white",
                                    "&:hover": { bgcolor: theme => `rgba(0, 0, 0, ${theme.palette.mode === "dark" ? 0.75 : 0.65})` },
                                }}
                            >
                                <ChevronRight fontSize="large" />
                            </IconButton>
                        </>
                    )}

                    <IconButton
                        aria-label="close"
                        onClick={() => setOpen(false)}
                        sx={{
                            position: "absolute",
                            right: 16,
                            top: 16,
                            bgcolor: "rgba(0, 0, 0, 0.45)",
                            color: "common.white",
                            "&:hover": { bgcolor: theme => `rgba(0, 0, 0, ${theme.palette.mode === "dark" ? 0.75 : 0.65})` },
                        }}
                    >
                        <Close />
                    </IconButton>

                    <Box
                        sx={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            px: 3,
                            py: 3,
                            color: "common.white",
                            background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)",
                        }}
                    >
                        <Typography
                            variant="h3"
                            sx={{
                                mb: 1,
                                fontWeight: 800,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                            }}
                        >
                            {currentItem.title}
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{
                                mb: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                                fontSize: "1.1rem",
                                lineHeight: 1.5,
                            }}
                        >
                            {currentItem.description}
                            {currentItem.name ? ` - ${currentItem.name}` : ""}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                            {currentItem.link && (
                                <Button
                                    variant="contained"
                                    sx={{
                                        bgcolor: theme.palette.primary.main,
                                        fontWeight: 600,
                                        px: 3,
                                        py: 1,
                                        "&:hover": {
                                            bgcolor: theme.palette.primary.dark,
                                            boxShadow: theme.shadows[8],
                                        },
                                    }}
                                    onClick={() => currentItem.link && window.open(currentItem.link, "_blank")}
                                >
                                    ดูรายละเอียด
                                </Button>
                            )}
                            <Button
                                variant="outlined"
                                sx={{
                                    borderColor: "common.white",
                                    color: "common.white",
                                    fontWeight: 600,
                                    px: 3,
                                    py: 1,
                                    "&:hover": {
                                        borderColor: "common.white",
                                        bgcolor: "rgba(255,255,255,0.1)",
                                    },
                                }}
                                onClick={() => setOpen(false)}
                            >
                                ปิด
                            </Button>
                            {showNav && (
                                <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
                                    {slides.map((_, index) => (
                                        <Box
                                            key={`dot-${index}`}
                                            onClick={() => setActiveIndex(index)}
                                            sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                bgcolor: index === activeIndex ? "common.white" : "rgba(255,255,255,0.4)",
                                                cursor: "pointer",
                                                transition: "all 0.3s ease",
                                                "&:hover": {
                                                    bgcolor: "rgba(255,255,255,0.7)",
                                                },
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
