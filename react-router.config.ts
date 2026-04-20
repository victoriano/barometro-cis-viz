import type { Config } from "@react-router/dev/config";

export default {
  // Pure SPA — output is static assets, deployable anywhere (Vercel / Netlify /
  // Cloudflare Pages / GitHub Pages). All data (Parquet + DuckDB-wasm) runs
  // client-side, so we don't need an SSR runtime.
  ssr: false,
} satisfies Config;
