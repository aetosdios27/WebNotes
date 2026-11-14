// Run after bun run build. Next 16 omits per-route gzip sizes from its summary.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const build = join(process.cwd(), ".next");
const manifest = readFileSync(join(build, "server/app/page_client-reference-manifest.js"), "utf8");
const files = new Set(manifest.match(/static\/chunks\/[^"\\]+\.js/g));
for (const file of readdirSync(join(build, "static/chunks"))) {
  if (file.startsWith("main-app-")) files.add(`static/chunks/${file}`);
}
const productionFiles = [...files].filter(file => /-[0-9a-f]{16}\.js$/.test(file) && existsSync(join(build, file))).sort();
console.log(JSON.stringify({
  scope: "Home route client-reference chunks plus main-app, gzip per unique production file",
  gzipBytes: productionFiles.reduce((total, file) => total + gzipSync(readFileSync(join(build, file)), { level: 9 }).length, 0),
  files: productionFiles,
}, null, 2));
