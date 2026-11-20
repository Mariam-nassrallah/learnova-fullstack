// =====================================================
// ThemeContext: light / dark theme
//   theme ("light" | "dark"), toggleTheme()
//   Saved in localStorage. index.html applies the saved theme
//   before React loads, so the page never flashes the wrong one.
// =====================================================
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const THEME_KEY = "learnova-admin-theme";

// Phone browsers color their bar / status bar area with <meta name="theme-color">:
// the same solid color as the top bar (--topbar in admin.css)
export const THEME_COLORS = { light: "#FBF6F9", dark: "#120B14" };
export function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}
const ThemeContext = createContext(null);

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light"; // storage blocked: use the default
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(savedTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-bs-theme", theme); // Bootstrap parts (close buttons, selects) follow too
    setThemeColor(THEME_COLORS[theme]);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked: the theme still works for this visit */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
