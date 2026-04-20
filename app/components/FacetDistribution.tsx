import { useState } from "react";
import type { FacetValue } from "../lib/queries";

type Props = {
  label: string;
  values: FacetValue[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onReset: () => void;
  /** Max rows shown before a "+N más" expander. */
  previewRows?: number;
};

// Tick positions rendered under the bar chart: 0, half, max. Keeps the
// visual compact and matches the Graphext-style reference.
function buildAxisTicks(max: number): number[] {
  if (max <= 0) return [0];
  const ticks: number[] = [0, max / 2, max];
  return ticks;
}

function formatPctAxis(pct: number): string {
  if (pct === 0) return "0%";
  if (pct < 0.01) return `${(pct * 100).toFixed(1)}%`;
  return `${Math.round(pct * 100)}%`;
}

/**
 * Compact horizontal distribution chart for a single filter facet. Each row
 * is clickable to toggle its value into the active filter set — selected
 * rows get the primary colour, unselected a muted neutral. The label sits
 * inside the bar (or to the right when the bar is too short to host it).
 */
export function FacetDistribution({
  label,
  values,
  selected,
  onToggle,
  onReset,
  previewRows = 10,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const max = values.reduce((m, v) => Math.max(m, v.pct), 0);
  const ticks = buildAxisTicks(max);
  const visible = expanded ? values : values.slice(0, previewRows);
  const hidden = values.length - visible.length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-base-content/80">
          {label}
        </span>
        {selected.size > 0 && (
          <button
            type="button"
            className="link link-hover text-[11px] text-base-content/60"
            onClick={onReset}
          >
            reset
          </button>
        )}
      </div>
      <ul className="space-y-0.5">
        {visible.map((v) => {
          const isSelected = selected.has(v.value);
          const anySelected = selected.size > 0;
          // Width scaled to the max value inside this facet so the top bar
          // always fills the row and ordering is easy to read at a glance.
          const widthPct = max > 0 ? Math.max(2, (v.pct / max) * 100) : 0;
          const barClass = isSelected
            ? "bg-primary/90"
            : anySelected
              ? "bg-base-content/10"
              : "bg-primary/25";
          const textClass = isSelected
            ? "text-primary-content"
            : "text-base-content";
          return (
            <li key={v.value}>
              <button
                type="button"
                onClick={() => onToggle(v.value)}
                className="group relative block h-5 w-full overflow-hidden rounded-sm text-left transition-colors hover:ring-1 hover:ring-primary/40"
                title={`${v.count.toLocaleString("es-ES")} respuestas · ${(v.pct * 100).toFixed(1)}%`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 ${barClass}`}
                  style={{ width: `${widthPct}%` }}
                />
                <span
                  className={`relative z-10 flex h-full items-center justify-between gap-2 px-1.5 text-[11px] leading-tight ${textClass}`}
                >
                  <span className="truncate">{v.value}</span>
                  <span className="shrink-0 tabular-nums opacity-70">
                    {(v.pct * 100).toFixed(1)}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {values.length > previewRows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="link link-hover text-[11px] text-base-content/60"
        >
          {expanded ? "− mostrar menos" : `+ ${hidden} más`}
        </button>
      )}
      <div
        className="flex h-3 items-center justify-between text-[10px] tabular-nums text-base-content/50"
        aria-hidden
      >
        {ticks.map((t, i) => (
          <span key={i} className={i === 0 ? "" : i === ticks.length - 1 ? "" : ""}>
            {formatPctAxis(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
