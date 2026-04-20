import { useEffect, useState } from "react";

type Resolved = "light" | "dark";

function resolve(): Resolved {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return "dark";
  if (attr === "light") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Returns the effectively applied theme ("light" or "dark"), tracking both the
 * explicit ``data-theme`` override set by ``ThemeSwitcher`` and the OS
 * ``prefers-color-scheme`` when the user picked "Auto".
 */
export function useResolvedTheme(): Resolved {
  const [theme, setTheme] = useState<Resolved>("light");

  useEffect(() => {
    setTheme(resolve());

    const observer = new MutationObserver(() => setTheme(resolve()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => setTheme(resolve());
    mq.addEventListener("change", onMedia);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", onMedia);
    };
  }, []);

  return theme;
}
