/**
 * Data: 2026-05-12 20:09
 * Opis: ThemeProvider wspierający tryb jasny, ciemny i auto (systemowy).
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { userData, updateUserSettings } = useAuth();
  const [theme, setThemeState] = useState<Theme>((userData?.theme as Theme) || 'auto');

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    if (userData) {
      await updateUserSettings({ theme: newTheme });
    }
  };

  useEffect(() => {
    if (userData?.theme) {
      setThemeState(userData.theme as Theme);
    }
  }, [userData?.theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      
      const effectiveTheme = theme === 'auto' 
        ? (mediaQuery.matches ? 'dark' : 'light') 
        : theme;
      
      root.classList.add(effectiveTheme);
    };

    applyTheme();

    if (theme === 'auto') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProviderPrimary');
  return context;
};
