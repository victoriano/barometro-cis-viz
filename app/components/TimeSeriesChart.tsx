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
  loading?: boolean;
  height?: number;
};

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

    const label = (name: string) => (seriesLabel ? seriesLabel(name) : name);
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
        // Sort series in the tooltip from highest to lowest value at the
        // hovered x so the ranking is obvious at a glance.
        order: "valueDesc" as const,
        axisPointer: { type: "line", lineStyle: { color: t.muted } },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
        valueFormatter: (v: number | null) =>
          v == null ? "—" : yAxisFormatter(v),
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
  }, [title, data, yAxisFormatter, colors, t, seriesOrder, hiddenByDefault, seriesLabel, endLabelFormatter]);

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
