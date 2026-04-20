import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { PoliticalEvent } from "../lib/events";
import { MONO, PARTY_COLORS, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  highlightedEventId?: string | null;
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
  highlightedEventId,
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

    // Event markLines — amber vertical lines on the x-axis. Labels are
    // hidden by default (too many events crowd the chart) and revealed
    // on hover. The axis tooltip also enriches with matching events.
    const relevantEvents = events.filter((e) =>
      dates.some((d) => d.slice(0, 7) === e.date.slice(0, 7)),
    );
    const eventsByMonth = new Map<string, PoliticalEvent[]>();
    for (const ev of relevantEvents) {
      const ym = ev.date.slice(0, 7);
      const list = eventsByMonth.get(ym) ?? [];
      list.push(ev);
      eventsByMonth.set(ym, list);
    }
    const markLineData = relevantEvents.map((e) => {
      const isHighlight = highlightedEventId != null && e.id === highlightedEventId;
      return {
        xAxis: `${e.date.slice(0, 7)}-01`,
        name: e.id,
        label: {
          show: isHighlight,
          formatter: e.label,
          color: isHighlight ? t.text : t.textDim,
          backgroundColor: isHighlight ? t.tooltipBg : "transparent",
          borderColor: isHighlight ? t.accent : "transparent",
          borderWidth: isHighlight ? 1 : 0,
          padding: isHighlight ? [3, 5] : 0,
          fontFamily: MONO,
          fontSize: isHighlight ? 10 : 9,
          fontWeight: isHighlight ? 600 : 400,
          position: "insideEndTop" as const,
          distance: 4,
        },
        emphasis: {
          label: {
            show: true,
            formatter: e.label,
            color: t.text,
            backgroundColor: t.tooltipBg,
            borderColor: t.accentLine,
            borderWidth: 1,
            padding: [3, 5],
            fontFamily: MONO,
            fontSize: 9.5,
            position: "insideEndTop" as const,
            distance: 4,
          },
          lineStyle: { color: t.accent, width: 2 },
        },
        lineStyle: {
          color: isHighlight ? t.accent : t.accentLine,
          type: isHighlight
            ? ("solid" as const)
            : e.kind === "election"
              ? ("solid" as const)
              : ("dashed" as const),
          width: isHighlight ? 2.5 : 1,
          shadowBlur: isHighlight ? 8 : 0,
          shadowColor: isHighlight ? t.accent : "transparent",
        },
      };
    });

    // Soft amber band around the selected event's month so the user can see
    // "when did that event happen" even without squinting at a 1px line.
    const highlightedEvent = highlightedEventId
      ? relevantEvents.find((e) => e.id === highlightedEventId)
      : null;
    const markAreaData = highlightedEvent
      ? [
          [
            { xAxis: `${highlightedEvent.date.slice(0, 7)}-01` },
            {
              xAxis: (() => {
                const d = new Date(`${highlightedEvent.date.slice(0, 7)}-01T00:00:00Z`);
                d.setUTCMonth(d.getUTCMonth() + 1);
                return d.toISOString().slice(0, 10);
              })(),
            },
          ],
        ]
      : [];

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
                silent: false,
                data: markLineData,
                // Default label hidden; per-item label.show toggles the
                // selected event's label on. Without this flag explicitly
                // set here, ECharts would NOT honour per-item overrides.
                label: { show: false, formatter: " " },
              }
            : undefined,
        markArea:
          idx === 0 && markAreaData.length
            ? {
                silent: true,
                itemStyle: {
                  color: t.accent,
                  opacity: 0.18,
                  borderColor: t.accent,
                  borderWidth: 1,
                },
                data: markAreaData,
              }
            : undefined,
        markPoint:
          idx === 0 && highlightedEvent
            ? {
                symbol: "pin",
                symbolSize: 32,
                silent: true,
                itemStyle: {
                  color: t.accent,
                  borderColor: t.accent,
                  shadowBlur: 8,
                  shadowColor: t.accent,
                },
                label: {
                  show: true,
                  formatter: "★",
                  color: "#0b0d10",
                  fontSize: 13,
                  fontWeight: 700,
                },
                data: [
                  {
                    xAxis: `${highlightedEvent.date.slice(0, 7)}-01`,
                    y: 0,
                  },
                ],
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
        extraCssText:
          "max-width: 320px; white-space: normal; word-break: break-word; overflow-wrap: anywhere;",
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
          const ym = date.slice(0, 7);
          const hitEvents = eventsByMonth.get(ym) ?? [];
          let eventsHtml = "";
          if (hitEvents.length) {
            const blocks = hitEvents
              .slice(0, 3)
              .map((ev) => {
                const kindColor =
                  ev.kind === "election"
                    ? t.accent
                    : ev.kind === "crisis"
                      ? t.bad
                      : ev.kind === "moment"
                        ? t.good
                        : t.textMute;
                const impactsHtml = ev.impacts
                  .slice(0, 4)
                  .map((imp) => {
                    const color =
                      imp.direction === "+"
                        ? t.good
                        : imp.direction === "-"
                          ? t.bad
                          : t.textMute;
                    const arrow =
                      imp.direction === "+"
                        ? "▲"
                        : imp.direction === "-"
                          ? "▼"
                          : "—";
                    const swatch = PARTY_COLORS[imp.party];
                    const sw = swatch
                      ? `<span style="display:inline-block;width:6px;height:6px;background:${swatch};border-radius:1px;margin-right:3px;vertical-align:middle;"></span>`
                      : "";
                    return `<span style="display:inline-flex;align-items:center;color:${color};font-size:10px;margin-right:6px;white-space:nowrap;">${sw}${escapeHtml(imp.party)} <span style="font-size:8px;margin-left:2px;">${arrow}</span></span>`;
                  })
                  .join("");
                return `
                  <div style="padding:6px 0 0;margin-top:6px;border-top:1px dashed ${t.line};max-width:300px;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                      <span style="display:inline-block;width:6px;height:6px;background:${kindColor};border-radius:1px;flex-shrink:0;"></span>
                      <span style="font-size:9px;color:${t.textMute};letter-spacing:0.4px;text-transform:uppercase;">${escapeHtml(ev.date)} · ${"●".repeat(ev.relevance)}</span>
                    </div>
                    <div style="font-family:inherit;font-size:11px;color:${t.text};font-weight:500;line-height:1.3;margin-bottom:3px;white-space:normal;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(ev.headline)}</div>
                    ${impactsHtml ? `<div style="line-height:1.8;white-space:normal;">${impactsHtml}</div>` : ""}
                  </div>
                `;
              })
              .join("");
            const more =
              hitEvents.length > 3
                ? `<div style="font-size:9px;color:${t.textMute};margin-top:4px;letter-spacing:0.3px;">+${hitEvents.length - 3} evento(s) más</div>`
                : "";
            eventsHtml = blocks + more;
          }
          return `<div style="font-weight:600;margin-bottom:6px;letter-spacing:0.5px;color:${t.textDim};">${escapeHtml(date)}</div>${rows.join("")}${eventsHtml}`;
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
    highlightedEventId,
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
        key={`${theme}:${highlightedEventId ?? ""}`}
        option={option}
        style={{ height, width: "100%" }}
        notMerge
      />
    </div>
  );
}
