import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { PoliticalEvent } from "../lib/events";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

export type TimeSeriesPoint = {
  date: string;
  series: string;
  value: number;
};

type Props = {
  title?: string;
  data: TimeSeriesPoint[];
  yAxisFormatter?: (v: number) => string;
  colors?: Record<string, string>;
  seriesOrder?: string[];
  hiddenByDefault?: string[];
  seriesLabel?: (name: string) => string;
  endLabelFormatter?: (name: string) => string;
  baselineData?: TimeSeriesPoint[];
  events?: PoliticalEvent[];
  loading?: boolean;
  height?: number;
};

function shiftYear(date: string, years: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function formatSignedPP(value: number): string {
  const v = value * 100;
  const sign = v > 0 ? "+" : v < 0 ? "" : "±";
  return `${sign}${v.toFixed(1)}pp`;
}

function formatSignedPct(value: number): string {
  const v = value * 100;
  const sign = v > 0 ? "+" : v < 0 ? "" : "±";
  return `${sign}${v.toFixed(0)}%`;
}

const DEFAULT_PALETTE = [
  "#e11d48", "#2b7fce", "#65a30d", "#c8287c", "#7e22ce",
  "#ea580c", "#eab308", "#0d9488", "#4d9845", "#059669",
  "#14b8a6", "#84cc16", "#f59e0b",
];

export function TimeSeriesChart({
  title,
  data,
  yAxisFormatter = (v) => `${(v * 100).toFixed(0)}%`,
  colors,
  seriesOrder,
  hiddenByDefault,
  seriesLabel,
  endLabelFormatter,
  baselineData,
  events = [],
  loading = false,
  height = 260,
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

    const baselineByKey = new Map<string, number>();
    if (baselineData) {
      for (const row of baselineData) {
        baselineByKey.set(`${row.series}|${row.date}`, row.value);
      }
    }

    const label = (name: string) => (seriesLabel ? seriesLabel(name) : name);
    const rawBySeriesLabel = new Map<string, string>();
    for (const name of ordered) rawBySeriesLabel.set(label(name), name);

    const hidden = new Set(hiddenByDefault ?? []);

    // Event markLines — amber vertical lines on the x-axis with a short
    // label above. Use solid for elections, dashed for everything else.
    const relevantEvents = events.filter((e) =>
      dates.some((d) => d.slice(0, 7) === e.date.slice(0, 7)),
    );
    const markLineData = relevantEvents.map((e) => ({
      xAxis: `${e.date.slice(0, 7)}-01`,
      label: {
        formatter: e.label,
        color: t.textDim,
        fontFamily: MONO,
        fontSize: 9,
        position: "insideEndTop" as const,
        distance: 4,
      },
      lineStyle: {
        color: t.accentLine,
        type: e.kind === "election" ? "solid" : "dashed",
        width: 1,
      },
    }));

    const series = ordered.map((name, idx) => {
      const seriesColor = colors?.[name] ?? DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
      return {
        name: label(name),
        type: "line" as const,
        symbol: "circle",
        symbolSize: 4,
        showSymbol: false,
        connectNulls: true,
        smooth: 0.2,
        emphasis: { focus: "series" as const },
        itemStyle: { color: seriesColor },
        lineStyle: { color: seriesColor, width: 2.5 },
        endLabel: endLabelFormatter
          ? {
              show: true,
              formatter: () => endLabelFormatter(name),
              fontSize: 14,
              color: t.text,
            }
          : {
              show: true,
              formatter: () => ` ${name}`,
              color: seriesColor,
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 600,
            },
        data: dates.map((d) => byKey.get(`${name}|${d}`) ?? null),
        // Attach the event markLines to the first series only (ECharts
        // renders them once per chart regardless).
        markLine:
          idx === 0 && markLineData.length
            ? {
                symbol: "none" as const,
                silent: true,
                data: markLineData,
                label: { show: false },
              }
            : undefined,
      };
    });

    const legendSelected: Record<string, boolean> = {};
    for (const name of ordered) {
      legendSelected[label(name)] = !hidden.has(name);
    }

    return {
      backgroundColor: "transparent",
      textStyle: { color: t.text, fontFamily: MONO },
      title: title
        ? {
            text: title,
            left: 0,
            textStyle: {
              fontSize: 11,
              fontWeight: 600,
              color: t.textDim,
              fontFamily: MONO,
            },
          }
        : undefined,
      tooltip: {
        trigger: "axis",
        order: "valueDesc" as const,
        axisPointer: {
          type: "line",
          lineStyle: { color: t.accentLine, width: 1 },
        },
        backgroundColor: t.tooltipBg,
        borderColor: t.lineHi,
        borderWidth: 1,
        padding: [8, 10],
        textStyle: { color: t.text, fontFamily: MONO, fontSize: 11 },
        extraCssText: "max-width: 360px;",
        formatter: (params: unknown) => {
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
            const subline = [
              yoyTxt && `Δ 1 año: ${yoyTxt}`,
              vsTotalTxt && `vs muestra: ${vsTotalTxt}`,
            ]
              .filter(Boolean)
              .join(" · ");

            return `
              <div style="display:flex;justify-content:space-between;gap:16px;align-items:baseline;">
                <div style="display:flex;gap:6px;align-items:center;min-width:0;">
                  <span>${p.marker}</span>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;">${displayName}</span>
                </div>
                <strong style="font-variant-numeric:tabular-nums;">${currTxt}</strong>
              </div>
              ${subline ? `<div style="color:${t.textMute};font-size:10px;padding-left:18px;margin-bottom:2px;letter-spacing:0.3px;">${subline}</div>` : ""}
            `;
          });
          return `<div style="font-weight:600;margin-bottom:6px;letter-spacing:0.5px;color:${t.textDim};">${date}</div>${rows.join("")}`;
        },
      },
      legend: {
        type: "scroll" as const,
        top: title ? 22 : 6,
        left: 0,
        itemGap: 12,
        textStyle: { fontSize: 10, color: t.textDim, fontFamily: MONO },
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        pageTextStyle: { color: t.textMute, fontFamily: MONO, fontSize: 10 },
        pageIconColor: t.text,
        pageIconInactiveColor: t.textMute,
        data: ordered.map(label),
        selected: legendSelected,
      },
      grid: {
        top: title ? 54 : 38,
        right: 96,
        bottom: 22,
        left: 40,
      },
      xAxis: {
        type: "category" as const,
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: t.line } },
        axisTick: { show: false },
        axisLabel: {
          color: t.textMute,
          fontFamily: MONO,
          fontSize: 10,
          // Always render a label on the January tick of each year — every
          // other date stays blank. Using a predicate is more reliable than
          // `interval: number` when dates don't start on Jan-01.
          interval: (_i: number, v: string) => v.endsWith("-01-01"),
          formatter: (value: string) => value.slice(0, 4),
        },
        splitLine: {
          show: true,
          interval: (_i: number, v: string) => v.endsWith("-01-01"),
          lineStyle: { color: t.gridSoft, type: "solid" },
        },
      },
      yAxis: {
        type: "value" as const,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: t.textMute,
          fontFamily: MONO,
          fontSize: 10,
          formatter: (v: number) => yAxisFormatter(v),
        },
        splitLine: { lineStyle: { color: t.line, type: "dashed" as const } },
      },
      series,
      animationDuration: 300,
    };
  }, [
    title,
    data,
    baselineData,
    events,
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
        <div
          className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]"
          style={{ background: `${t.bg}aa` }}
        >
          <span
            className="font-mono text-xs uppercase tracking-wider"
            style={{ color: t.textMute }}
          >
            ▌ loading
          </span>
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
