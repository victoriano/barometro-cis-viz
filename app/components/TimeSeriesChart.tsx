import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useResolvedTheme } from "../lib/useResolvedTheme";

export type TimeSeriesPoint = {
  date: string;
  series: string;
  value: number;
};

type Props = {
  title: string;
  data: TimeSeriesPoint[];
  yAxisFormatter?: (v: number) => string;
  colors?: Record<string, string>;
  /** Override the order in which series stack in the legend. */
  seriesOrder?: string[];
  /** Series that start hidden (toggleable via the legend). */
  hiddenByDefault?: string[];
  /** Transform a raw series name into a display label (legend + tooltip). */
  seriesLabel?: (name: string) => string;
  /** Emoji/short-text rendered at the last point of each line. */
  endLabelFormatter?: (name: string) => string;
  /**
   * Same-series unfiltered reference data. When provided the tooltip shows
   * the pp-delta between the current (filtered) point and the baseline.
   */
  baselineData?: TimeSeriesPoint[];
  loading?: boolean;
  height?: number;
};

/** YYYY-MM-01 → YYYY-MM-01 one year earlier. */
function shiftYear(date: string, years: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function formatSignedPP(value: number): string {
  const v = value * 100;
  const sign = v > 0 ? "+" : v < 0 ? "" : "±";
  return `${sign}${v.toFixed(1)} pp`;
}

function formatSignedPct(value: number): string {
  const v = value * 100;
  const sign = v > 0 ? "+" : v < 0 ? "" : "±";
  return `${sign}${v.toFixed(0)}%`;
}

const DEFAULT_PALETTE = [
  "#e63946", "#1d3557", "#2a9d8f", "#f4a261", "#9b5de5",
  "#f15bb5", "#00bbf9", "#00f5d4", "#ffbc42", "#8ac926",
  "#6a4c93", "#ff6b6b", "#4ea8de", "#ffbf69",
];

// ECharts doesn't pick up CSS vars, so we supply explicit theme tokens.
const TOKENS = {
  light: {
    text: "#1f2937",
    muted: "#6b7280",
    axisLine: "#d1d5db",
    splitLine: "#e5e7eb",
    tooltipBg: "rgba(255,255,255,0.95)",
    tooltipBorder: "#e5e7eb",
  },
  dark: {
    text: "#e5e7eb",
    muted: "#9ca3af",
    axisLine: "#374151",
    splitLine: "#1f2937",
    tooltipBg: "rgba(17,24,39,0.95)",
    tooltipBorder: "#374151",
  },
};

export function TimeSeriesChart({
  title,
  data,
  yAxisFormatter = (v) => `${(v * 100).toFixed(1)}%`,
  colors,
  seriesOrder,
  hiddenByDefault,
  seriesLabel,
  endLabelFormatter,
  baselineData,
  loading = false,
  height = 420,
}: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

  const option = useMemo(() => {
    const presentSeries = new Set(data.map((d) => d.series));
    const uniqueInData = Array.from(presentSeries);
    const ordered = seriesOrder
      ? [
          ...seriesOrder.filter((s) => presentSeries.has(s)),
          ...uniqueInData.filter((s) => !seriesOrder.includes(s)),
        ]
      : uniqueInData;

    const dates = Array.from(new Set(data.map((d) => d.date))).sort();
    const byKey = new Map<string, number>();
    for (const row of data) byKey.set(`${row.series}|${row.date}`, row.value);

    // Same map over the unfiltered baseline so the tooltip can compare each
    // point with "what the general sample looks like" at the same month.
    const baselineByKey = new Map<string, number>();
    if (baselineData) {
      for (const row of baselineData) {
        baselineByKey.set(`${row.series}|${row.date}`, row.value);
      }
    }

    const label = (name: string) => (seriesLabel ? seriesLabel(name) : name);
    // Reverse lookup display label → raw series name, so the tooltip can key
    // into byKey / baselineByKey using the underlying series identifier even
    // when the legend shows decorated labels (e.g. "🏠 Vivienda").
    const rawBySeriesLabel = new Map<string, string>();
    for (const name of ordered) rawBySeriesLabel.set(label(name), name);

    const hidden = new Set(hiddenByDefault ?? []);

    const series = ordered.map((name, idx) => ({
      name: label(name),
      type: "line" as const,
      symbol: "circle",
      symbolSize: 4,
      showSymbol: false,
      connectNulls: true,
      smooth: 0.2,
      emphasis: { focus: "series" as const },
      itemStyle: {
        color: colors?.[name] ?? DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length],
      },
      endLabel: endLabelFormatter
        ? {
            show: true,
            formatter: () => endLabelFormatter(name),
            fontSize: 14,
            color: t.text,
          }
        : undefined,
      data: dates.map((d) => byKey.get(`${name}|${d}`) ?? null),
    }));

    const legendSelected: Record<string, boolean> = {};
    for (const name of ordered) {
      legendSelected[label(name)] = !hidden.has(name);
    }

    return {
      backgroundColor: "transparent",
      textStyle: { color: t.text },
      title: {
        text: title,
        left: 0,
        textStyle: { fontSize: 16, fontWeight: 600, color: t.text },
      },
      tooltip: {
        trigger: "axis",
        order: "valueDesc" as const,
        axisPointer: { type: "line", lineStyle: { color: t.muted } },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
        extraCssText: "max-width: 360px;",
        formatter: (params: unknown) => {
          // Each "axis" tooltip receives an array of series points sharing
          // the hovered x. We pre-sort valueDesc via ECharts' `order`, but
          // the raw array comes unsorted — ECharts applies it to the layout
          // not to params. Sort here so our HTML output matches.
          const items = Array.isArray(params) ? [...params] : [];
          items.sort((a: any, b: any) => {
            const av = typeof a.data === "number" ? a.data : -Infinity;
            const bv = typeof b.data === "number" ? b.data : -Infinity;
            return bv - av;
          });
          if (items.length === 0) return "";
          const date: string = items[0].axisValue ?? items[0].axisValueLabel ?? "";
          const prevDate = shiftYear(date, -1);
          const rows = items.map((p: any) => {
            const displayName = String(p.seriesName ?? "");
            const rawName = rawBySeriesLabel.get(displayName) ?? displayName;
            const curr = typeof p.data === "number" ? p.data : null;
            const prev = byKey.get(`${rawName}|${prevDate}`);
            const baseline = baselineByKey.get(`${rawName}|${date}`);

            const currTxt = curr == null ? "—" : yAxisFormatter(curr);
            let yoyTxt = "";
            if (curr != null && prev != null && prev > 0) {
              yoyTxt = formatSignedPct(curr / prev - 1);
            }
            let vsTotalTxt = "";
            if (curr != null && baseline != null && baselineData) {
              vsTotalTxt = formatSignedPP(curr - baseline);
            }
            const subline = [yoyTxt && `Δ 1 año: ${yoyTxt}`, vsTotalTxt && `vs muestra: ${vsTotalTxt}`]
              .filter(Boolean)
              .join(" · ");

            return `
              <div style="display:flex;justify-content:space-between;gap:16px;align-items:baseline;">
                <div style="display:flex;gap:6px;align-items:center;min-width:0;">
                  <span>${p.marker}</span>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;">${displayName}</span>
                </div>
                <strong>${currTxt}</strong>
              </div>
              ${subline ? `<div style="color:${t.muted};font-size:11px;padding-left:18px;margin-bottom:2px;">${subline}</div>` : ""}
            `;
          });
          return `<div style="font-weight:600;margin-bottom:6px;">${date}</div>${rows.join("")}`;
        },
      },
      legend: {
        type: "scroll",
        top: 30,
        itemGap: 12,
        textStyle: { fontSize: 11, color: t.text },
        pageTextStyle: { color: t.muted },
        pageIconColor: t.text,
        pageIconInactiveColor: t.muted,
        data: ordered.map(label),
        selected: legendSelected,
      },
      grid: { top: 90, right: endLabelFormatter ? 110 : 24, bottom: 40, left: 56 },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: t.axisLine } },
        axisTick: { lineStyle: { color: t.axisLine } },
        axisLabel: {
          color: t.muted,
          formatter: (value: string) => value.slice(0, 7),
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.muted, formatter: (v: number) => yAxisFormatter(v) },
        splitLine: { lineStyle: { color: t.splitLine } },
      },
      series,
      animationDuration: 400,
    };
  }, [
    title,
    data,
    baselineData,
    yAxisFormatter,
    colors,
    t,
    seriesOrder,
    hiddenByDefault,
    seriesLabel,
    endLabelFormatter,
  ]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/60 backdrop-blur-sm">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}
      <ReactECharts
        key={theme}
        option={option}
        style={{ height, width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
