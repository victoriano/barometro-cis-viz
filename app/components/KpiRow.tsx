import { MONO, TOKENS, fmtNum, fmtPct, fmtSignedPp } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

export type Kpi = {
  key: string;
  color: string;
  pct: number | null;
  delta12m: number | null;
};

type Props = {
  kpis: Kpi[];
  meta?: {
    waves: number;
    respondents: number;
    range: string;
  };
  compact?: boolean;
};

export function KpiRow({ kpis, meta, compact = false }: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

  const showMeta = meta && !compact;
  const gridTemplate = compact
    ? "repeat(2, 1fr)"
    : `repeat(${kpis.length}, 1fr)${showMeta ? " 1.4fr" : ""}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridTemplate,
        gap: 0,
        border: `1px solid ${t.line}`,
        borderRadius: 3,
        background: t.panel,
        overflow: "hidden",
      }}
    >
      {kpis.map((k, i) => (
        <div
          key={k.key}
          style={{
            padding: "12px 14px",
            borderRight:
              (compact
                ? (i + 1) % 2 === 0
                : i === kpis.length - 1 && !showMeta)
                ? "none"
                : `1px solid ${t.line}`,
            borderBottom:
              compact && i < kpis.length - 2
                ? `1px solid ${t.line}`
                : "none",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: 0.8,
              color: t.textMute,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: k.color,
                borderRadius: 1,
              }}
            />
            {k.key}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 600,
              color: t.text,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.5,
            }}
          >
            {fmtPct(k.pct, 1)}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
              color:
                k.delta12m == null
                  ? t.textMute
                  : k.delta12m > 0
                    ? t.good
                    : k.delta12m < 0
                      ? t.bad
                      : t.textMute,
            }}
          >
            12m {fmtSignedPp(k.delta12m)}
          </div>
        </div>
      ))}
      {showMeta && meta && (
        <div
          style={{
            padding: "12px 14px",
            background: t.panelHi,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: 0.8,
              color: t.textMute,
              textTransform: "uppercase",
            }}
          >
            Oleadas · {meta.range}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 18,
              fontWeight: 600,
              color: t.text,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.4,
            }}
          >
            {meta.waves}{" "}
            <span style={{ color: t.textMute, fontSize: 11 }}>meses</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: t.textMute }}>
            {fmtNum(meta.respondents)} respondientes · 19 CCAA · 15 facetas
          </div>
        </div>
      )}
    </div>
  );
}
