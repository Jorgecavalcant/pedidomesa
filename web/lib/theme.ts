"use client";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "pm_theme";

const VALID: ThemePreference[] = ["light", "dark", "system"];

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return VALID.includes(stored as ThemePreference)
      ? (stored as ThemePreference)
      : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(pref: ThemePreference) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore
  }
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let mediaBound = false;

export function applyTheme(pref?: ThemePreference) {
  if (typeof window === "undefined") return;
  const current = pref ?? readThemePreference();
  const resolved = resolveTheme(current);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;

  if (!mediaBound) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (readThemePreference() === "system") {
        applyTheme("system");
      }
    });
    mediaBound = true;
  }
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  switch (current) {
    case "system":
      return "light";
    case "light":
      return "dark";
    default:
      return "system";
  }
}

export function themeLabel(pref: ThemePreference): string {
  switch (pref) {
    case "light":
      return "Tema: claro";
    case "dark":
      return "Tema: escuro";
    default:
      return "Tema: sistema";
  }
}

/** @deprecated use readThemePreference + resolveTheme */
export function getTheme(): ResolvedTheme {
  return resolveTheme(readThemePreference());
}

/** @deprecated use nextThemePreference cycle */
export function toggleTheme(): ResolvedTheme {
  const next = nextThemePreference(readThemePreference());
  writeThemePreference(next);
  applyTheme(next);
  return resolveTheme(next);
}

export function setTheme(t: ResolvedTheme): void {
  writeThemePreference(t);
  applyTheme(t);
}
