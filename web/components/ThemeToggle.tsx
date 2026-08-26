"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  nextThemePreference,
  readThemePreference,
  themeLabel,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/theme";

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    const current = readThemePreference();
    setPref(current);
    applyTheme(current);
  }, []);

  function cycle() {
    const next = nextThemePreference(readThemePreference());
    writeThemePreference(next);
    applyTheme(next);
    setPref(next);
  }

  return (
    <button
      type="button"
      className="btn theme-toggle"
      onClick={cycle}
      aria-label={themeLabel(pref)}
      title={themeLabel(pref)}
    >
      {themeLabel(pref)}
    </button>
  );
}
