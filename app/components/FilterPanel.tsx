import type { FacetValue, FilterState } from "../lib/queries";

type FacetKey = keyof FilterState;

const FACET_LABELS: Record<FacetKey, string> = {
  sexo: "Sexo",
  edadBucket: "Edad",
  ccaa: "Comunidad autónoma",
  estudios: "Estudios",
  clase: "Clase social",
  ideologia: "Ideología (1-10)",
};

type Props = {
  facets: Record<FacetKey, FacetValue[]>;
  filters: FilterState;
  onChange: (next: FilterState) => void;
};

export function FilterPanel({ facets, filters, onChange }: Props) {
  const toggle = (key: FacetKey, value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };
  const clearKey = (key: FacetKey) => onChange({ ...filters, [key]: [] });
  const clearAll = () =>
    onChange({
      sexo: [],
      edadBucket: [],
      ccaa: [],
      estudios: [],
      clase: [],
      ideologia: [],
    });

  const activeTotal = Object.values(filters).reduce((n, arr) => n + arr.length, 0);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cross-filtros demográficos</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={clearAll}
          disabled={activeTotal === 0}
        >
          Limpiar ({activeTotal})
        </button>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(FACET_LABELS) as FacetKey[]).map((key) => {
          const label = FACET_LABELS[key];
          const values = facets[key] ?? [];
          const active = new Set(filters[key]);
          if (values.length === 0) return null;
          return (
            <div key={key} className="rounded-box border border-base-300 bg-base-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                {active.size > 0 && (
                  <button
                    type="button"
                    className="link link-hover text-xs"
                    onClick={() => clearKey(key)}
                  >
                    reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {values.map((v) => {
                  const selected = active.has(v.value);
                  return (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => toggle(key, v.value)}
                      className={`badge text-xs whitespace-nowrap ${
                        selected ? "badge-primary" : "badge-outline"
                      }`}
                      title={`${v.count.toLocaleString("es-ES")} respuestas`}
                    >
                      {v.value}
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
