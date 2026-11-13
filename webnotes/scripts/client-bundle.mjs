// Next 16 omits bundle sizes from its build table. Count each emitted script
// once, separately for the initial page and its lazy-loaded editor/sync code.
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const html = readFileSync('.next/server/app/index.html', 'utf8');
const initial = [...html.matchAll(/<script[^>]+src="\/_next\/([^"?]+)/g)].map(m => m[1]);
const lazy = JSON.parse(readFileSync('.next/react-loadable-manifest.json', 'utf8'));
function measure(files) {
  const unique = [...new Set(files)];
  const totals = unique.reduce((total, file) => {
    const path = `.next/${file}`;
    return { bytes: total.bytes + statSync(path).size, gzipBytes: total.gzipBytes + gzipSync(readFileSync(path)).length };
  }, { bytes: 0, gzipBytes: 0 });
  return { chunks: unique.length, ...totals };
}
const editor = lazy['app/page.tsx -> @/app/components/NoteEditor']?.files ?? [];
const allClient = readdirSync('.next/static/chunks', { recursive: true })
  .filter(file => file.endsWith('.js')).map(file => `static/chunks/${file}`);
console.log(JSON.stringify({ page: '/', initial: measure(initial), withEditor: measure([...initial, ...editor]), allClientChunks: measure(allClient) }));
