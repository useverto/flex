import { build } from "esbuild";

build({
  entryPoints: ["./src/interact.ts"],
  outdir: "./dist",
  minify: false,
  bundle: false,
}).catch(() => process.exit(1));
