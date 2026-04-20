import { FacetDistribution } from "./FacetDistribution";
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
      : "grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3";

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
          if (values.length === 0) return null;
          return (
            <FacetDistribution
              key={facet.key}
              label={facet.label}
              values={values}
              selected={new Set(filters[facet.key] ?? [])}
              onToggle={(v) => toggle(facet.key, v)}
              onReset={() => clearKey(facet.key)}
            />
          );
        })}
      </div>
    </section>
  );
}
