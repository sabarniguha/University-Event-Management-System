import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'unievents_theme';
const ThemeContext = createContext(null);

const read = () => {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
};

const isDark = (theme) =>
  theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

// Light / dark / system. Only a cosmetic preference is stored in the browser.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(read);

  useEffect(() => {
    const apply = () => document.documentElement.classList.toggle('dark', isDark(theme));
    apply();
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = useCallback((next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage can be blocked; the choice still applies for this visit */
    }
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, dark: isDark(theme) }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
