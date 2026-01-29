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
        fontSize: "clamp(0.95rem, 1.1vw, 1rem)",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "clamp(0.85rem, 1vw, 0.9rem)",
        lineHeight: 1.5,
      },

      button: {
        fontSize: "clamp(0.8rem, 1vw, 0.875rem)",
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
