import { createTheme } from "@mui/material/styles";

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: {
              main: "#6366F1", // Modern Indigo
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
          }
        : {
            primary: {
              main: "#8B85FF", // Lighter Indigo for dark mode
              light: "#A5A0FF",
              dark: "#6366F1",
              contrastText: "#000000",
            },
            secondary: {
              main: "#34D399", // Lighter Emerald for dark mode
              light: "#6EE7B7",
              dark: "#10B981",
              contrastText: "#000000",
            },
            error: {
              main: "#F87171", // Lighter Red for dark mode
              light: "#FCA5A5",
              dark: "#EF4444",
              contrastText: "#000000",
            },
            warning: {
              main: "#FBBF24", // Lighter Amber for dark mode
              light: "#FCD34D",
              dark: "#F59E0B",
              contrastText: "#000000",
            },
            info: {
              main: "#60A5FA", // Lighter Blue for dark mode
              light: "#93C5FD",
              dark: "#3B82F6",
              contrastText: "#000000",
            },
            success: {
              main: "#34D399", // Lighter Green for dark mode
              light: "#6EE7B7",
              dark: "#10B981",
              contrastText: "#000000",
            },
            background: {
              default: "#0F172A", // Dark Slate
              paper: "#1E293B", // Lighter Dark Slate
            },
            text: {
              primary: "#F1F5F9", // Very Light Gray
              secondary: "#CBD5E1", // Light Gray
            },
            divider: "#334155",
            grey: {
              50: "#0F172A",
              100: "#1E293B",
              200: "#334155",
              300: "#475569",
              400: "#64748B",
              500: "#94A3B8",
              600: "#CBD5E1",
              700: "#E2E8F0",
              800: "#F1F5F9",
              900: "#F8FAFC",
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
            borderRadius: 12,
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
