import { FacetDistribution } from "./FacetDistribution";
import {
  EMPTY_FILTERS,
  FACETS,
  type FacetKey,
  type FacetValue,
  type FilterState,
} from "../lib/queries";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

type Props = {
  facets: Record<FacetKey, FacetValue[]>;
  filters: FilterState;
  onChange: (next: FilterState) => void;
};

const FACET_SQL_LABEL: Partial<Record<FacetKey, string>> = {
  sexo: "sexo",
  edadBucket: "edad_bucket",
  ccaa: "ccaa",
  tamanoMunicipio: "tamano_municipio",
  nacionalidad: "nacionalidad",
  estadoCivil: "estado_civil",
  estudios: "estudios",
  situacionLaboral: "situacion_laboral",
  clase: "clase_social",
  identificacionClase: "clase_subjetiva",
  ingresos: "ingresos_hogar",
  ideologia: "ideologia_bucket",
  valoracionPersonal: "valoracion_personal",
  valoracionEspaña: "valoracion_españa",
  ultimoVoto: "recuerdo_voto",
};

export function FilterPanel({ facets, filters, onChange }: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

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

  return (
    <section className="space-y-2">
      <div
        className="flex items-center justify-between uppercase"
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 0.8,
          color: t.textDim,
        }}
      >
        <span>Filtros · demográficos</span>
        <button
          type="button"
          disabled={activeTotal === 0}
          onClick={clearAll}
          className="cursor-pointer uppercase disabled:cursor-default"
          style={{
            background: "transparent",
            border: "none",
            fontFamily: MONO,
            fontSize: 10,
            color: activeTotal ? t.accent : t.textMute,
          }}
        >
          [ clear {activeTotal || ""} ]
        </button>
      </div>

      {activeTotal > 0 && (
        <div
          className="rounded-sm"
          style={{
            border: `1px solid ${t.accentLine}`,
            background: t.accentSoft,
            padding: "8px 10px",
            fontFamily: MONO,
            fontSize: 10.5,
            color: t.text,
          }}
        >
          <div
            style={{
              color: t.accent,
              marginBottom: 4,
              letterSpacing: 0.5,
            }}
          >
            WHERE · {activeTotal} predicado{activeTotal > 1 ? "s" : ""}
          </div>
          {(Object.keys(filters) as FacetKey[]).map((k) => {
            const arr = filters[k];
            if (!arr || arr.length === 0) return null;
            const sqlKey = FACET_SQL_LABEL[k] ?? k;
            return (
              <div key={k} style={{ color: t.textDim }}>
                {sqlKey} ∈ ({arr.map((v) => `'${v}'`).join(", ")})
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-0">
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
              previewRows={facet.key === "ccaa" ? 5 : 6}
              dense
            />
          );
        })}
      </div>
    </section>
  );
}
