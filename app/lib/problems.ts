// Canonical mapping from problem labels (after SQL normalization) to a stable
// colour + emoji + short display label. Keeping it in one place means chart
// colours don't drift when the top-N set changes because of a filter.

export type ProblemMeta = { color: string; emoji: string; short: string };

export const PROBLEM_META: Record<string, ProblemMeta> = {
  "El paro": { color: "#d62728", emoji: "💼", short: "Paro" },
  "Crisis económica": { color: "#ff7f0e", emoji: "📉", short: "Crisis económica" },
  "Problemas políticos": { color: "#9467bd", emoji: "🏛️", short: "Política (general)" },
  "La sanidad": { color: "#2ca02c", emoji: "🏥", short: "Sanidad" },
  "Mal comportamiento políticos": { color: "#8c564b", emoji: "😠", short: "Mal comp. políticos" },
  "La vivienda": { color: "#e377c2", emoji: "🏠", short: "Vivienda" },
  "Calidad del empleo": { color: "#bcbd22", emoji: "⚒️", short: "Calidad del empleo" },
  "Gobierno y partidos": { color: "#17becf", emoji: "🎭", short: "Gobierno y partidos" },
  "La inmigración": { color: "#1f77b4", emoji: "🌍", short: "Inmigración" },
  "La corrupción y el fraude": { color: "#7f7f7f", emoji: "💰", short: "Corrupción" },
  "La educación": { color: "#c49c94", emoji: "🎓", short: "Educación" },
  "Lo que hacen los partidos políticos": { color: "#aec7e8", emoji: "🗳️", short: "Acción partidos" },
  "Problemas de índole social": { color: "#dbdb8d", emoji: "🧑‍🤝‍🧑", short: "Problemas sociales" },
  "COVID-19": { color: "#ffbb78", emoji: "🦠", short: "COVID-19" },
  "La crisis de valores": { color: "#c5b0d5", emoji: "💔", short: "Crisis de valores" },
  "Los extremismos": { color: "#ef4444", emoji: "🔥", short: "Extremismos" },
  "El cambio climático": { color: "#22c55e", emoji: "🌡️", short: "Clima" },
  "Las desigualdades": { color: "#ff9896", emoji: "⚖️", short: "Desigualdad" },
  "La inseguridad ciudadana": { color: "#f7b6d2", emoji: "🚨", short: "Inseguridad" },
  "Falta de acuerdos": { color: "#9edae5", emoji: "🤝", short: "Falta de acuerdos" },
  "Funcionamiento servicios públicos": { color: "#393b79", emoji: "🏢", short: "Servicios públicos" },
  "Juventud": { color: "#8c6d31", emoji: "🧑‍🎓", short: "Juventud" },
  "Otras respuestas": { color: "#6b7280", emoji: "❓", short: "Otras respuestas" },
};

const FALLBACK_COLORS = [
  "#475569", "#0ea5e9", "#14b8a6", "#f59e0b",
  "#84cc16", "#a855f7", "#ec4899", "#06b6d4",
];

/** Deterministic fallback colour derived from the label string. */
function hashColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
}

export function problemColor(label: string): string {
  return PROBLEM_META[label]?.color ?? hashColor(label);
}

export function problemEmoji(label: string): string {
  return PROBLEM_META[label]?.emoji ?? "•";
}

export function problemShort(label: string): string {
  return PROBLEM_META[label]?.short ?? label;
}

/** Decorate a series name with its emoji for the legend / endLabel. */
export function problemLegendLabel(label: string): string {
  const meta = PROBLEM_META[label];
  if (!meta) return label;
  return `${meta.emoji} ${meta.short}`;
}
