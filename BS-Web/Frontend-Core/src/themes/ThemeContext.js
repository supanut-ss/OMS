import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';

const ColorModeContext = createContext({ toggleColorMode: () => { }, mode: 'light' });

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function ThemeContextProvider({ children }) {
  // Initialize mode from localStorage or default to 'light'
  const [mode, setMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('theme-mode');
      return savedMode === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('theme-mode', mode);
    } catch (error) {
      console.warn('Failed to save theme mode to localStorage:', error);
    }
  }, [mode]);

  const toggleColorMode = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => getTheme(mode), [mode]);

  const contextValue = useMemo(() => ({ toggleColorMode, mode }), [mode]);

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
