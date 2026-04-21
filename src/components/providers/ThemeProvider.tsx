'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sg-theme';

interface ThemeCtx {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setTheme: (p: ThemePreference) => void;
  toggleTheme: () => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'dark',
  preference: 'system',
  setTheme: () => {},
  toggleTheme: () => {},
});

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolvePreference(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [theme, setThemeState] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const initial: ThemePreference = saved ?? 'system';
    const resolved = resolvePreference(initial);
    setPreferenceState(initial);
    setThemeState(resolved);
    applyTheme(resolved);

    // Track OS preference changes — only apply when user hasn't set a manual preference
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next: ResolvedTheme = e.matches ? 'dark' : 'light';
        setThemeState(next);
        applyTheme(next);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (pref: ThemePreference) => {
    setPreferenceState(pref);
    if (pref === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, pref);
    }
    const resolved = resolvePreference(pref);
    setThemeState(resolved);
    applyTheme(resolved);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Ctx.Provider value={{ theme, preference, setTheme, toggleTheme }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  return useContext(Ctx);
}
