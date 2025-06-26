import React from "react";

// PUBLIC_INTERFACE
/**
 * Theme toggle button.
 */
function ThemeToggle({ theme, onToggle }) {
  return (
    <button 
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === "light" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
export default ThemeToggle;
