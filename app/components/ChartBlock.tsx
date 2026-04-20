import type { ReactNode } from "react";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

type Props = {
  title: string;
  sub?: string;
  children: ReactNode;
  right?: ReactNode;
};

/** Panel wrapper with the ``▸ TITLE · sub`` header from the design. */
export function ChartBlock({ title, sub, children, right }: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
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
          {right}
        </span>
      </div>
      <div style={{ padding: "8px 14px 2px" }}>{children}</div>
    </div>
  );
}
