import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

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
  loading?: boolean;
  height?: number;
};

const DEFAULT_PALETTE = [
  "#e63946", "#1d3557", "#2a9d8f", "#f4a261", "#9b5de5",
  "#f15bb5", "#00bbf9", "#00f5d4", "#ffbc42", "#8ac926",
  "#6a4c93", "#ff6b6b", "#4ea8de", "#ffbf69",
];

export function TimeSeriesChart({
  title,
  data,
  yAxisFormatter = (v) => `${(v * 100).toFixed(1)}%`,
  colors,
  loading = false,
  height = 420,
}: Props) {
  const option = useMemo(() => {
    const seriesNames = Array.from(new Set(data.map((d) => d.series)));
    const dates = Array.from(new Set(data.map((d) => d.date))).sort();
    const byKey = new Map<string, number>();
    for (const row of data) byKey.set(`${row.series}|${row.date}`, row.value);
    const series = seriesNames.map((name, idx) => ({
      name,
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
      data: dates.map((d) => byKey.get(`${name}|${d}`) ?? null),
    }));
    return {
      title: {
        text: title,
        left: 0,
        textStyle: { fontSize: 16, fontWeight: 600 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        valueFormatter: (v: number | null) =>
          v == null ? "—" : yAxisFormatter(v),
      },
      legend: {
        type: "scroll",
        top: 30,
        itemGap: 12,
        textStyle: { fontSize: 11 },
      },
      grid: { top: 90, right: 24, bottom: 40, left: 56 },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLabel: {
          formatter: (value: string) => value.slice(0, 7),
        },
      },
      yAxis: {
        type: "value",
        axisLabel: { formatter: (v: number) => yAxisFormatter(v) },
      },
      series,
      animationDuration: 400,
    };
  }, [title, data, yAxisFormatter, colors]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/60 backdrop-blur-sm">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}
      <ReactECharts
        option={option}
        style={{ height, width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
