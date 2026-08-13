import { build } from "esbuild";
import { existsSync } from "node:fs";

const entryPoint = "dist/server/entry.mjs";
const outfile = "dist/worker-bundle.mjs";

if (!existsSync(entryPoint)) {
  console.error(
    `${entryPoint} が見つかりません。先に \`astro build\` を実行してください。`
  );
  process.exit(1);
}

await build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  conditions: ["workerd", "worker", "browser"],
  // workerdが提供する組み込みモジュール。バンドルに含めず外部参照のままにする。
  external: ["cloudflare:*", "node:*"],
  minify: false,
});

console.log(`Bundled ${entryPoint} -> ${outfile}`);
