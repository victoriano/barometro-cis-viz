import { useEffect, useMemo, useState } from "react";
import type { Route } from "./+types/home";
import { AboutModal } from "../components/AboutModal";
import { ChartBlock, type ChartMode } from "../components/ChartBlock";
import { FilterPanel } from "../components/FilterPanel";
import { KpiRow, type Kpi } from "../components/KpiRow";
import { MoversStrip, type Mover } from "../components/MoversStrip";
import { NewsFeed } from "../components/NewsFeed";
import { SmallMultiples } from "../components/SmallMultiples";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { TimeSeriesChart, type TimeSeriesPoint } from "../components/TimeSeriesChart";
import { POLITICAL_EVENTS } from "../lib/events";
import { problemColor, problemEmoji, problemLegendLabel } from "../lib/problems";
import {
  EMPTY_FILTERS,
  FACETS,
  fetchBlocEvolution,
  fetchFacetValues,
  fetchMeta,
  fetchProblemEvolution,
  fetchTopProblems,
  fetchVoteEvolution,
  type BlocRow,
  type FacetKey,
  type FacetValue,
  type FilterState,
  type Meta,
  type ProblemRow,
  type VotingRow,
} from "../lib/queries";
import { BLOC_COLORS, MONO, PARTY_COLORS, TOKENS, fmtNum } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Barómetro CIS · evolución del voto y los problemas" },
    {
      name: "description",
      content:
        "Dashboard ops sobre los Barómetros del CIS: intención de voto, principales problemas y bloques políticos, con cross-filtros demográficos y anotaciones de eventos.",
    },
  ];
}

const HIDDEN_PARTIES = ["Otros"];

function orderByLastMonth<T extends { date: string; series: string; value: number }>(
  rows: T[],
): string[] {
  if (rows.length === 0) return [];
  const lastDate = rows.reduce((max, r) => (r.date > max ? r.date : max), "");
  return rows
    .filter((r) => r.date === lastDate)
    .sort((a, b) => b.value - a.value)
    .map((r) => r.series);
}

function lastValue(
  series: string,
  rows: { series: string; date: string; value: number }[],
): { v: number; date: string } | null {
  let best: { v: number; date: string } | null = null;
  for (const r of rows) {
    if (r.series !== series) continue;
    if (!best || r.date > best.date) best = { v: r.value, date: r.date };
  }
  return best;
}

function valueAt(
  series: string,
  date: string,
  rows: { series: string; date: string; value: number }[],
): number | null {
  for (const r of rows) {
    if (r.series === series && r.date === date) return r.value;
  }
  return null;
}

function shiftMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return `${d.toISOString().slice(0, 8)}01`;
}

function deltaWindow(
  series: string,
  rows: { series: string; date: string; value: number }[],
  months: number,
): { last: number; delta: number | null } | null {
  const last = lastValue(series, rows);
  if (!last) return null;
  const prevDate = shiftMonths(last.date, -months);
  const prev = valueAt(series, prevDate, rows);
  // Fallback: walk backwards if exact month not present
  let fallback: number | null = prev;
  if (fallback == null) {
    const target = prevDate;
    let bestDate = "";
    for (const r of rows) {
      if (r.series !== series) continue;
      if (r.date <= target && r.date > bestDate) {
        bestDate = r.date;
        fallback = r.value;
      }
    }
  }
  if (fallback == null) return { last: last.v, delta: null };
  return { last: last.v, delta: last.v - fallback };
}

export default function Home() {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [weighted, setWeighted] = useState(true);
  const [changeWindow, setChangeWindow] = useState(3);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [chartModes, setChartModes] = useState<Record<"bloques" | "voto" | "problemas", ChartMode>>({
    bloques: "lines",
    voto: "lines",
    problemas: "lines",
  });

  const [facets, setFacets] = useState<Record<FacetKey, FacetValue[]> | null>(null);
  const [metaInfo, setMetaInfo] = useState<Meta | null>(null);
  const [bloc, setBloc] = useState<BlocRow[]>([]);
  const [vote, setVote] = useState<VotingRow[]>([]);
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [baselineBloc, setBaselineBloc] = useState<BlocRow[]>([]);
  const [baselineVote, setBaselineVote] = useState<VotingRow[]>([]);
  const [baselineProblems, setBaselineProblems] = useState<ProblemRow[]>([]);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [values, info] = await Promise.all([fetchFacetValues(), fetchMeta()]);
        if (cancelled) return;
        setFacets(values);
        setMetaInfo(info);
        setBooted(true);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Error cargando datos");
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!booted) return;
    let cancelled = false;
    (async () => {
      try {
        const [blocRows, voteRows, topProblems] = await Promise.all([
          fetchBlocEvolution(EMPTY_FILTERS, weighted),
          fetchVoteEvolution(EMPTY_FILTERS, weighted),
          fetchTopProblems(EMPTY_FILTERS, weighted),
        ]);
        const problemRows = await fetchProblemEvolution(
          EMPTY_FILTERS,
          weighted,
          topProblems,
        );
        if (cancelled) return;
        setBaselineBloc(blocRows);
        setBaselineVote(voteRows);
        setBaselineProblems(problemRows);
      } catch (err) {
        console.error("baseline fetch failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weighted, booted]);

  useEffect(() => {
    if (!booted) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const [blocRows, voteRows, topProblems] = await Promise.all([
          fetchBlocEvolution(filters, weighted),
          fetchVoteEvolution(filters, weighted),
          fetchTopProblems(filters, weighted),
        ]);
        const problemRows = await fetchProblemEvolution(filters, weighted, topProblems);
        if (cancelled) return;
        setBloc(blocRows);
        setVote(voteRows);
        setProblems(problemRows);
        setErrorMsg(null);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Error ejecutando query");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, weighted, booted]);

  const blocSeries: TimeSeriesPoint[] = useMemo(
    () => bloc.map((r) => ({ date: r.date, series: r.bloc, value: Number(r.pct) })),
    [bloc],
  );
  const blocBaseline: TimeSeriesPoint[] = useMemo(
    () =>
      baselineBloc.map((r) => ({ date: r.date, series: r.bloc, value: Number(r.pct) })),
    [baselineBloc],
  );
  const voteSeries: TimeSeriesPoint[] = useMemo(
    () => vote.map((r) => ({ date: r.date, series: r.party, value: Number(r.pct) })),
    [vote],
  );
  const voteBaseline: TimeSeriesPoint[] = useMemo(
    () =>
      baselineVote.map((r) => ({ date: r.date, series: r.party, value: Number(r.pct) })),
    [baselineVote],
  );
  const problemSeries: TimeSeriesPoint[] = useMemo(
    () =>
      problems.map((r) => ({ date: r.date, series: r.problema, value: Number(r.pct) })),
    [problems],
  );
  const problemBaseline: TimeSeriesPoint[] = useMemo(
    () =>
      baselineProblems.map((r) => ({
        date: r.date,
        series: r.problema,
        value: Number(r.pct),
      })),
    [baselineProblems],
  );

  const blocOrder = useMemo(() => orderByLastMonth(blocSeries), [blocSeries]);
  const voteOrder = useMemo(() => orderByLastMonth(voteSeries), [voteSeries]);
  const problemOrder = useMemo(() => orderByLastMonth(problemSeries), [problemSeries]);

  const problemColors = useMemo(() => {
    const acc: Record<string, string> = {};
    for (const name of new Set(problemSeries.map((p) => p.series))) {
      acc[name] = problemColor(name);
    }
    return acc;
  }, [problemSeries]);

  // --- KPI: top 4 parties by last-month value ---
  const kpis: Kpi[] = useMemo(() => {
    return voteOrder
      .filter((k) => k !== "Otros")
      .slice(0, 4)
      .map((party) => {
        const w = deltaWindow(party, voteSeries, 12);
        return {
          key: party,
          color: PARTY_COLORS[party] ?? "#888",
          pct: w?.last ?? null,
          delta12m: w?.delta ?? null,
        };
      });
  }, [voteOrder, voteSeries]);

  // --- Movers: biggest |ΔN| across all three axes ---
  const movers: Mover[] = useMemo(() => {
    const pool: Mover[] = [];
    const push = (kind: Mover["kind"], series: string, label: string, color: string, source: TimeSeriesPoint[]) => {
      const w = deltaWindow(series, source, changeWindow);
      if (!w || w.delta == null) return;
      pool.push({ kind, key: series, label, color, last: w.last, delta: w.delta });
    };
    for (const party of voteOrder) {
      if (party === "Otros") continue;
      push("voto", party, party, PARTY_COLORS[party] ?? "#888", voteSeries);
    }
    for (const prob of problemOrder) {
      push("problema", prob, problemLegendLabel(prob), problemColor(prob), problemSeries);
    }
    for (const bloc of blocOrder) {
      push("bloque", bloc, bloc, BLOC_COLORS[bloc] ?? "#888", blocSeries);
    }
    pool.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
    return pool.slice(0, 5);
  }, [voteOrder, voteSeries, problemOrder, problemSeries, blocOrder, blocSeries, changeWindow]);

  const maxWindow = useMemo(() => {
    const dates = new Set(voteSeries.map((r) => r.date));
    return Math.max(1, dates.size - 1);
  }, [voteSeries]);

  const activeFilters = Object.values(filters).reduce((n, arr) => n + arr.length, 0);

  const rangeLabel = useMemo(() => {
    if (!metaInfo) return "…";
    return `${metaInfo.rangeStart.slice(0, 4)}→${metaInfo.rangeEnd.slice(0, 4)}`;
  }, [metaInfo]);

  const lastWaveLabel = useMemo(() => {
    if (!metaInfo) return "";
    return metaInfo.rangeEnd;
  }, [metaInfo]);

  // Toggle mono-style button
  const segmentStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    background: active ? t.accent : "transparent",
    color: active ? "#0b0d10" : t.textDim,
    border: `1px solid ${t.line}`,
    cursor: "pointer",
    marginLeft: -1,
  });

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        color: t.text,
        background: t.bg,
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gridTemplateRows: "auto 1fr",
        gridTemplateAreas: `"topbar topbar" "main side"`,
        overflow: "hidden",
        fontSize: 13,
      }}
    >
      {/* TOPBAR */}
      <div
        style={{
          gridArea: "topbar",
          borderBottom: `1px solid ${t.line}`,
          background: t.bg2,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <rect x="1" y="1" width="5" height="5" fill={t.accent} />
            <rect x="8" y="1" width="5" height="5" fill={t.text} opacity="0.35" />
            <rect x="1" y="8" width="5" height="5" fill={t.text} opacity="0.35" />
            <rect x="8" y="8" width="5" height="5" fill={t.accent} />
          </svg>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: t.text,
            }}
          >
            BARÓMETRO · CIS
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: t.textMute,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginRight: 8,
            }}
          >
            Peso:
          </span>
          <button
            type="button"
            style={segmentStyle(!weighted)}
            onClick={() => setWeighted(false)}
          >
            crudo
          </button>
          <button
            type="button"
            style={segmentStyle(weighted)}
            onClick={() => setWeighted(true)}
          >
            ponderado
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            paddingLeft: 14,
            marginLeft: 6,
            borderLeft: `1px solid ${t.line}`,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: t.textMute,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginRight: 8,
            }}
          >
            Tema:
          </span>
          <ThemeSwitcher />
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: t.textMute,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            paddingLeft: 16,
            borderLeft: `1px solid ${t.line}`,
            marginLeft: 8,
          }}
        >
          Última oleada · {lastWaveLabel}{" "}
          {metaInfo && `· n=${fmtNum(metaInfo.respondents)}`}
        </div>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          style={{
            marginLeft: 10,
            padding: "4px 10px",
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: 0.5,
            background: "transparent",
            color: t.textDim,
            border: `1px solid ${t.line}`,
            cursor: "pointer",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
          title="Créditos · metodología · repos"
        >
          <span
            style={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              border: `1px solid ${t.textDim}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            i
          </span>
          About
        </button>
      </div>

      {/* MAIN */}
      <div
        style={{
          gridArea: "main",
          padding: "16px 20px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minWidth: 0,
          overflow: "auto",
        }}
      >
        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              background: t.accentSoft,
              border: `1px solid ${t.accentLine}`,
              borderRadius: 3,
              fontFamily: MONO,
              fontSize: 11,
              color: t.text,
            }}
          >
            ⚠ {errorMsg}
          </div>
        )}

        <KpiRow
          kpis={kpis}
          meta={
            metaInfo
              ? {
                  waves: metaInfo.waves,
                  respondents: metaInfo.respondents,
                  range: rangeLabel,
                }
              : undefined
          }
        />

        <MoversStrip
          movers={movers}
          window={changeWindow}
          maxWindow={maxWindow}
          onWindowChange={setChangeWindow}
        />

        <ChartBlock
          title="Bloques políticos · izquierda vs derecha"
          sub={`% intención voto · ${weighted ? "ponderado" : "crudo"}`}
          mode={chartModes.bloques}
          onModeChange={(m) => setChartModes((p) => ({ ...p, bloques: m }))}
        >
          {chartModes.bloques === "lines" ? (
            <TimeSeriesChart
              data={blocSeries}
              baselineData={activeFilters > 0 ? blocBaseline : undefined}
              colors={BLOC_COLORS}
              seriesOrder={blocOrder}
              hiddenByDefault={["Otros"]}
              events={POLITICAL_EVENTS}
              loading={busy}
              height={220}
            />
          ) : (
            <SmallMultiples
              data={blocSeries}
              seriesOrder={blocOrder}
              colors={BLOC_COLORS}
              events={POLITICAL_EVENTS}
              columns={3}
              hiddenByDefault={["Otros"]}
            />
          )}
        </ChartBlock>

        <ChartBlock
          title="Intención de voto · elecciones generales"
          sub="top 8 · resto → Otros"
          mode={chartModes.voto}
          onModeChange={(m) => setChartModes((p) => ({ ...p, voto: m }))}
        >
          {chartModes.voto === "lines" ? (
            <TimeSeriesChart
              data={voteSeries}
              baselineData={activeFilters > 0 ? voteBaseline : undefined}
              colors={PARTY_COLORS}
              seriesOrder={voteOrder}
              hiddenByDefault={HIDDEN_PARTIES}
              events={POLITICAL_EVENTS.filter((e) => e.kind === "election")}
              loading={busy}
              height={280}
            />
          ) : (
            <SmallMultiples
              data={voteSeries}
              seriesOrder={voteOrder.slice(0, 8)}
              colors={PARTY_COLORS}
              events={POLITICAL_EVENTS.filter((e) => e.kind === "election")}
              columns={4}
              hiddenByDefault={HIDDEN_PARTIES}
            />
          )}
        </ChartBlock>

        <ChartBlock
          title="Principales problemas · % respondientes que lo mencionan"
          sub={`${new Set(problemSeries.map((p) => p.series)).size} series · top por último mes`}
          mode={chartModes.problemas}
          onModeChange={(m) => setChartModes((p) => ({ ...p, problemas: m }))}
        >
          {chartModes.problemas === "lines" ? (
            <TimeSeriesChart
              data={problemSeries}
              baselineData={activeFilters > 0 ? problemBaseline : undefined}
              colors={problemColors}
              seriesOrder={problemOrder}
              seriesLabel={problemLegendLabel}
              endLabelFormatter={problemEmoji}
              events={POLITICAL_EVENTS.filter((e) => e.kind === "crisis")}
              loading={busy}
              height={260}
            />
          ) : (
            <SmallMultiples
              data={problemSeries}
              seriesOrder={problemOrder}
              colors={problemColors}
              seriesLabel={problemLegendLabel}
              events={POLITICAL_EVENTS.filter((e) => e.kind === "crisis")}
              columns={4}
            />
          )}
        </ChartBlock>
      </div>

      {/* SIDEBAR */}
      <aside
        style={{
          gridArea: "side",
          borderLeft: `1px solid ${t.line}`,
          background: t.bg2,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 16px 8px", flexShrink: 0 }}>
          {facets ? (
            <FilterPanel facets={facets} filters={filters} onChange={setFilters} />
          ) : (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: t.textMute,
                letterSpacing: 0.5,
              }}
            >
              ▌ cargando facetas…
            </div>
          )}
        </div>
        <NewsFeed />
        <div
          style={{
            padding: "12px 14px",
            fontFamily: MONO,
            fontSize: 9.5,
            color: t.textMute,
            letterSpacing: 0.4,
            borderTop: `1px solid ${t.line}`,
            background: t.bg2,
          }}
        >
          QUERY · duckdb-wasm · PARQUET · processed_barometros
          <br />
          ROWS · {metaInfo ? fmtNum(metaInfo.respondents) : "…"} · COLS · 98
        </div>
      </aside>

      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        waves={metaInfo?.waves ?? 0}
        respondents={metaInfo?.respondents ?? 0}
      />
    </div>
  );
}
