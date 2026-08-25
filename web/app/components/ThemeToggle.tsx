"use client";

import { useEffect, useState } from "react";
import { applyTheme, getTheme, toggleTheme, type Theme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>("dark");

  useEffect(() => {
    applyTheme();
    setLocalTheme(getTheme());
  }, []);

  return (
    <button
      type="button"
      onClick={() => setLocalTheme(toggleTheme())}
      aria-pressed={theme === "light"}
      className="btn theme-toggle"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 50,
        minHeight: 44,
        minWidth: 44,
      }}
    >
      {theme === "dark" ? "Claro" : "Escuro"}
    </button>
  );
}
