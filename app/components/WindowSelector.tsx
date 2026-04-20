import { useRef, useState } from "react";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

type Props = {
  windowMonths: number;
  onWindowChange: (n: number) => void;
  maxWindow?: number;
  presets?: number[];
  customDefault?: number;
};

const DEFAULT_PRESETS = [3, 6, 12];

export function WindowSelector({
  windowMonths,
  onWindowChange,
  maxWindow = 120,
  presets = DEFAULT_PRESETS,
  customDefault = 24,
}: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  const [customOpen, setCustomOpen] = useState(
    () => !presets.includes(windowMonths),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const presetActive = (n: number) => !customOpen && windowMonths === n;
  const isCustomValue = !presets.includes(windowMonths);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 9.5,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: t.textMute,
        }}
      >
        ventana
      </span>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {presets.map((n) => (
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
              if (presets.includes(windowMonths)) setCustomOpen(false);
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
              if (presets.includes(windowMonths)) {
                onWindowChange(Math.min(customDefault, maxWindow));
              }
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
  );
}
