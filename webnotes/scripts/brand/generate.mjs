// Regenerates every WebNotes image asset from two sources: tile.mjs (the app
// icon) and social-card.html (the link preview).
//
//   cd webnotes && node scripts/brand/generate.mjs [ink|paper|yellow]
//
// Needs Playwright's Chromium (`bunx playwright install chromium`) and
// ImageMagick (`magick`). Tauri's own CLI produces the desktop icon set.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MARK, tile, variants } from "./tile.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "../..");
const out = (path) => join(app, path);
const work = join(here, ".out");
const variant = variants[process.argv[2] ?? "ink"];
if (!variant) throw new Error(`Unknown variant: ${process.argv[2]}`);
const magick = (...args) => execFileSync("magick", args, { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
const render = async (svg, file) => {
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.locator("svg").screenshot({ path: join(work, file), omitBackground: true });
};

// 1. Icon masters. "tile" keeps the macOS margin and shadow; "tight" fills more
//    of the square for 16–48px; "full" is opaque edge to edge for masks.
await render(tile(variant), "tile.png");
await render(tile({ ...variant, margin: 40, radius: 210, glow: 0.08 }), "tight.png");
await render(tile({ ...variant, full: true }), "full.png");

// 2. Desktop: Tauri generates .icns, .ico and every PNG it needs.
execFileSync("bunx", ["tauri", "icon", join(work, "tile.png"), "-o", out("src-tauri/icons")], { cwd: app, stdio: "inherit" });
// No mobile targets ship; drop the platform folders the CLI adds.
for (const dir of ["android", "ios"]) rmSync(out(`src-tauri/icons/${dir}`), { recursive: true, force: true });
// Small Windows sizes read better from the tight tile.
magick(join(work, "tight.png"), "-define", "icon:auto-resize=256,48,32,16", out("src-tauri/icons/icon.ico"));
magick(join(work, "tight.png"), "-resize", "32x32", out("src-tauri/icons/32x32.png"));

// 3. Web: PWA icons, a maskable icon, the Apple touch icon and favicon.ico.
mkdirSync(out("public/icons"), { recursive: true });
magick(join(work, "tile.png"), "-resize", "192x192", out("public/icons/icon-192.png"));
magick(join(work, "tile.png"), "-resize", "512x512", out("public/icons/icon-512.png"));
// Maskable: opaque, mark inside the central 80% safe zone.
magick(join(work, "full.png"), "-resize", "512x512", out("public/icons/icon-maskable-512.png"));
// iOS rounds the corners itself and rejects transparency.
magick(join(work, "full.png"), "-resize", "180x180", "-background", variant.base, "-flatten", out("src/app/apple-icon.png"));
magick(join(work, "tight.png"), "-define", "icon:auto-resize=48,32,16", out("src/app/favicon.ico"));

// 4. SVG favicon: just the mark, ink on light tabs, yellow on dark tabs.
writeFileSync(out("src/app/icon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -49 168 168">
<style>path{fill:#1c1b17}@media (prefers-color-scheme:dark){path{fill:#fbca04}}</style>
${MARK.map((d) => `<path d="${d}"/>`).join("")}
</svg>
`);

// 5. Link preview: 1200×630 for Open Graph and Twitter.
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(pathToFileURL(join(here, "social-card.html")).href);
await page.evaluate(() => window.render());
await page.locator("#card").screenshot({ path: out("src/app/opengraph-image.png") });
magick(out("src/app/opengraph-image.png"), out("src/app/twitter-image.png"));

await browser.close();
rmSync(work, { recursive: true, force: true });
console.log("Brand assets regenerated.");
