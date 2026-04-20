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
  fetchFacetValues,
  fetchProblemEvolution,
  fetchTopProblems,
  fetchVoteEvolution,
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

// Electoral colors so the chart looks familiar at first glance.
const PARTY_COLORS: Record<string, string> = {
  PSOE: "#e30613",
  PP: "#1d84ce",
  VOX: "#63be21",
  Sumar: "#c8287c",
  // Podemos also covers Unidas Podemos / Unidos Podemos (merged in SQL).
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

// Series the user almost never wants on screen on the default view.
const DEFAULT_HIDDEN_PARTIES = ["Otros"];

/** Order series by their value on the most recent month, descending. */
function orderByLastMonth<T extends { date: string; series: string; value: number }>(
  rows: T[],
): string[] {
  if (rows.length === 0) return [];
  const lastDate = rows.reduce((max, r) => (r.date > max ? r.date : max), "");
  const lastMonth = rows.filter((r) => r.date === lastDate);
  return lastMonth
    .sort((a, b) => b.value - a.value)
    .map((r) => r.series);
}

export default function Home() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [weighted, setWeighted] = useState(false);
  const [facets, setFacets] = useState<Record<keyof FilterState, FacetValue[]> | null>(null);
  const [vote, setVote] = useState<VotingRow[]>([]);
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial boot: warm up DuckDB + facets.
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

  // Refresh chart data on filter / weighted toggle.
  useEffect(() => {
    if (!booted) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const [voteRows, topProblems] = await Promise.all([
          fetchVoteEvolution(filters, weighted),
          fetchTopProblems(filters, weighted),
        ]);
        const problemRows = await fetchProblemEvolution(filters, weighted, topProblems);
        if (cancelled) return;
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

  const voteSeries: TimeSeriesPoint[] = useMemo(
    () =>
      vote.map((r) => ({
        date: r.date,
        series: r.party,
        value: Number(r.pct),
      })),
    [vote],
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

  const voteOrder = useMemo(() => orderByLastMonth(voteSeries), [voteSeries]);
  const problemOrder = useMemo(() => orderByLastMonth(problemSeries), [problemSeries]);

  const problemColors = useMemo(() => {
    const acc: Record<string, string> = {};
    for (const name of new Set(problemSeries.map((p) => p.series))) {
      acc[name] = problemColor(name);
    }
    return acc;
  }, [problemSeries]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Barómetro del CIS — evolución del voto y los principales problemas
        </h1>
        <p className="text-base-content/70 max-w-3xl">
          Un proyecto de Victoriano Izquierdo —{" "}
          <a
            className="link"
            href="https://x.com/victorianoi"
            target="_blank"
            rel="noreferrer"
          >
            @victorianoi
          </a>{" "}
          en X.
        </p>
        <div className="flex items-center gap-4">
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

      <section className="space-y-4">
        <TimeSeriesChart
          title="Intención de voto en elecciones generales"
          data={voteSeries}
          colors={PARTY_COLORS}
          seriesOrder={voteOrder}
          hiddenByDefault={DEFAULT_HIDDEN_PARTIES}
          loading={busy}
        />
      </section>

      <section className="space-y-4">
        <TimeSeriesChart
          title="Principales problemas (% de respondientes que lo mencionan)"
          data={problemSeries}
          colors={problemColors}
          seriesOrder={problemOrder}
          seriesLabel={problemLegendLabel}
          endLabelFormatter={problemEmoji}
          loading={busy}
        />
      </section>

      {facets && (
        <FilterPanel facets={facets} filters={filters} onChange={setFilters} />
      )}

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
