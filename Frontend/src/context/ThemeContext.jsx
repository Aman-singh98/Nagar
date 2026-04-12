/**
 * @file ThemeContext.jsx
 * Global dark / light theme state.
 *
 * - Persists the user's choice in localStorage under the key "app-theme".
 * - Applies `data-theme="dark"` or `data-theme="light"` to <html>.
 * - Exports `useTheme()` for any component that needs to read or toggle the theme.
 * - The Ant Design ConfigProvider algorithm is wired in App.jsx using this context.
 *
 * Usage:
 *   // Read current theme or toggle it
 *   const { theme, toggleTheme, isDark } = useTheme();
 */

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'app-theme';

/** @param {{ children: React.ReactNode }} props */
export function ThemeProvider({ children }) {
   const [theme, setTheme] = useState(() => {
      // Initialise from localStorage, default to 'dark'
      return localStorage.getItem(STORAGE_KEY) ?? 'light';
   });

   // Apply data-theme attribute to <html> whenever theme changes
   useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(STORAGE_KEY, theme);
   }, [theme]);

   const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

   return (
      <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
         {children}
      </ThemeContext.Provider>
   );
}

/** @returns {{ theme: 'dark'|'light', toggleTheme: () => void, isDark: boolean }} */
export function useTheme() {
   const ctx = useContext(ThemeContext);
   if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
   return ctx;
}
