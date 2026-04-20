// Ops-style design tokens inherited from the design handoff (Palantir-ish:
// dense, tabular-nums, mono labels, warm amber accent on cool/warm neutrals).

export type ThemeToken = {
  bg: string;
  bg2: string;
  panel: string;
  panelHi: string;
  line: string;
  lineHi: string;
  text: string;
  textDim: string;
  textMute: string;
  accent: string;
  accentSoft: string;
  accentLine: string;
  good: string;
  bad: string;
  gridSoft: string;
  tooltipBg: string;
};

export const TOKENS: Record<"dark" | "light", ThemeToken> = {
  dark: {
    bg: "#0b0d10",
    bg2: "#0f1216",
    panel: "#14181d",
    panelHi: "#1a1f26",
    line: "#20262e",
    lineHi: "#2a3139",
    text: "#e4e7eb",
    textDim: "#9aa3ad",
    textMute: "#6b7580",
    accent: "#f5a524",
    accentSoft: "rgba(245, 165, 36, 0.14)",
    accentLine: "rgba(245, 165, 36, 0.35)",
    good: "#4ade80",
    bad: "#f87171",
    gridSoft: "rgba(255,255,255,0.04)",
    tooltipBg: "rgba(10,12,15,0.96)",
  },
  light: {
    bg: "#f6f4ef",
    bg2: "#efede6",
    panel: "#ffffff",
    panelHi: "#faf8f2",
    line: "#d9d5cb",
    lineHi: "#c7c2b5",
    text: "#17181a",
    textDim: "#55595f",
    textMute: "#878a90",
    accent: "#b86f17",
    accentSoft: "rgba(184, 111, 23, 0.09)",
    accentLine: "rgba(184, 111, 23, 0.35)",
    good: "#1f7a44",
    bad: "#b3261e",
    gridSoft: "rgba(0,0,0,0.04)",
    tooltipBg: "rgba(255,255,255,0.98)",
  },
};

export const MONO =
  '"IBM Plex Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

// Brand colour mappings.
export const PARTY_COLORS: Record<string, string> = {
  PSOE: "#e11d48",
  PP: "#2b7fce",
  VOX: "#65a30d",
  Sumar: "#c8287c",
  Podemos: "#7e22ce",
  Ciudadanos: "#ea580c",
  ERC: "#eab308",
  Junts: "#0d9488",
  "EAJ-PNV": "#4d9845",
  Bildu: "#059669",
  BNG: "#84cc16",
  "Más País": "#14b8a6",
  Otros: "#6b7280",
};

export const BLOC_COLORS: Record<string, string> = {
  Izquierda: "#e11d48",
  Derecha: "#2b7fce",
  Otros: "#9ca3af",
};

// Number formatters.
export const fmtPct = (v: number | null | undefined, decimals = 1): string =>
  v == null || Number.isNaN(v) ? "—" : `${(v * 100).toFixed(decimals)}%`;

export const fmtNum = (n: number): string =>
  new Intl.NumberFormat("es-ES").format(n);

export const fmtSignedPp = (v: number | null | undefined): string => {
  if (v == null || Number.isNaN(v)) return "—";
  const pp = v * 100;
  const sign = pp > 0 ? "+" : pp < 0 ? "" : "±";
  return `${sign}${pp.toFixed(1)}pp`;
};

export const fmtSignedPct = (v: number | null | undefined): string => {
  if (v == null || Number.isNaN(v)) return "—";
  const pct = v * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "" : "±";
  return `${sign}${pct.toFixed(0)}%`;
};
