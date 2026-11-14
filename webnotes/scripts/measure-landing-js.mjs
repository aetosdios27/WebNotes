// Run with `bun scripts/measure-landing-js.mjs` after `bun run build`.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const html = readFileSync(".next/server/app/index.html", "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+\.js)"[^>]*>/g)]
  .filter(([tag]) => !/noModule/i.test(tag))
  .map(([, src]) => src.replace(/^\/_next\//, ".next/"));
const files = [...new Set(scripts)];
let raw = 0;
let gzip = 0;
for (const file of files) {
  const content = readFileSync(file);
  raw += content.length;
  gzip += gzipSync(content).length;
  console.log(
    `${file}: ${content.length} bytes (${gzipSync(content).length} gzip)`,
  );
}
console.log(
  `Landing initial modern JS: ${raw} bytes raw, ${gzip} bytes gzip across ${files.length} files.`,
);
console.log(
  "Includes Next/React, root providers and landing. Excludes async app/editor, legacy polyfill and service worker precache.",
);
