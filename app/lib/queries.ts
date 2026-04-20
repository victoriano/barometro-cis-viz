import { runQuery } from "./duckdb";

// DuckDB needs identifiers in double quotes when they contain spaces or accents.
// We consolidate the mapping here so the rest of the app just references keys.
const EDAD_BUCKET_SQL = `
CASE
  WHEN TRY_CAST("Edad de la persona entrevistada" AS DOUBLE) < 25 THEN '18-24'
  WHEN TRY_CAST("Edad de la persona entrevistada" AS DOUBLE) < 35 THEN '25-34'
  WHEN TRY_CAST("Edad de la persona entrevistada" AS DOUBLE) < 45 THEN '35-44'
  WHEN TRY_CAST("Edad de la persona entrevistada" AS DOUBLE) < 55 THEN '45-54'
  WHEN TRY_CAST("Edad de la persona entrevistada" AS DOUBLE) < 65 THEN '55-64'
  WHEN TRY_CAST("Edad de la persona entrevistada" AS DOUBLE) >= 65 THEN '65+'
  ELSE NULL
END`;

const IDEOLOGIA_BUCKET_SQL = `
CASE
  WHEN TRY_CAST("Escala de autoubicación ideológica (1-10)" AS DOUBLE) BETWEEN 1 AND 2 THEN '1-2 (izq)'
  WHEN TRY_CAST("Escala de autoubicación ideológica (1-10)" AS DOUBLE) BETWEEN 3 AND 4 THEN '3-4'
  WHEN TRY_CAST("Escala de autoubicación ideológica (1-10)" AS DOUBLE) BETWEEN 5 AND 6 THEN '5-6 (centro)'
  WHEN TRY_CAST("Escala de autoubicación ideológica (1-10)" AS DOUBLE) BETWEEN 7 AND 8 THEN '7-8'
  WHEN TRY_CAST("Escala de autoubicación ideológica (1-10)" AS DOUBLE) BETWEEN 9 AND 10 THEN '9-10 (dcha)'
  ELSE NULL
END`;

// Weights are stored as strings with comma decimals (e.g. "0,34215"). Convert
// once in SQL so the rest of the queries stay readable.
const PESO_SQL = `COALESCE(TRY_CAST(REPLACE("Ponderación", ',', '.') AS DOUBLE), 1.0)`;

// Single source of truth for every demographic cross-filter. ``expr`` is the
// SQL expression that identifies the facet's value (a bucketed CASE WHEN for
// numeric fields, a plain quoted column otherwise); the UI iterates over this
// config to render the filter chips and build the WHERE clause.
export const FACETS = [
  { key: "sexo", label: "Sexo", expr: `"Sexo de la persona entrevistada"` },
  { key: "edadBucket", label: "Edad", expr: EDAD_BUCKET_SQL },
  { key: "ccaa", label: "Comunidad autónoma", expr: `"Comunidad autónoma"` },
  {
    key: "tamanoMunicipio",
    label: "Tamaño municipio",
    expr: `"Tamaño de municipio"`,
  },
  {
    key: "nacionalidad",
    label: "Nacionalidad",
    expr: `"Nacionalidad de la persona entrevistada"`,
  },
  {
    key: "estadoCivil",
    label: "Estado civil",
    expr: `"Estado civil de la persona entrevistada"`,
  },
  {
    key: "estudios",
    label: "Estudios",
    expr: `"Estudios de la persona entrevistada"`,
  },
  {
    key: "situacionLaboral",
    label: "Situación laboral",
    expr: `"Situación laboral de la persona entrevistada"`,
  },
  {
    key: "clase",
    label: "Clase social (objetiva)",
    expr: `"Clase social subjetiva de la persona entrevistada"`,
  },
  {
    key: "identificacionClase",
    label: "Identificación subjetiva de clase",
    expr: `"Identificación subjetiva de clase"`,
  },
  {
    key: "ingresos",
    label: "Ingresos netos del hogar",
    expr: `"Nivel de ingresos netos del hogar"`,
  },
  { key: "ideologia", label: "Ideología (1-10)", expr: IDEOLOGIA_BUCKET_SQL },
  {
    key: "valoracionPersonal",
    label: "Situación económica personal",
    expr: `"Valoración de la situación económica personal actual"`,
  },
  {
    key: "valoracionEspaña",
    label: "Situación económica de España",
    expr: `"Valoración de la situación económica general de España"`,
  },
  {
    key: "ultimoVoto",
    label: "Recuerdo últimas elecciones",
    expr: `"ultimo_voto_recordado"`,
  },
] as const;

export type FacetKey = (typeof FACETS)[number]["key"];
export type FilterState = Record<FacetKey, string[]>;

export const EMPTY_FILTERS: FilterState = Object.fromEntries(
  FACETS.map((f) => [f.key, [] as string[]]),
) as FilterState;

function sqlList(values: string[]): string {
  return values
    .map((v) => `'${v.replace(/'/g, "''")}'`)
    .join(", ");
}

function whereClause(filters: FilterState): string {
  const clauses: string[] = [];
  for (const facet of FACETS) {
    const selected = filters[facet.key];
    if (selected && selected.length > 0) {
      clauses.push(`(${facet.expr}) IN (${sqlList(selected)})`);
    }
  }
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

export type VotingRow = { date: string; party: string; pct: number };

// Parties we want to highlight; everything else is grouped as "Otros".
// "Podemos" folds in "Unidas Podemos" / "Unidos Podemos" because they are the
// same political force rebranded; same for "Sumar" and "Movimiento Sumar".
const MAIN_PARTIES = [
  "PSOE",
  "PP",
  "VOX",
  "Sumar",
  "Podemos",
  "Ciudadanos",
  "ERC",
  "Junts",
  "EAJ-PNV",
  "Bildu",
  "BNG",
  "CUP",
  "Más País",
];

const VOTE_NORMALIZED_SQL = `
CASE
  WHEN "Intención de voto en supuestas elecciones generales" IN ('Unidas Podemos', 'Unidos Podemos') THEN 'Podemos'
  WHEN "Intención de voto en supuestas elecciones generales" = 'Movimiento Sumar' THEN 'Sumar'
  ELSE "Intención de voto en supuestas elecciones generales"
END`;

const VOTE_BUCKET_SQL = `
CASE
  WHEN (${VOTE_NORMALIZED_SQL}) IN (${sqlList(MAIN_PARTIES)}) THEN (${VOTE_NORMALIZED_SQL})
  WHEN (${VOTE_NORMALIZED_SQL}) IN ('No votaría', 'No sabe todavía', 'En blanco', 'Voto nulo', 'N.C.', 'N.S.') THEN NULL
  ELSE 'Otros'
END`;

// Coarse left/right bloc classification. Regional parties are allocated by
// how they commonly align on national confidence votes; EAJ-PNV sits with the
// centre-right bloc, Bildu/ERC/BNG/CUP with the left. Non-classifiable
// options ("Otros partido") go to "Otros" so the three series sum to 100%.
const BLOC_SQL = `
CASE
  WHEN (${VOTE_NORMALIZED_SQL}) IN (
    'PSOE', 'Sumar', 'Podemos', 'Más País',
    'ERC', 'Bildu', 'EH Bildu', 'BNG', 'CUP',
    'Compromís', 'En Comú Podem', 'IU'
  ) THEN 'Izquierda'
  WHEN (${VOTE_NORMALIZED_SQL}) IN (
    'PP', 'VOX', 'Ciudadanos', 'Junts',
    'EAJ-PNV', 'UPN', 'Coalición Canaria', 'Navarra Suma'
  ) THEN 'Derecha'
  WHEN (${VOTE_NORMALIZED_SQL}) IN ('No votaría', 'No sabe todavía', 'En blanco', 'Voto nulo', 'N.C.', 'N.S.') THEN NULL
  ELSE 'Otros'
END`;

export type BlocRow = { date: string; bloc: string; pct: number };

export async function fetchBlocEvolution(
  filters: FilterState,
  weighted: boolean,
): Promise<BlocRow[]> {
  const weight = weighted ? PESO_SQL : "1.0";
  const where = whereClause(filters);
  const sql = `
    WITH base AS (
      SELECT date_of_study,
             ${BLOC_SQL} AS bloc,
             ${weight} AS w
      FROM barometros
      ${where}
    ),
    per_date AS (
      SELECT date_of_study,
             SUM(w) FILTER (WHERE bloc IS NOT NULL) AS total_w
      FROM base
      GROUP BY 1
    ),
    per_bloc AS (
      SELECT date_of_study, bloc, SUM(w) AS w
      FROM base
      WHERE bloc IS NOT NULL
      GROUP BY 1, 2
    )
    SELECT strftime(p.date_of_study, '%Y-%m-%d') AS date,
           p.bloc AS bloc,
           CAST(p.w AS DOUBLE) / t.total_w AS pct
    FROM per_bloc p JOIN per_date t USING (date_of_study)
    WHERE t.total_w > 0
    ORDER BY p.date_of_study, p.bloc
  `;
  return runQuery<BlocRow>(sql);
}

export async function fetchVoteEvolution(
  filters: FilterState,
  weighted: boolean,
): Promise<VotingRow[]> {
  const weight = weighted ? PESO_SQL : "1.0";
  const where = whereClause(filters);
  const sql = `
    WITH base AS (
      SELECT date_of_study,
             ${VOTE_BUCKET_SQL} AS party,
             ${weight} AS w
      FROM barometros
      ${where}
    ),
    per_date AS (
      SELECT date_of_study,
             SUM(w) FILTER (WHERE party IS NOT NULL) AS total_w
      FROM base
      GROUP BY 1
    ),
    per_party AS (
      SELECT date_of_study, party, SUM(w) AS w
      FROM base
      WHERE party IS NOT NULL
      GROUP BY 1, 2
    )
    SELECT strftime(p.date_of_study, '%Y-%m-%d') AS date,
           p.party AS party,
           CAST(p.w AS DOUBLE) / t.total_w AS pct
    FROM per_party p JOIN per_date t USING (date_of_study)
    WHERE t.total_w > 0
    ORDER BY p.date_of_study, p.party
  `;
  return runQuery<VotingRow>(sql);
}

export type ProblemRow = { date: string; problema: string; pct: number };

const NOISE_PROBLEM_SQL = `
CASE WHEN LOWER(prob) IN ('n.c.', 'n.s.', 'ninguno', 'ninguno, en especial') THEN NULL ELSE prob END`;

/**
 * Fold slight wording variants (singular/plural, truncated COVID labels, etc.)
 * into the canonical label that ``app/lib/problems.ts`` uses as its lookup
 * key. Keeping the CASE WHEN here means a single query returns consistently
 * named series that stay in sync with the metadata table.
 */
function normalizeProblemSQL(col: string): string {
  return `CASE
    WHEN ${col} LIKE 'La crisis económica%' THEN 'Crisis económica'
    WHEN ${col} LIKE 'Los peligros para la salud: COVID%' THEN 'COVID-19'
    WHEN ${col} = 'Los problemas políticos en general' THEN 'Problemas políticos'
    WHEN ${col} LIKE 'El mal comportamiento%' THEN 'Mal comportamiento políticos'
    WHEN ${col} LIKE 'Los problemas relacionados con la calidad%' THEN 'Calidad del empleo'
    WHEN ${col} LIKE 'El Gobierno y partidos%' THEN 'Gobierno y partidos'
    WHEN ${col} LIKE 'Los problemas de índole social%' THEN 'Problemas de índole social'
    WHEN ${col} LIKE 'Las desigualdades%' THEN 'Las desigualdades'
    WHEN ${col} LIKE 'La falta de acuerdos%' THEN 'Falta de acuerdos'
    WHEN ${col} = 'El funcionamiento de los servicios públicos' THEN 'Funcionamiento servicios públicos'
    WHEN ${col} LIKE 'Los problemas relacionados con la juventud%' THEN 'Juventud'
    ELSE ${col}
  END`;
}

// Top-N problems by overall mention share. We compute this once per filter
// change to pick which problems show in the chart.
function whereAnd(filters: FilterState, extra: string): string {
  // Combine the demographic WHERE with an extra predicate ("Primer problema IS NOT NULL"),
  // handling the case where the demographic filter is empty. We also restrict
  // to barómetros whose Primer/Segundo/Tercer problema question asks about
  // problems in Spain — a handful of estudios (e.g. MD3468 in July 2024) reuse
  // the same column names for a monographic module on *international*
  // problems, which otherwise produces a phantom dip in the chart.
  const scope = `problemas_ambito = 'españa'`;
  const base = whereClause(filters); // "" or "WHERE …"
  if (base) return `${base} AND ${scope} AND ${extra}`;
  return `WHERE ${scope} AND ${extra}`;
}

export async function fetchTopProblems(
  filters: FilterState,
  weighted: boolean,
  topN = 10,
): Promise<string[]> {
  const weight = weighted ? PESO_SQL : "1.0";
  const sql = `
    WITH long AS (
      SELECT ${normalizeProblemSQL('"Primer problema"')} AS prob, ${weight} AS w
        FROM barometros ${whereAnd(filters, '"Primer problema" IS NOT NULL')}
      UNION ALL
      SELECT ${normalizeProblemSQL('"Segundo problema"')}, ${weight}
        FROM barometros ${whereAnd(filters, '"Segundo problema" IS NOT NULL')}
      UNION ALL
      SELECT ${normalizeProblemSQL('"Tercer problema"')}, ${weight}
        FROM barometros ${whereAnd(filters, '"Tercer problema" IS NOT NULL')}
    ),
    cleaned AS (
      SELECT ${NOISE_PROBLEM_SQL} AS prob, w FROM long
    )
    SELECT prob, SUM(w) AS total FROM cleaned WHERE prob IS NOT NULL GROUP BY 1 ORDER BY total DESC LIMIT ${topN}
  `;
  const rows = await runQuery<{ prob: string }>(sql);
  return rows.map((r) => r.prob);
}

export async function fetchProblemEvolution(
  filters: FilterState,
  weighted: boolean,
  problems: string[],
): Promise<ProblemRow[]> {
  if (problems.length === 0) return [];
  const weight = weighted ? PESO_SQL : "1.0";
  const list = sqlList(problems);
  const sql = `
    WITH long AS (
      SELECT date_of_study, ${normalizeProblemSQL('"Primer problema"')} AS prob, ${weight} AS w
        FROM barometros ${whereAnd(filters, '"Primer problema" IS NOT NULL')}
      UNION ALL
      SELECT date_of_study, ${normalizeProblemSQL('"Segundo problema"')}, ${weight}
        FROM barometros ${whereAnd(filters, '"Segundo problema" IS NOT NULL')}
      UNION ALL
      SELECT date_of_study, ${normalizeProblemSQL('"Tercer problema"')}, ${weight}
        FROM barometros ${whereAnd(filters, '"Tercer problema" IS NOT NULL')}
    ),
    denom AS (
      -- Total respondent-weight per month. Restrict to estudios whose
      -- Primer/Segundo/Tercer problema asks about Spain so the denominator
      -- matches the numerator (otherwise MD3468's 4k international-module
      -- respondents would dilute July 2024 to near-zero). whereAnd() already
      -- injects the ambito predicate; TRUE keeps the SQL well-formed when no
      -- demographic filters are active.
      SELECT date_of_study, SUM(${weight}) AS total_w
      FROM barometros
      ${whereAnd(filters, "TRUE")}
      GROUP BY 1
    ),
    per AS (
      SELECT date_of_study, prob, SUM(w) AS w
      FROM long
      WHERE prob IN (${list})
      GROUP BY 1, 2
    )
    SELECT strftime(p.date_of_study, '%Y-%m-%d') AS date,
           p.prob AS problema,
           CAST(p.w AS DOUBLE) / d.total_w AS pct
    FROM per p JOIN denom d USING (date_of_study)
    WHERE d.total_w > 0
    ORDER BY p.date_of_study, p.prob
  `;
  return runQuery<ProblemRow>(sql);
}

export type FacetValue = { value: string; count: number; pct: number };

// Values we hide from filter chips because they're non-informative or admin
// noise (don't-know, don't-answer, "Otros", etc.). They'd never be a useful
// slice to filter on and just clutter the sidebar.
const FACET_VALUE_BLACKLIST = new Set<string>([
  "N.C.",
  "N.S.",
  "No sabe",
  "No contesta",
  "No recuerda",
  "En blanco",
  "Voto nulo",
  "Otras",
  "Otra",
  "Otros",
]);

export type Meta = {
  waves: number;
  respondents: number;
  rangeStart: string; // YYYY-MM-01
  rangeEnd: string;
};

export async function fetchMeta(): Promise<Meta> {
  const rows = await runQuery<{
    waves: number | bigint;
    respondents: number | bigint;
    range_start: string;
    range_end: string;
  }>(`
    SELECT COUNT(DISTINCT date_of_study) AS waves,
           COUNT(*) AS respondents,
           strftime(MIN(date_of_study), '%Y-%m-%d') AS range_start,
           strftime(MAX(date_of_study), '%Y-%m-%d') AS range_end
    FROM barometros
  `);
  const row = rows[0];
  return {
    waves: Number(row.waves),
    respondents: Number(row.respondents),
    rangeStart: row.range_start,
    rangeEnd: row.range_end,
  };
}

export async function fetchFacetValues(): Promise<Record<FacetKey, FacetValue[]>> {
  // One UNION ALL query per facet so DuckDB only scans the table once.
  const subqueries = FACETS.map(
    (f) =>
      `SELECT '${f.key}' AS facet, (${f.expr}) AS value, COUNT(*) AS n
         FROM barometros
         WHERE (${f.expr}) IS NOT NULL
         GROUP BY 1, 2`,
  ).join("\nUNION ALL\n");

  const rows = await runQuery<{ facet: string; value: string | null; n: number | bigint }>(subqueries);

  const out: Record<string, FacetValue[]> = Object.fromEntries(
    FACETS.map((f) => [f.key, [] as FacetValue[]]),
  );
  const totals: Record<string, number> = {};

  for (const row of rows) {
    if (row.value == null || row.value === "") continue;
    const value = String(row.value).trim();
    if (FACET_VALUE_BLACKLIST.has(value)) continue;
    const count = Number(row.n);
    out[row.facet].push({ value, count, pct: 0 });
    totals[row.facet] = (totals[row.facet] ?? 0) + count;
  }

  for (const key of Object.keys(out)) {
    const total = totals[key] ?? 0;
    for (const row of out[key]) {
      row.pct = total > 0 ? row.count / total : 0;
    }
    out[key].sort((a, b) => b.count - a.count);
  }
  return out as Record<FacetKey, FacetValue[]>;
}
