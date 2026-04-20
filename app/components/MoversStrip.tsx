import { useRef, useState } from "react";
import { MONO, TOKENS, fmtPct, fmtSignedPp } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

export type Mover = {
  kind: "voto" | "problema" | "bloque";
  key: string;
  label: string;
  color: string;
  last: number;
  delta: number | null;
};

type Props = {
  movers: Mover[];
  window: number;
  maxWindow: number;
  onWindowChange: (n: number) => void;
};

const PRESET_WINDOWS = [1, 3, 6, 12];

export function MoversStrip({ movers, window: windowMonths, maxWindow, onWindowChange }: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  const [customOpen, setCustomOpen] = useState(
    () => !PRESET_WINDOWS.includes(windowMonths),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const presetActive = (n: number) => !customOpen && windowMonths === n;
  const isCustomValue = !PRESET_WINDOWS.includes(windowMonths);

  return (
    <div
      style={{
        border: `1px solid ${t.line}`,
        borderRadius: 3,
        background: t.panel,
      }}
    >
      <div
        style={{
          padding: "8px 10px 8px 14px",
          borderBottom: `1px solid ${t.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 0.8,
          color: t.textDim,
          textTransform: "uppercase",
        }}
      >
        <span>
          ▸ Mayores cambios · últimos {windowMonths}{" "}
          {windowMonths === 1 ? "mes" : "meses"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: t.textMute }}>ventana</span>
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {PRESET_WINDOWS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onWindowChange(n);
                  setCustomOpen(false);
                }}
                style={{
                  padding: "3px 9px",
                  fontFamily: MONO,
                  fontSize: 9.5,
                  letterSpacing: 0.4,
                  background: presetActive(n) ? t.accent : "transparent",
                  color: presetActive(n) ? "#0b0d10" : t.textDim,
                  border: `1px solid ${presetActive(n) ? t.accent : t.line}`,
                  cursor: "pointer",
                  marginLeft: -1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {n}m
              </button>
            ))}
            {customOpen ? (
              <input
                ref={inputRef}
                type="number"
                min={1}
                max={Math.max(1, maxWindow)}
                value={windowMonths}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10) || 1;
                  const clamped = Math.max(1, Math.min(maxWindow, parsed));
                  onWindowChange(clamped);
                }}
                onBlur={() => {
                  if (PRESET_WINDOWS.includes(windowMonths)) setCustomOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                autoFocus
                style={{
                  width: 54,
                  padding: "3px 6px",
                  fontFamily: MONO,
                  fontSize: 9.5,
                  background: t.accent,
                  color: "#0b0d10",
                  border: `1px solid ${t.accent}`,
                  marginLeft: -1,
                  outline: "none",
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "center",
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(true);
                  if (PRESET_WINDOWS.includes(windowMonths)) onWindowChange(9);
                }}
                style={{
                  padding: "3px 9px",
                  fontFamily: MONO,
                  fontSize: 9.5,
                  letterSpacing: 0.4,
                  background: isCustomValue ? t.accent : "transparent",
                  color: isCustomValue ? "#0b0d10" : t.textDim,
                  border: `1px solid ${isCustomValue ? t.accent : t.line}`,
                  cursor: "pointer",
                  marginLeft: -1,
                }}
              >
                {isCustomValue ? `${windowMonths}m` : "custom…"}
              </button>
            )}
          </span>
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, movers.length)}, 1fr)`,
        }}
      >
        {movers.map((m, i) => {
          const sign =
            m.delta == null ? "flat" : m.delta > 0 ? "up" : m.delta < 0 ? "down" : "flat";
          const color = sign === "up" ? t.good : sign === "down" ? t.bad : t.textMute;
          const arrow = sign === "up" ? "▲" : sign === "down" ? "▼" : "—";
          return (
            <div
              key={`${m.kind}:${m.key}`}
              style={{
                padding: "12px 14px",
                borderRight: i < movers.length - 1 ? `1px solid ${t.line}` : "none",
                display: "flex",
                flexDirection: "column",
                gap: 5,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      background: m.color,
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      letterSpacing: 0.5,
                      color: t.textMute,
                      textTransform: "uppercase",
                    }}
                  >
                    {m.kind}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    fontWeight: 600,
                    color,
                    fontVariantNumeric: "tabular-nums",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 9 }}>{arrow}</span>
                  {fmtSignedPp(m.delta)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: t.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  fontFamily: MONO,
                  fontSize: 10.5,
                  color: t.textMute,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>actual</span>
                <span style={{ color: t.text, fontWeight: 600, fontSize: 13 }}>
                  {fmtPct(m.last, 1)}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 3,
                  background: t.lineHi,
                  borderRadius: 2,
                  overflow: "hidden",
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "50%",
                    width: `${Math.min(50, Math.abs((m.delta ?? 0) * 100 * 4))}%`,
                    transform: sign === "down" ? "translateX(-100%)" : "none",
                    background: color,
                  }}
                />
              </div>
            </div>
          );
        })}
        {movers.length === 0 && (
          <div
            style={{
              padding: "24px 14px",
              fontFamily: MONO,
              fontSize: 11,
              color: t.textMute,
              textAlign: "center",
            }}
          >
            Sin cambios detectables en esta ventana
          </div>
        )}
      </div>
    </div>
  );
}
