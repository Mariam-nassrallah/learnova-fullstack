// =====================================================
// ThemeContext: light / dark theme
//   theme ("light" | "dark"), toggleTheme()
//   Saved in localStorage. index.html applies the saved theme
//   before React loads, so the page never flashes the wrong one.
// =====================================================
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const THEME_KEY = "learnova-admin-theme";
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
