# barómetro-cis-viz

Static web app that charts Spanish Barómetro del CIS data month by month:

- **Vote intention** (top chart) and **most-cited problems** (bottom chart),
  raw or weighted with the official CIS ponderación.
- Demographic **cross-filters** (sexo, edad, CCAA, estudios, clase social,
  autoubicación ideológica) that re-query the dataset live.

The whole dataset (≈11 MB Parquet, 334k rows × 98 cols, 2020-present) is
loaded into the browser and queried in place with
[DuckDB-wasm](https://github.com/duckdb/duckdb-wasm). Charts are rendered
with ECharts.

The Parquet comes from the pipeline at
<https://github.com/victoriano/social-sciences-microdata>, published on
<https://huggingface.co/datasets/victoriano/social-sciences-microdata>.

## Stack

- [React Router v7](https://reactrouter.com) (ex-Remix) in **SPA mode** —
  output is static, no Node runtime needed at deploy time.
- Tailwind CSS v4 + DaisyUI.
- DuckDB-wasm + Apache Arrow.
- ECharts via `echarts-for-react`.

## Local dev

```bash
bun install
bun run dev
```

The Parquet is served from `public/data/processed_barometros.parquet`. To
refresh it, run the pipeline in the sibling repo and copy the artefact:

```bash
cp ../social-sciences-microdata/data/Spain/barometro_cis/processed/processed_barometros.parquet \
   public/data/processed_barometros.parquet
```

## Deploy

Tested on Vercel. A `vercel.json` pins the build command to
`bun run build` and the output directory to `build/client` (Remix SPA
drops the server bundle automatically). Any static host works —
`build/client/` is a plain folder of HTML + JS + WASM + Parquet.

```bash
bun run build
```

## Caveats

- Barómetros pre-2021 don't ship the `Ponderación` column, so the
  "ponderado" toggle falls back to `1.0` for those respondents (they
  still contribute to the chart, just unweighted).
- MD3357 (Barómetro Sanitario 2022 primera oleada) is skipped by the
  upstream pipeline because pyreadstat can't parse its SAV.
