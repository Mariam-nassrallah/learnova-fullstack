// =====================================================
// ThemeToggle: round icon button that switches light / dark
// Moon in light mode, sun in dark mode. The icon turns a
// little after each click (not on the first render).
// =====================================================
import { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const [clicked, setClicked] = useState(false);
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button type="button" className={`icon-btn theme-toggle ${className}`} aria-label={label} title={label}
      onClick={() => { setClicked(true); toggleTheme(); }}>
      {/* key={theme} remounts the icon so the turn animation plays again */}
      <i key={theme} className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon-stars"} ${clicked ? "spin" : ""}`}></i>
    </button>
  );
}
