import type { ReactNode } from "react";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

export type MobileNavKey = "filters" | "movers" | "events" | "settings";

type NavItem = {
  key: MobileNavKey;
  label: string;
  icon: ReactNode;
  badge?: number;
};

type Props = {
  items: NavItem[];
  onSelect: (key: MobileNavKey) => void;
};

export function MobileBottomNav({ items, onSelect }: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        background: t.bg2,
        borderTop: `1px solid ${t.lineHi}`,
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onSelect(it.key)}
          style={{
            position: "relative",
            padding: "10px 0 12px",
            background: "transparent",
            border: "none",
            borderRight: `1px solid ${t.line}`,
            color: t.textDim,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{it.icon}</span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            {it.label}
          </span>
          {it.badge != null && it.badge > 0 && (
            <span
              style={{
                position: "absolute",
                top: 6,
                right: "calc(50% - 22px)",
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 8,
                background: t.accent,
                color: "#0b0d10",
                fontFamily: MONO,
                fontSize: 9.5,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {it.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
