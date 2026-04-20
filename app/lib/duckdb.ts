import * as duckdb from "@duckdb/duckdb-wasm";

// Each browser tab gets a single DuckDB instance. We register the parquet
// shipped in public/data as a virtual file and expose a cached connection.
export type DuckDB = {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
};

let instance: Promise<DuckDB> | null = null;

async function create(): Promise<DuckDB> {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], {
      type: "text/javascript",
    })
  );

  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  // Fetch the Parquet from our own /data/ so we don't depend on remote CORS.
  const parquetResponse = await fetch("/data/processed_barometros.parquet");
  if (!parquetResponse.ok) {
    throw new Error(
      `Failed to load parquet: HTTP ${parquetResponse.status}`
    );
  }
  const parquetBytes = new Uint8Array(await parquetResponse.arrayBuffer());
  await db.registerFileBuffer("barometros.parquet", parquetBytes);

  const conn = await db.connect();
  await conn.query(
    `CREATE VIEW barometros AS SELECT * FROM read_parquet('barometros.parquet')`
  );

  return { db, conn };
}

export function getDuckDB(): Promise<DuckDB> {
  if (!instance) instance = create();
  return instance;
}

export async function runQuery<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const { conn } = await getDuckDB();
  const result = await conn.query(sql);
  return result.toArray().map((row) => row.toJSON() as T);
}
