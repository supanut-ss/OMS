import { createTheme, alpha } from "@mui/material/styles";

const LIGHT_THEME_PRESETS = {
  "theme-1": {
    labelTh: "อินดิโก้",
    labelEn: "Indigo",
    shades: {
      50: "#e8eaf6",
      100: "#c5cae9",
      200: "#9fa8da",
      300: "#7986cb",
      400: "#5c6bc0",
      500: "#3f51b5",
      600: "#3949ab",
      700: "#303f9f",
      800: "#283593",
      900: "#1a237e",
    },
  },
  "theme-2": {
    labelTh: "บลู",
    labelEn: "Blue",
    shades: {
      50: "#e7e9fd",
      100: "#d0d9ff",
      200: "#afbfff",
      300: "#91a7ff",
      400: "#738ffe",
      500: "#5677fc",
      600: "#4e6cef",
      700: "#455ede",
      800: "#3b50ce",
      900: "#2a36b1",
    },
  },
  "theme-purple": {
    labelTh: "ม่วง",
    labelEn: "Purple",
    shades: {
      50: "#f3e5f5",
      100: "#e1bee7",
      200: "#ce93d8",
      300: "#ba68c8",
      400: "#ab47bc",
      500: "#9c27b0",
      600: "#8e24aa",
      700: "#7b1fa2",
      800: "#6a1b9a",
      900: "#6a1b9a",
    },
  },
  "theme-teal": {
    labelTh: "ทีล",
    labelEn: "Teal",
    shades: {
      50: "#e0f2f1",
      100: "#b2dfdb",
      200: "#80cbc4",
      300: "#4db6ac",
      400: "#26a69a",
      500: "#009688",
      600: "#00897b",
      700: "#00796b",
      800: "#00695c",
      900: "#004d40",
    },
  },
  "theme-orange": {
    labelTh: "ส้ม",
    labelEn: "Orange",
    main: "#ff8a4b",
    secondary: "#ef7724",
    shades: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#ff8a4b",
      600: "#ef7724",
      700: "#c75f1b",
      800: "#9a4a14",
      900: "#7c3a10",
    },
  },
  "theme-pastel": {
    labelTh: "ซอฟต์พาสเทล",
    labelEn: "Soft Pastel",
    main: "#9BC2B2",
    secondary: "#9292D1",
    shades: {
      50: "#C5D6BA",
      100: "#F2E9D3",
      200: "#F6C8B6",
      300: "#CA9CAC",
      400: "#9292D1",
      500: "#B6BBC7",
      600: "#D6C3CE",
      700: "#ECD4D4",
      800: "#F5EED8",
      900: "#F5E3CB",
    },
  },
};

const getLightPalette = (themeName) => {
  const preset = LIGHT_THEME_PRESETS[themeName] || LIGHT_THEME_PRESETS["theme-1"];
  const shades = preset.shades;
  const primaryMain = preset.main || shades[500];
  const primaryLight = preset.light || shades[200];
  const primaryDark = preset.dark || shades[700];
  const secondaryMain = preset.secondary || shades[600];
  const secondaryLight = preset.secondaryLight || shades[300];
  const secondaryDark = preset.secondaryDark || shades[800];
  const primaryText = preset.primaryText || "#212121";
  const secondaryText = preset.secondaryText || "#424242";
  return {
    primary: {
      main: primaryMain,
      light: primaryLight,
      dark: primaryDark,
      contrastText: "#fff",
    },
    secondary: {
      main: secondaryMain,
      light: secondaryLight,
      dark: secondaryDark,
      contrastText: "#fff",
    },
    error: {
      main: "#EF4444",
      light: "#F87171",
      dark: "#DC2626",
      contrastText: "#fff",
    },
    warning: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
      contrastText: "#fff",
    },
    info: {
      main: "#3B82F6",
      light: "#60A5FA",
      dark: "#2563EB",
      contrastText: "#fff",
    },
    success: {
      main: "#10B981",
      light: "#34D399",
      dark: "#059669",
      contrastText: "#fff",
    },
    background: {
      default: "#F6F7FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: primaryText,
      secondary: secondaryText,
    },
    divider: alpha(primaryMain, 0.18),
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
      saveButton: primaryMain,
      closeButton: "#F33838",
      addButton: primaryMain,
      accordionHeader: shades[100],
      accordionContent: "#fafafa",
      mainBackground: "#F6F7FA",
      paperBackground: alpha(primaryMain, 0.04),
      priority: {
        urgent: "#d32f2f",
        high: "#ed6c02",
        normal: "#0288d1",
        low: "#9e9e9e",
      },
    },
  };
};

export const getTheme = (mode, themeName = "theme-1") =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? getLightPalette(themeName)
        : {
          // =========================================
          // Modern Glassmorphism Dark Theme
          // =========================================

          // Primary Accent - Cyan Blue (main interactive elements)
          primary: {
            main: "#00D4FF",     // Vibrant Cyan
            light: "#5CE1FF",
            dark: "#00A8CC",
            contrastText: "#000000",
          },

          // Secondary Accent - Purple (complementary)
          secondary: {
            main: "#A855F7",     // Electric Purple
            light: "#C084FC",
            dark: "#7C3AED",
            contrastText: "#FFFFFF",
          },

          // Status Colors - Vibrant but not harsh
          error: {
            main: "#FF6B6B",     // Soft Coral Red
            light: "#FF8E8E",
            dark: "#FF4757",
            contrastText: "#FFFFFF",
          },
          warning: {
            main: "#FFD93D",     // Golden Yellow
            light: "#FFE566",
            dark: "#F0C000",
            contrastText: "#000000",
          },
          info: {
            main: "#4ECDC4",     // Teal Cyan
            light: "#7DD9D2",
            dark: "#3DBDB5",
            contrastText: "#000000",
          },
          success: {
            main: "#6BCB77",     // Fresh Green
            light: "#8DD896",
            dark: "#4CAF50",
            contrastText: "#000000",
          },

          // Background - Deep dark for glass effect contrast
          background: {
            default: "#0D0D0F",  // Near Black
            paper: "rgba(20, 20, 25, 0.98)",  // Glass Card
          },

          // Text - High contrast for accessibility
          text: {
            primary: "#FFFFFF",    // Pure White
            secondary: "#A0A0A0",  // Soft Gray
          },

          // Divider - Subtle glass edge
          divider: "rgba(255, 255, 255, 0.08)",

          // Grey Scale - Glassmorphism optimized
          grey: {
            50: "#0D0D0F",   // Deepest
            100: "#141418",   // Dark surface
            200: "#1A1A20",   // Elevated surface 
            300: "#22222A",   // Card background
            400: "#2A2A35",   // Border subtle
            500: "#3A3A45",   // Muted elements
            600: "#6A6A75",   // Disabled text
            700: "#9A9AA5",   // Secondary text
            800: "#CACAD0",   // Primary text light
            900: "#FAFAFA",   // Bright white
          },

          // Custom Glassmorphism Properties
          custom: {
            // Button Colors
            saveButton: "#00D4FF",
            closeButton: "#FF6B6B",
            addButton: "#6BCB77",

            // Glass Card Styling (less transparent for readability)
            glass: {
              background: "rgba(20, 20, 25, 0.96)",
              backgroundHover: "rgba(30, 30, 38, 0.95)",
              border: "rgba(255, 255, 255, 0.08)",
              borderHover: "rgba(255, 255, 255, 0.15)",
              blur: "blur(12px)",
              shadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            },

            // Accordion Glass (more opaque)
            accordionHeader: "rgba(30, 30, 38, 0.95)",
            accordionContent: "rgba(22, 22, 28, 0.98)",

            // Main Backgrounds
            mainBackground: "#0D0D0F",
            paperBackground: "rgba(20, 20, 25, 0.92)",

            // Glow Effects
            glow: {
              primary: "0 0 20px rgba(0, 212, 255, 0.3)",
              secondary: "0 0 20px rgba(168, 85, 247, 0.3)",
              success: "0 0 20px rgba(107, 203, 119, 0.3)",
              error: "0 0 20px rgba(255, 107, 107, 0.3)",
            },

            // Priority with glow-friendly colors
            priority: {
              urgent: "#d32f2f",
              high: "#ed6c02",
              normal: "#0288d1",
              low: "#9e9e9e",
            },

            // Section Colors with transparency
            sectionOpen: "rgba(0, 212, 255, 0.12)",
            sectionInProcess: "rgba(255, 217, 61, 0.12)",
            sectionClose: "rgba(107, 203, 119, 0.12)",
          },
        }),
    },
    typography: {
      fontFamily: "'Prompt','Roboto', 'Inter', 'Helvetica', 'Arial', sans-serif",

      h1: {
        fontSize: "clamp(2rem, 4vw, 2.75rem)",
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontSize: "clamp(1.75rem, 3.2vw, 2.25rem)",
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      },
      h3: {
        fontSize: "clamp(1.5rem, 2.8vw, 2rem)",
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
        fontWeight: 600,
        lineHeight: 1.4,
      },

      body1: {
        fontSize: "clamp(0.875rem, 1vw, 0.9375rem)",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "clamp(0.8rem, 0.9vw, 0.8125rem)",
        lineHeight: 1.5,
      },

      button: {
        fontSize: "clamp(0.75rem, 0.9vw, 0.8125rem)",
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
          // Custom scrollbar styling - Glassmorphism
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: themeParam.palette.mode === 'dark'
              ? '#3A3A45 #0D0D0F'
              : '#c1c1c1 #f1f1f1',
          },
          '*::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '*::-webkit-scrollbar-track': {
            background: themeParam.palette.mode === 'dark' ? '#0D0D0F' : '#f1f1f1',
          },
          '*::-webkit-scrollbar-thumb': {
            background: themeParam.palette.mode === 'dark' ? '#3A3A45' : '#c1c1c1',
            borderRadius: '4px',
            border: themeParam.palette.mode === 'dark'
              ? '2px solid #0D0D0F'
              : '2px solid #f1f1f1',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: themeParam.palette.mode === 'dark' ? '#6A6A75' : '#a8a8a8',
          },
          '*::-webkit-scrollbar-corner': {
            background: themeParam.palette.mode === 'dark' ? '#0D0D0F' : '#f1f1f1',
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
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
          }),
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
            },
          }),
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
          containedPrimary: ({ theme }) => ({
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }),
          containedSecondary: ({ theme }) => ({
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
            "&:hover": {
              backgroundColor: theme.palette.secondary.dark,
            },
          }),
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
