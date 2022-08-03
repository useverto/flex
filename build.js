const { build } = require("esbuild");
const { Generator } = require("npm-dts");
const { dependencies, peerDependencies } = require("./package.json");

const shared = {
  entryPoints: ["./src/index.ts"],
  // outdir: "./dist",
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies)),
  bundle: true,
};

const runBuild = () => {
  build({
    ...shared,
    outfile: "./dist/index.js",
  }).catch(() => process.exit(1));

  build({
    ...shared,
    outfile: "./dist/index.esm.js",
    format: "esm",
  }).catch(() => process.exit(1));

  new Generator({
    entry: "src/index.ts",
    output: "dist/index.d.ts",
  }).generate();
};

runBuild();

module.exports = runBuild;
