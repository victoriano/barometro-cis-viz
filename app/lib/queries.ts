import { runQuery } from "./duckdb";

export type FilterState = {
  sexo: string[];
  edadBucket: string[];
  ccaa: string[];
  estudios: string[];
  clase: string[];
  ideologia: string[];
  ultimoVoto: string[];
};

export const EMPTY_FILTERS: FilterState = {
  sexo: [],
  edadBucket: [],
  ccaa: [],
  estudios: [],
  clase: [],
  ideologia: [],
  ultimoVoto: [],
};

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

function sqlList(values: string[]): string {
  return values
    .map((v) => `'${v.replace(/'/g, "''")}'`)
    .join(", ");
}

function whereClause(filters: FilterState): string {
  const clauses: string[] = [];
  if (filters.sexo.length) clauses.push(`"Sexo de la persona entrevistada" IN (${sqlList(filters.sexo)})`);
  if (filters.edadBucket.length) clauses.push(`(${EDAD_BUCKET_SQL}) IN (${sqlList(filters.edadBucket)})`);
  if (filters.ccaa.length) clauses.push(`"Comunidad autónoma" IN (${sqlList(filters.ccaa)})`);
  if (filters.estudios.length) clauses.push(`"Estudios de la persona entrevistada" IN (${sqlList(filters.estudios)})`);
  if (filters.clase.length) clauses.push(`"Clase social subjetiva de la persona entrevistada" IN (${sqlList(filters.clase)})`);
  if (filters.ideologia.length) clauses.push(`(${IDEOLOGIA_BUCKET_SQL}) IN (${sqlList(filters.ideologia)})`);
  if (filters.ultimoVoto.length) clauses.push(`"ultimo_voto_recordado" IN (${sqlList(filters.ultimoVoto)})`);
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
  // handling the case where the demographic filter is empty.
  const base = whereClause(filters); // "" or "WHERE …"
  if (base) return `${base} AND ${extra}`;
  return `WHERE ${extra}`;
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
  const where = whereClause(filters);
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
      -- Total respondent-weight per month, counting each respondent once.
      SELECT date_of_study, SUM(${weight}) AS total_w
      FROM barometros
      ${where}
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

export type FacetValue = { value: string; count: number };

export async function fetchFacetValues(): Promise<Record<keyof FilterState, FacetValue[]>> {
  const sql = `
    SELECT 'sexo' AS facet, "Sexo de la persona entrevistada" AS value, COUNT(*) AS n
      FROM barometros WHERE "Sexo de la persona entrevistada" IS NOT NULL GROUP BY 1, 2
    UNION ALL
    SELECT 'edadBucket', ${EDAD_BUCKET_SQL}, COUNT(*)
      FROM barometros WHERE "Edad de la persona entrevistada" IS NOT NULL GROUP BY 1, 2
    UNION ALL
    SELECT 'ccaa', "Comunidad autónoma", COUNT(*)
      FROM barometros WHERE "Comunidad autónoma" IS NOT NULL GROUP BY 1, 2
    UNION ALL
    SELECT 'estudios', "Estudios de la persona entrevistada", COUNT(*)
      FROM barometros WHERE "Estudios de la persona entrevistada" IS NOT NULL GROUP BY 1, 2
    UNION ALL
    SELECT 'clase', "Clase social subjetiva de la persona entrevistada", COUNT(*)
      FROM barometros WHERE "Clase social subjetiva de la persona entrevistada" IS NOT NULL GROUP BY 1, 2
    UNION ALL
    SELECT 'ideologia', ${IDEOLOGIA_BUCKET_SQL}, COUNT(*)
      FROM barometros WHERE "Escala de autoubicación ideológica (1-10)" IS NOT NULL GROUP BY 1, 2
    UNION ALL
    SELECT 'ultimoVoto', "ultimo_voto_recordado", COUNT(*)
      FROM barometros WHERE "ultimo_voto_recordado" IS NOT NULL
        AND "ultimo_voto_recordado" NOT IN ('N.C.', 'N.S.', 'No recuerda', 'En blanco', 'Voto nulo')
      GROUP BY 1, 2
  `;
  const rows = await runQuery<{ facet: string; value: string | null; n: number }>(sql);
  const out: Record<string, FacetValue[]> = {
    sexo: [],
    edadBucket: [],
    ccaa: [],
    estudios: [],
    clase: [],
    ideologia: [],
    ultimoVoto: [],
  };
  for (const row of rows) {
    if (!row.value) continue;
    out[row.facet].push({ value: row.value, count: Number(row.n) });
  }
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => b.count - a.count);
  }
  return out as Record<keyof FilterState, FacetValue[]>;
}
