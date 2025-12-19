import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import secureStorage from '../utils/SecureStorage';

const ColorModeContext = createContext({ toggleColorMode: () => { }, mode: 'light' });

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function ThemeContextProvider({ children }) {
  // Initialize mode from secureStorage or default to 'light'
  const [mode, setMode] = useState(() => {
    try {
      const savedMode = secureStorage.get('theme-mode');
      return savedMode === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
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

