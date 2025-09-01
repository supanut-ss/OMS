import React, { createContext, useState, useMemo, useContext } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';

const ColorModeContext = createContext({ toggleColorMode: () => { } });

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState('light');

  const toggleColorMode = () => setMode(prev => (prev === 'light' ? 'dark' : 'light'));

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={{ toggleColorMode, mode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
