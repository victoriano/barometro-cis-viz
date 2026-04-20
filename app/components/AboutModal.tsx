import { MONO, SANS, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

type Props = {
  open: boolean;
  onClose: () => void;
  waves: number;
  respondents: number;
};

const LINKS = [
  {
    label: "github.com/victoriano/barometro-cis-viz",
    href: "https://github.com/victoriano/barometro-cis-viz",
    sub: "este dashboard",
  },
  {
    label: "github.com/victoriano/social-sciences-microdata",
    href: "https://github.com/victoriano/social-sciences-microdata/tree/main/Spain/barometro_cis",
    sub: "pipeline de ingesta y procesamiento",
  },
  {
    label: "huggingface.co/datasets/victoriano/social-sciences-microdata",
    href: "https://huggingface.co/datasets/victoriano/social-sciences-microdata/tree/main/spain/barometro_cis",
    sub: "dataset en Parquet",
  },
  {
    label: "cis.es · fichero original",
    href: "https://www.cis.es/catalogo-estudios/resultados-definidos/barometros",
    sub: "fuente primaria (SAV/CSV)",
  },
];

export function AboutModal({ open, onClose, waves, respondents }: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.panel,
          border: `1px solid ${t.lineHi}`,
          borderRadius: 4,
          maxWidth: 720,
          width: "100%",
          maxHeight: "88%",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            padding: "14px 22px",
            borderBottom: `1px solid ${t.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: 0.8,
            color: t.textDim,
            textTransform: "uppercase",
          }}
        >
          <span>▸ About · Barómetro CIS</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: t.text,
              fontFamily: MONO,
              fontSize: 16,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            padding: "22px 24px",
            color: t.text,
            fontFamily: SANS,
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          <SectionLabel>Créditos</SectionLabel>
          <p style={{ marginTop: 0 }}>
            Diseño, procesado de datos y curación de eventos por{" "}
            <a
              href="https://twitter.com/victorianoi"
              target="_blank"
              rel="noreferrer"
              style={{
                color: t.accent,
                textDecoration: "none",
                borderBottom: `1px solid ${t.accentLine}`,
              }}
            >
              Victoriano Izquierdo
            </a>
            . Proyecto personal · {new Date().getFullYear()}.
          </p>

          <SectionLabel style={{ marginTop: 20 }}>Metodología</SectionLabel>
          <p style={{ marginTop: 0 }}>
            <Strong>Fuente.</Strong> Microdatos mensuales del Barómetro del
            Centro de Investigaciones Sociológicas (CIS), enero 2020 en
            adelante. {waves} oleadas y{" "}
            {new Intl.NumberFormat("es-ES").format(respondents)} respondientes
            agregados (solo Barómetros mensuales).
          </p>
          <p>
            <Strong>Procesamiento.</Strong> Los ficheros SAV/CSV del CIS se
            normalizan a un esquema estable de 98 columnas y se publican como
            Parquet en Hugging Face. Las consultas corren cliente-side sobre
            ese Parquet vía duckdb-wasm — los filtros demográficos se traducen
            a predicados <Code>WHERE</Code>.
          </p>
          <p>
            <Strong>Ponderación.</Strong> Por defecto se aplica el peso
            muestral oficial del CIS. El toggle <Code>crudo / ponderado</Code>{" "}
            permite comparar con los totales sin ponderar. Los barómetros
            anteriores a 2021 no incluyen columna de ponderación y cuentan sin
            peso en ese modo.
          </p>
          <p>
            <Strong>Filtrado.</Strong> Los Barómetros Sanitarios y los
            estudios-monográficos (p.ej. MD3445 con su módulo agrícola o MD3468
            con su módulo internacional) se excluyen de la vista para evitar
            dientes-de-sierra por metodología distinta.
          </p>
          <p>
            <Strong>Eventos.</Strong> Las anotaciones (elecciones, crisis,
            políticas, momentos) están curadas manualmente a partir de prensa
            nacional; el detalle explicativo es interpretación del autor y no
            debe leerse como hallazgo estadístico.
          </p>

          <SectionLabel style={{ marginTop: 22 }}>Datos &amp; código</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  padding: "6px 10px",
                  background: t.panelHi,
                  border: `1px solid ${t.line}`,
                  borderRadius: 2,
                  textDecoration: "none",
                  fontFamily: MONO,
                  fontSize: 11.5,
                }}
              >
                <span style={{ color: t.accent }}>↗</span>
                <span style={{ color: t.text, flex: "0 0 auto" }}>{l.label}</span>
                <span style={{ color: t.textMute, fontSize: 10.5 }}>{l.sub}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 0.8,
        color: t.textMute,
        textTransform: "uppercase",
        marginBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  return <strong style={{ color: t.accent }}>{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  return (
    <code
      style={{
        fontFamily: MONO,
        fontSize: 11.5,
        background: t.panelHi,
        padding: "1px 5px",
        borderRadius: 2,
      }}
    >
      {children}
    </code>
  );
}
