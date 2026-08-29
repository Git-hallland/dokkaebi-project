"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ThemeName = "dark" | "light";

type ThemeContextValue = Readonly<{
  theme: ThemeName;
  toggleTheme: () => void;
}>;

const THEME_STORAGE_KEY = "dokkaebiTheme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme: ThemeName = storedTheme === "light" ? "light" : "dark";

    applyTheme(initialTheme);
    const updateTimer = window.setTimeout(() => setTheme(initialTheme), 0);
    return () => window.clearTimeout(updateTimer);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((currentTheme) => {
          const nextTheme = currentTheme === "dark" ? "light" : "dark";
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
          applyTheme(nextTheme);
          return nextTheme;
        });
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
