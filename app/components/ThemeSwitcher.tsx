import { useEffect, useState } from "react";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

type Theme = "auto" | "light" | "dark";
const STORAGE_KEY = "barometro-cis-viz:theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "auto";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

/** Segmented mono toggle used in the topbar. Defaults to "auto". */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("auto");
  const resolved = useResolvedTheme();
  const t = TOKENS[resolved];

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const update = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    if (next === "auto") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: 0.5,
    background: active ? t.accent : "transparent",
    color: active ? "#0b0d10" : t.textDim,
    border: `1px solid ${t.line}`,
    cursor: "pointer",
    textTransform: "uppercase",
    marginLeft: -1,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      <button
        type="button"
        onClick={() => update("dark")}
        style={buttonStyle(theme === "dark")}
        title="Modo oscuro"
      >
        ☾ oscuro
      </button>
      <button
        type="button"
        onClick={() => update("light")}
        style={buttonStyle(theme === "light")}
        title="Modo claro"
      >
        ☀ claro
      </button>
      <button
        type="button"
        onClick={() => update("auto")}
        style={buttonStyle(theme === "auto")}
        title="Según SO"
      >
        ◐ auto
      </button>
    </div>
  );
}
