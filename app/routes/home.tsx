import { useEffect, useMemo, useState } from "react";
import type { Route } from "./+types/home";
import { FilterPanel } from "../components/FilterPanel";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { TimeSeriesChart, type TimeSeriesPoint } from "../components/TimeSeriesChart";
import {
  problemColor,
  problemEmoji,
  problemLegendLabel,
} from "../lib/problems";
import {
  EMPTY_FILTERS,
  fetchBlocEvolution,
  fetchFacetValues,
  fetchProblemEvolution,
  fetchTopProblems,
  fetchVoteEvolution,
  type BlocRow,
  type FacetValue,
  type FilterState,
  type ProblemRow,
  type VotingRow,
} from "../lib/queries";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Barómetro del CIS — Evolución del voto y los problemas" },
    {
      name: "description",
      content:
        "Evolución mes a mes de la intención de voto y los principales problemas según el Barómetro del CIS, con cross-filtros demográficos. Datos abiertos desde 2020.",
    },
  ];
}

const PARTY_COLORS: Record<string, string> = {
  PSOE: "#e30613",
  PP: "#1d84ce",
  VOX: "#63be21",
  Sumar: "#c8287c",
  Podemos: "#793184",
  Ciudadanos: "#eb6909",
  ERC: "#ffb400",
  Junts: "#00a29b",
  "EAJ-PNV": "#4d9845",
  Bildu: "#009a49",
  BNG: "#6cbe45",
  CUP: "#f9ce00",
  "Más País": "#0fb5a6",
  Otros: "#6b7280",
};

const DEFAULT_HIDDEN_PARTIES = ["Otros"];

// Left/right uses muted variants of the two dominant party colors so the
// bloc chart reads as a coarser summary of the detailed chart below it.
const BLOC_COLORS: Record<string, string> = {
  Izquierda: "#e30613",
  Derecha: "#1d84ce",
  Otros: "#9ca3af",
};

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

export default function Home() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [weighted, setWeighted] = useState(false);
  const [facets, setFacets] = useState<Record<keyof FilterState, FacetValue[]> | null>(null);
  const [bloc, setBloc] = useState<BlocRow[]>([]);
  const [vote, setVote] = useState<VotingRow[]>([]);
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  // Unfiltered baseline — refetched whenever the weighted toggle flips so the
  // "vs muestra total" tooltip delta stays consistent with the active mode.
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
        const values = await fetchFacetValues();
        if (cancelled) return;
        setFacets(values);
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

  // Baseline: same shape as filtered, but over the whole sample. Cached per
  // weighted-mode so switching filters doesn't re-query it.
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
    () =>
      bloc.map((r) => ({
        date: r.date,
        series: r.bloc,
        value: Number(r.pct),
      })),
    [bloc],
  );

  const blocBaselineSeries: TimeSeriesPoint[] = useMemo(
    () =>
      baselineBloc.map((r) => ({ date: r.date, series: r.bloc, value: Number(r.pct) })),
    [baselineBloc],
  );

  const voteSeries: TimeSeriesPoint[] = useMemo(
    () =>
      vote.map((r) => ({
        date: r.date,
        series: r.party,
        value: Number(r.pct),
      })),
    [vote],
  );

  const voteBaselineSeries: TimeSeriesPoint[] = useMemo(
    () =>
      baselineVote.map((r) => ({ date: r.date, series: r.party, value: Number(r.pct) })),
    [baselineVote],
  );

  const problemSeries: TimeSeriesPoint[] = useMemo(
    () =>
      problems.map((r) => ({
        date: r.date,
        series: r.problema,
        value: Number(r.pct),
      })),
    [problems],
  );

  const problemBaselineSeries: TimeSeriesPoint[] = useMemo(
    () =>
      baselineProblems.map((r) => ({ date: r.date, series: r.problema, value: Number(r.pct) })),
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

  const activeFilters = Object.values(filters).reduce((n, arr) => n + arr.length, 0);

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Barómetro del CIS — evolución del voto y los principales problemas
        </h1>
        <p className="text-base-content/70 max-w-3xl">
          Un proyecto de{" "}
          <a
            className="link"
            href="https://x.com/victorianoi"
            target="_blank"
            rel="noreferrer"
          >
            Victoriano Izquierdo
          </a>
          .
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="label cursor-pointer gap-3">
            <span className="text-sm font-medium">
              {weighted ? "Ponderado" : "Crudo"}
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={weighted}
              onChange={(e) => setWeighted(e.target.checked)}
            />
            <span className="text-xs text-base-content/60">
              {weighted
                ? "usa Ponderación (falta en barómetros antiguos)"
                : "cuenta por respondiente"}
            </span>
          </label>
        </div>
      </header>

      {errorMsg && (
        <div className="alert alert-error">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* Two-column layout on lg+: charts fill the main column, filters live
          in a sticky sidebar on the right that stays visible while the charts
          below update. Below lg the sidebar drops under the charts. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section>
            <TimeSeriesChart
              title="Bloques políticos — izquierda vs derecha"
              data={blocSeries}
              baselineData={activeFilters > 0 ? blocBaselineSeries : undefined}
              colors={BLOC_COLORS}
              seriesOrder={blocOrder}
              hiddenByDefault={["Otros"]}
              loading={busy}
              height={320}
            />
          </section>

          <section>
            <TimeSeriesChart
              title="Intención de voto en elecciones generales"
              data={voteSeries}
              baselineData={activeFilters > 0 ? voteBaselineSeries : undefined}
              colors={PARTY_COLORS}
              seriesOrder={voteOrder}
              hiddenByDefault={DEFAULT_HIDDEN_PARTIES}
              loading={busy}
            />
          </section>

          <section>
            <TimeSeriesChart
              title="Principales problemas (% de respondientes que lo mencionan)"
              data={problemSeries}
              baselineData={activeFilters > 0 ? problemBaselineSeries : undefined}
              colors={problemColors}
              seriesOrder={problemOrder}
              seriesLabel={problemLegendLabel}
              endLabelFormatter={problemEmoji}
              loading={busy}
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:self-start">
          <div className="rounded-box border border-base-300 bg-base-100/90 p-4 backdrop-blur">
            {facets ? (
              <FilterPanel
                facets={facets}
                filters={filters}
                onChange={setFilters}
                variant="stacked"
              />
            ) : (
              <p className="text-sm text-base-content/60">Cargando filtros…</p>
            )}
          </div>
        </aside>
      </div>

      <footer className="flex flex-col gap-3 border-t border-base-300 pt-4 text-xs text-base-content/60 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Datos: Centro de Investigaciones Sociológicas (CIS). Código y
          documentación técnica en{" "}
          <a
            className="link"
            href="https://github.com/victoriano/barometro-cis-viz"
            target="_blank"
            rel="noreferrer"
          >
            github.com/victoriano/barometro-cis-viz
          </a>
          . Pipeline de datos en{" "}
          <a
            className="link"
            href="https://github.com/victoriano/social-sciences-microdata/tree/main/Spain/barometro_cis"
            target="_blank"
            rel="noreferrer"
          >
            social-sciences-microdata
          </a>
          . Dataset publicado en{" "}
          <a
            className="link"
            href="https://huggingface.co/datasets/victoriano/social-sciences-microdata/tree/main/spain/barometro_cis"
            target="_blank"
            rel="noreferrer"
          >
            HuggingFace
          </a>
          .
        </p>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
