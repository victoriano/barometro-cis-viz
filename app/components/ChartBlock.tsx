import type { ReactNode } from "react";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

export type ChartMode = "lines" | "multiples";

type Props = {
  title: string;
  sub?: string;
  children: ReactNode;
  mode?: ChartMode;
  onModeChange?: (mode: ChartMode) => void;
  right?: ReactNode;
};

export function ChartBlock({ title, sub, children, mode, onModeChange, right }: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

  const seg = (active: boolean): React.CSSProperties => ({
    padding: "3px 8px",
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    background: active ? t.panelHi : "transparent",
    color: active ? t.text : t.textMute,
    border: `1px solid ${active ? t.lineHi : t.line}`,
    cursor: "pointer",
    marginLeft: -1,
  });

  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.line}`,
        borderRadius: 3,
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
          textTransform: "uppercase",
          color: t.textDim,
        }}
      >
        <span>▸ {title}</span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: t.textMute,
          }}
        >
          {sub && <span>{sub}</span>}
          {onModeChange && mode && (
            <span style={{ display: "inline-flex" }}>
              <button
                type="button"
                onClick={() => onModeChange("lines")}
                style={seg(mode === "lines")}
              >
                ▦ líneas
              </button>
              <button
                type="button"
                onClick={() => onModeChange("multiples")}
                style={seg(mode === "multiples")}
              >
                ▥ small mult.
              </button>
            </span>
          )}
          {right}
        </span>
      </div>
      <div style={{ padding: "8px 14px 2px" }}>{children}</div>
    </div>
  );
}
