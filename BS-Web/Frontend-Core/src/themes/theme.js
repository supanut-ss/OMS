import { createTheme } from "@mui/material/styles";

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: {
              main: "#0B9ED0", // Modern Indigo
              light: "#8B85FF",
              dark: "#4F46E5",
              contrastText: "#fff",
            },
            secondary: {
              main: "#10B981", // Modern Emerald
              light: "#34D399",
              dark: "#059669",
              contrastText: "#fff",
            },
            error: {
              main: "#EF4444", // Modern Red
              light: "#F87171",
              dark: "#DC2626",
              contrastText: "#fff",
            },
            warning: {
              main: "#F59E0B", // Modern Amber
              light: "#FBBF24",
              dark: "#D97706",
              contrastText: "#fff",
            },
            info: {
              main: "#3B82F6", // Modern Blue
              light: "#60A5FA",
              dark: "#2563EB",
              contrastText: "#fff",
            },
            success: {
              main: "#10B981", // Modern Green
              light: "#34D399",
              dark: "#059669",
              contrastText: "#fff",
            },
            background: {
              default: "#FAFBFC", // Ultra Light Gray
              paper: "#FFFFFF",
            },
            text: {
              primary: "#1F2937", // Dark Gray
              secondary: "#6B7280", // Medium Gray
            },
            divider: "#F3F4F6",
            grey: {
              50: "#F9FAFB",
              100: "#F3F4F6",
              200: "#E5E7EB",
              300: "#D1D5DB",
              400: "#9CA3AF",
              500: "#6B7280",
              600: "#4B5563",
              700: "#374151",
              800: "#1F2937",
              900: "#111827",
            },
            custom: {
              saveButton: "#0B9ED0",
              closeButton: "#F33838",
              addButton: "#0B9ED0",
              accordionHeader: "#B2D5D5",
              accordionContent: "#fafafa",
              mainBackground: "#F0F8FF",
              paperBackground: "hsla(215, 15%, 97%, 0.5)",
              priority: {
                urgent: "#d32f2f",
                high: "#ed6c02",
                normal: "#0288d1",
                low: "#9e9e9e",
              },
            },
          }
        : {
            // VS Code Dark Theme Colors
            primary: {
              main: "#007ACC", // VS Code Blue
              light: "#1da1f2",
              dark: "#005a9e",
              contrastText: "#FFFFFF",
            },
            secondary: {
              main: "#3C8C3C", // VS Code Green (git added)
              light: "#4EC94E",
              dark: "#2D6B2D",
              contrastText: "#FFFFFF",
            },
            error: {
              main: "#F14C4C", // VS Code Error Red
              light: "#F48771",
              dark: "#D32F2F",
              contrastText: "#FFFFFF",
            },
            warning: {
              main: "#CCA700", // VS Code Warning Yellow
              light: "#E8B600",
              dark: "#B89500",
              contrastText: "#000000",
            },
            info: {
              main: "#3794FF", // VS Code Info Blue
              light: "#75BEFF",
              dark: "#007ACC",
              contrastText: "#FFFFFF",
            },
            success: {
              main: "#89D185", // VS Code Success Green
              light: "#A8E6A3",
              dark: "#6ABF69",
              contrastText: "#000000",
            },
            background: {
              default: "#1E1E1E", // VS Code Editor Background
              paper: "#252526", // VS Code Sidebar Background
            },
            text: {
              primary: "#D4D4D4", // VS Code Default Text
              secondary: "#9D9D9D", // VS Code Comment Gray
            },
            divider: "#3C3C3C", // VS Code Border
            grey: {
              // VS Code Dark Theme Grey Scale (inverted for dark mode)
              50: "#1E1E1E",   // Darkest - Editor background
              100: "#252526",  // Sidebar background
              200: "#2D2D2D",  // Activity bar background
              300: "#333333",  // Panel background
              400: "#3C3C3C",  // Border color
              500: "#6E6E6E",  // Inactive text
              600: "#9D9D9D",  // Secondary text
              700: "#CCCCCC",  // Primary text lighter
              800: "#D4D4D4",  // Primary text
              900: "#E8E8E8",  // Bright text
            },
            custom: {
              saveButton: "#4FC3F7",
              closeButton: "#F48771",
              addButton: "#4FC3F7",
              accordionHeader: "#2D2D2D",  // VS Code Panel Header
              accordionContent: "#252526", // VS Code Sidebar
              mainBackground: "#1E1E1E",   // VS Code Editor
              paperBackground: "#252526",  // VS Code Sidebar
              priority: {
                urgent: "#F14C4C",
                high: "#CCA700",
                normal: "#3794FF",
                low: "#6E6E6E",
              },
            },
          }),
    },
    typography: {
      fontFamily: "'Roboto', 'Inter', 'Helvetica', 'Arial', sans-serif",
      h1: {
        fontSize: "2.5rem",
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      },
      h3: {
        fontSize: "1.75rem",
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      },
      h4: {
        fontSize: "1.5rem",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: "1.125rem",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.5,
      },
      button: {
        fontWeight: 600,
        textTransform: "none",
        letterSpacing: "0.01em",
      },
    },
    shape: {
      borderRadius: 12, // More rounded corners for modern look
    },
    shadows: [
      "none",
      "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
      "0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)",
      "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)",
      "0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)",
      "0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: (themeParam) => ({
          // Custom scrollbar styling
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: themeParam.palette.mode === 'dark' 
              ? '#6E6E6E #1E1E1E' 
              : '#c1c1c1 #f1f1f1',
          },
          '*::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          '*::-webkit-scrollbar-track': {
            background: themeParam.palette.mode === 'dark' ? '#1E1E1E' : '#f1f1f1',
          },
          '*::-webkit-scrollbar-thumb': {
            background: themeParam.palette.mode === 'dark' ? '#6E6E6E' : '#c1c1c1',
            borderRadius: '5px',
            border: themeParam.palette.mode === 'dark' 
              ? '2px solid #1E1E1E' 
              : '2px solid #f1f1f1',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: themeParam.palette.mode === 'dark' ? '#9D9D9D' : '#a8a8a8',
          },
          '*::-webkit-scrollbar-corner': {
            background: themeParam.palette.mode === 'dark' ? '#1E1E1E' : '#f1f1f1',
          },
        }),
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: "unset",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 600,
            padding: "10px 20px",
          },
          contained: {
            boxShadow: "none",
            "&:hover": {
              boxShadow:
                "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
          },
        },
      },
    },
  });
