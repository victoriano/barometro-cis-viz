import { useState } from "react";
import type { FacetValue } from "../lib/queries";
import { MONO, TOKENS, fmtNum } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

type Props = {
  label: string;
  values: FacetValue[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onReset: () => void;
  /** Max rows shown before a "+N más" expander. */
  previewRows?: number;
  dense?: boolean;
};

/**
 * Compact distribution chart per facet, mono/ops style. Each row is a
 * clickable button with a horizontal bar whose width ∝ facet share, value on
 * the left and % on the right (tabular-nums). Amber fill for the currently
 * selected rows, muted neutral for the rest when any row is selected.
 */
export function FacetDistribution({
  label,
  values,
  selected,
  onToggle,
  onReset,
  previewRows = 6,
  dense = true,
}: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  const [expanded, setExpanded] = useState(false);
  const max = values.reduce((m, v) => Math.max(m, v.pct), 0);
  const visible = expanded ? values : values.slice(0, previewRows);
  const hidden = values.length - visible.length;
  const anySelected = selected.size > 0;
  const rowH = dense ? 18 : 22;

  return (
    <div className="mb-3.5">
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className="uppercase"
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: 0.7,
            color: t.textMute,
          }}
        >
          {label}
        </span>
        {anySelected && (
          <button
            type="button"
            onClick={onReset}
            className="uppercase cursor-pointer"
            style={{
              background: "none",
              border: "none",
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: 0.5,
              color: t.accent,
            }}
          >
            reset · {selected.size}
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-0.5">
        {visible.map((v) => {
          const isSel = selected.has(v.value);
          const width = max > 0 ? Math.max(2, (v.pct / max) * 100) : 0;
          const barBg = isSel
            ? t.accent
            : anySelected
              ? theme === "dark"
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.06)"
              : t.accentSoft;
          return (
            <li key={v.value}>
              <button
                type="button"
                onClick={() => onToggle(v.value)}
                title={`${fmtNum(v.count)} resp · ${(v.pct * 100).toFixed(1)}%`}
                className="relative w-full cursor-pointer overflow-hidden p-0 text-left"
                style={{
                  height: rowH,
                  background: "transparent",
                  border: `1px solid ${isSel ? t.accent : "transparent"}`,
                  borderRadius: 2,
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 transition-[width] duration-150"
                  style={{ width: `${width}%`, background: barBg }}
                />
                <span
                  className="relative z-10 flex h-full items-center justify-between gap-2 px-1.5"
                  style={{
                    fontFamily: MONO,
                    fontSize: dense ? 10 : 10.5,
                    fontWeight: isSel ? 600 : 400,
                    color: isSel ? "#0b0d10" : t.text,
                  }}
                >
                  <span className="truncate">{v.value}</span>
                  <span
                    className="tabular-nums"
                    style={{ opacity: isSel ? 0.8 : 0.65 }}
                  >
                    {(v.pct * 100).toFixed(1)}
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
          className="mt-1 cursor-pointer p-0"
          style={{
            background: "none",
            border: "none",
            fontFamily: MONO,
            fontSize: 9.5,
            letterSpacing: 0.4,
            color: t.textMute,
          }}
        >
          {expanded ? "− mostrar menos" : `+ ${hidden} más`}
        </button>
      )}
    </div>
  );
}
