import {
  EMPTY_FILTERS,
  FACETS,
  type FacetKey,
  type FacetValue,
  type FilterState,
} from "../lib/queries";

type Props = {
  facets: Record<FacetKey, FacetValue[]>;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  /**
   * ``stacked`` fits the panel in a narrow sidebar (single column).
   * ``grid`` spreads the facets over 2-3 columns when given full width.
   */
  variant?: "stacked" | "grid";
};

function formatPct(pct: number): string {
  if (pct <= 0) return "0%";
  if (pct < 0.01) return "<1%";
  if (pct < 0.1) return `${(pct * 100).toFixed(1)}%`;
  return `${Math.round(pct * 100)}%`;
}

export function FilterPanel({ facets, filters, onChange, variant = "grid" }: Props) {
  const toggle = (key: FacetKey, value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };
  const clearKey = (key: FacetKey) => onChange({ ...filters, [key]: [] });
  const clearAll = () => onChange({ ...EMPTY_FILTERS });

  const activeTotal = Object.values(filters).reduce((n, arr) => n + arr.length, 0);

  const gridClass =
    variant === "stacked"
      ? "flex flex-col gap-4"
      : "grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3";

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-base-content/70">
          Filtros demográficos
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={clearAll}
          disabled={activeTotal === 0}
        >
          Limpiar{activeTotal > 0 ? ` · ${activeTotal}` : ""}
        </button>
      </header>
      <div className={gridClass}>
        {FACETS.map((facet) => {
          const values = facets[facet.key] ?? [];
          const active = new Set(filters[facet.key] ?? []);
          if (values.length === 0) return null;
          return (
            <div key={facet.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-base-content/80">
                  {facet.label}
                </span>
                {active.size > 0 && (
                  <button
                    type="button"
                    className="link link-hover text-[11px] text-base-content/60"
                    onClick={() => clearKey(facet.key)}
                  >
                    reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {values.map((v) => {
                  const selected = active.has(v.value);
                  return (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => toggle(facet.key, v.value)}
                      className={`badge badge-xs text-[11px] leading-4 px-2 py-2 whitespace-nowrap gap-1 ${
                        selected ? "badge-primary" : "badge-outline"
                      }`}
                      title={`${v.count.toLocaleString("es-ES")} respuestas · ${(v.pct * 100).toFixed(1)}%`}
                    >
                      <span>{v.value}</span>
                      <span className="opacity-60">{formatPct(v.pct)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
