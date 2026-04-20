import { useMemo, useRef, useState, useEffect } from "react";
import type { PoliticalEvent } from "../lib/events";
import { MONO, TOKENS, fmtPct, fmtSignedPp } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";
import type { TimeSeriesPoint } from "./TimeSeriesChart";

type Props = {
  data: TimeSeriesPoint[];
  seriesOrder: string[];
  colors?: Record<string, string>;
  seriesLabel?: (name: string) => string;
  events?: PoliticalEvent[];
  columns?: number;
  cellHeight?: number;
  hiddenByDefault?: string[];
};

/** Grid of small-multiples sparklines, one per series. */
export function SmallMultiples({
  data,
  seriesOrder,
  colors,
  seriesLabel,
  events = [],
  columns = 4,
  cellHeight = 96,
  hiddenByDefault,
}: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

  const hidden = useMemo(() => new Set(hiddenByDefault ?? []), [hiddenByDefault]);

  // Build per-series sorted arrays.
  const { seriesMap, dates, globalMax } = useMemo(() => {
    const byKey = new Map<string, Map<string, number>>();
    const dateSet = new Set<string>();
    for (const row of data) {
      dateSet.add(row.date);
      if (!byKey.has(row.series)) byKey.set(row.series, new Map());
      byKey.get(row.series)!.set(row.date, row.value);
    }
    const sortedDates = Array.from(dateSet).sort();
    const series = new Map<string, (number | null)[]>();
    let max = 0;
    for (const [key, map] of byKey) {
      const values = sortedDates.map((d) => map.get(d) ?? null);
      series.set(key, values);
      for (const v of values) if (v != null && v > max) max = v;
    }
    return { seriesMap: series, dates: sortedDates, globalMax: max * 1.1 };
  }, [data]);

  const visibleSeries = seriesOrder.filter(
    (k) => seriesMap.has(k) && !hidden.has(k),
  );

  const rows = Math.ceil(visibleSeries.length / columns);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 0,
        border: `1px solid ${t.line}`,
        borderRadius: 3,
        background: t.panel,
        overflow: "hidden",
      }}
    >
      {visibleSeries.map((key, idx) => {
        const values = seriesMap.get(key) ?? [];
        const label = seriesLabel ? seriesLabel(key) : key;
        const color = colors?.[key] ?? "#888";
        const last = lastVal(values);
        const chg = changeOver(values, 12);
        const col = idx % columns;
        const row = Math.floor(idx / columns);
        return (
          <div
            key={key}
            style={{
              position: "relative",
              padding: "10px 12px 8px",
              borderRight:
                col !== columns - 1 ? `1px solid ${t.line}` : "none",
              borderBottom: row < rows - 1 ? `1px solid ${t.line}` : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 4,
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
                    width: 8,
                    height: 8,
                    background: color,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: t.text,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {label}
                </span>
              </div>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 600,
                  color: t.text,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: -0.3,
                }}
              >
                {fmtPct(last, 1)}
              </span>
            </div>
            <MiniAreaSvg
              values={values}
              dates={dates}
              events={events}
              color={color}
              height={cellHeight}
              yMax={globalMax}
            />
            <div
              style={{
                marginTop: 4,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: MONO,
                fontSize: 9.5,
                color: t.textMute,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              <span>12m</span>
              <span
                style={{
                  color:
                    chg == null
                      ? t.textMute
                      : chg > 0
                        ? t.good
                        : chg < 0
                          ? t.bad
                          : t.textMute,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtSignedPp(chg)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type MiniProps = {
  values: (number | null)[];
  dates: string[];
  events?: PoliticalEvent[];
  color: string;
  height: number;
  yMax?: number | null;
};

function MiniAreaSvg({
  values,
  dates,
  events = [],
  color,
  height,
  yMax,
}: MiniProps) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(200);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      setW(Math.max(40, entries[0].contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const pad = { t: 6, r: 4, b: 8, l: 4 };
  const chartW = w - pad.l - pad.r;
  const chartH = height - pad.t - pad.b;

  const validVals = values.filter((v): v is number => v != null);
  if (!validVals.length)
    return <div ref={ref} style={{ height, width: "100%" }} />;

  const max = yMax && yMax > 0 ? yMax : Math.max(...validVals) * 1.1;
  const min = 0;
  const xOf = (i: number) =>
    pad.l + (i / Math.max(1, values.length - 1)) * chartW;
  const yOf = (v: number) =>
    pad.t + chartH - ((v - min) / (max - min)) * chartH;

  let linePath = "";
  let areaPath = "";
  let started = false;
  let lastIdx = -1;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) continue;
    const x = xOf(i);
    const y = yOf(v);
    if (!started) {
      linePath += `M ${x} ${y}`;
      areaPath += `M ${x} ${pad.t + chartH} L ${x} ${y}`;
      started = true;
    } else {
      linePath += ` L ${x} ${y}`;
      areaPath += ` L ${x} ${y}`;
    }
    lastIdx = i;
  }
  if (started && lastIdx >= 0) {
    areaPath += ` L ${xOf(lastIdx)} ${pad.t + chartH} Z`;
  }

  const eventXs = events
    .map((e) => {
      const m = e.date.slice(0, 7);
      const idx = dates.findIndex((d) => d.startsWith(m));
      return idx >= 0 ? { x: xOf(idx), kind: e.kind } : null;
    })
    .filter((v): v is { x: number; kind: PoliticalEvent["kind"] } => v !== null);

  const lastX = lastIdx >= 0 ? xOf(lastIdx) : null;
  const lastY = lastIdx >= 0 ? yOf(values[lastIdx] as number) : null;

  return (
    <div ref={ref} style={{ width: "100%", height, position: "relative" }}>
      <svg width={w} height={height} style={{ display: "block" }}>
        <line
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + chartH}
          y2={pad.t + chartH}
          stroke={t.line}
          strokeWidth={1}
        />
        {eventXs.map((e, i) => (
          <line
            key={i}
            x1={e.x}
            x2={e.x}
            y1={pad.t}
            y2={pad.t + chartH}
            stroke={t.accentLine}
            strokeWidth={1}
            strokeDasharray={e.kind === "election" ? undefined : "2,2"}
            opacity={0.6}
          />
        ))}
        <path d={areaPath} fill={color} opacity={0.13} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {lastX != null && lastY != null && (
          <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
        )}
      </svg>
    </div>
  );
}

function lastVal(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) return values[i] as number;
  }
  return null;
}

function changeOver(values: (number | null)[], n: number): number | null {
  let curIdx = -1;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) {
      curIdx = i;
      break;
    }
  }
  if (curIdx < 0) return null;
  const prevIdx = Math.max(0, curIdx - n);
  for (let i = prevIdx; i >= 0; i--) {
    if (values[i] != null)
      return (values[curIdx] as number) - (values[i] as number);
  }
  return null;
}
