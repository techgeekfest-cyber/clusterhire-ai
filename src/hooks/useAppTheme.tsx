import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme = "light" | "dark";
const KEY = "clusterhire-app-theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };
const ThemeContext = createContext<Ctx | null>(null);

/**
 * App-level theme provider, persisted in localStorage. Wrap only the
 * authenticated shell — marketing pages must NOT be wrapped, so the home
 * page never receives the `dark` class and stays light.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readTheme());

  useEffect(() => {
    try { window.localStorage.setItem(KEY, theme); } catch { /* noop */ }
  }, [theme]);

  // Radix menus, dialogs, sheets, and toasts render in document-level
  // portals, outside the themed app wrapper. Mirror the light marker onto
  // the root element so those surfaces inherit the same semantic tokens.
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    return () => document.documentElement.classList.remove("light");
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used inside <AppThemeProvider>");
  return ctx;
}
