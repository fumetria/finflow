import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';
import type { Theme } from './ThemeContext';

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  // Fall back to the OS preference on first visit.
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  // Reflect the theme on <html> (the .dark class drives all token overrides
  // in index.css) and persist the choice.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  );

  return (
    <ThemeContext.Provider
      value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
