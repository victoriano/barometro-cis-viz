import { useEffect, useState } from "react";

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
    // No data-theme lets DaisyUI fall back to the --default / --prefersdark
    // rule configured in app.css, which honours the OS color-scheme.
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("auto");

  // Hydrate from localStorage on mount (SPA: no SSR mismatch to worry about).
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

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: "auto", label: "Auto", icon: "🖥️" },
    { value: "light", label: "Claro", icon: "☀️" },
    { value: "dark", label: "Oscuro", icon: "🌙" },
  ];

  return (
    <div
      role="group"
      aria-label="Tema"
      className="join border-base-300 border"
    >
      {options.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => update(opt.value)}
            aria-pressed={active}
            className={`btn btn-sm join-item ${active ? "btn-primary" : "btn-ghost"}`}
          >
            <span aria-hidden>{opt.icon}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
