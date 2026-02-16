import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import secureStorage from '../utils/SecureStorage';

const ColorModeContext = createContext({
  toggleColorMode: () => { },
  mode: 'light',
  themeName: 'theme-1',
  setThemeName: () => { },
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function ThemeContextProvider({ children }) {
  const supportedThemes = new Set([
    "theme-1",
    "theme-2",
    "theme-purple",
    "theme-teal",
    "theme-orange",
    "theme-pastel",
  ]);

  // Initialize mode from secureStorage or default to 'light'
  const [mode, setMode] = useState(() => {
    try {
      const savedMode = secureStorage.get('theme-mode');
      return savedMode === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Initialize theme palette from secureStorage or default to 'theme-1'
  const [themeName, setThemeName] = useState(() => {
    try {
      const savedTheme = secureStorage.get('theme');
      return supportedThemes.has(savedTheme) ? savedTheme : 'theme-1';
    } catch {
      return 'theme-1';
    }
  });

  // Save mode to secureStorage whenever it changes
  useEffect(() => {
    try {
      secureStorage.set('theme-mode', mode);
    } catch (error) {
      console.warn('Failed to save theme mode to secureStorage:', error);
    }
  }, [mode]);

  useEffect(() => {
    try {
      secureStorage.set('theme', themeName);
    } catch (error) {
      console.warn('Failed to save theme palette to secureStorage:', error);
    }
  }, [themeName]);

  const toggleColorMode = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => getTheme(mode, themeName), [mode, themeName]);

  const contextValue = useMemo(
    () => ({ toggleColorMode, mode, themeName, setThemeName }),
    [mode, themeName]
  );

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

