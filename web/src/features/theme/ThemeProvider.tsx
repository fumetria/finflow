import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';
import type { Theme } from './ThemeContext';

const CYCLE: Theme[] = ['light', 'dark', 'system'];

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyDarkClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyDarkClass(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyDarkClass(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    applyDarkClass(theme === 'dark');
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => CYCLE[(CYCLE.indexOf(t) + 1) % CYCLE.length]!),
    [],
  );

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, isSystem: theme === 'system', toggleTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
