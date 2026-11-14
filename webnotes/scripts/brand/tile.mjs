// Master app-icon artwork: a macOS-style squircle tile on a 1024 canvas
// (824px content, 100px margin) with depth: lit top edge, inner shade, grain.
export const MARK = ["M0 1H35V34L97 0V34L33 69H0Z", "M98 34L160 0V34L98 69Z"];
const squircle = (x, y, s, r) => {
  // Superellipse-ish continuous corner via cubic beziers (Apple-like).
  const k = r * 0.552284749831 * 1.18; // a touch squarer than a circle arc
  return `M${x + r} ${y}H${x + s - r}C${x + s - r + k} ${y} ${x + s} ${y + r - k} ${x + s} ${y + r}V${y + s - r}C${x + s} ${y + s - r + k} ${x + s - r + k} ${y + s} ${x + s - r} ${y + s}H${x + r}C${x + r - k} ${y + s} ${x} ${y + s - r + k} ${x} ${y + s - r}V${y + r}C${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y}Z`;
};
export function tile({ base, top, bottom, mark, markShade, grain = 0.06, rim, full = false, glow = 0.1, margin = 100, radius = 185 }) {
  const S = 1024, inset = full ? 0 : margin, size = S - inset * 2, r = full ? 0 : radius;
  const shape = squircle(inset, inset, size, r);
  const mw = size * 0.6, mh = mw * 70 / 160, mx = (S - mw) / 2, my = (S - mh) / 2 + size * 0.01;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs>
  <linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
  <radialGradient id="glow" cx="0.3" cy="0.12" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="${glow}"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="markFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mark}"/><stop offset="1" stop-color="${markShade}"/></linearGradient>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${grain} 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#1a1408" flood-opacity="${full ? 0 : 0.28}"/><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1a1408" flood-opacity="${full ? 0 : 0.18}"/></filter>
  <filter id="emboss" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.28"/></filter>
  <clipPath id="clip"><path d="${shape}"/></clipPath>
</defs>
<g filter="url(#drop)"><path d="${shape}" fill="url(#face)"/></g>
<g clip-path="url(#clip)">
  <rect width="${S}" height="${S}" fill="url(#glow)"/>
  <rect width="${S}" height="${S}" filter="url(#grain)" fill="#000"/>
  <g transform="translate(${mx} ${my}) scale(${mw / 160})" filter="url(#emboss)">${MARK.map(d => `<path d="${d}" fill="url(#markFace)"/>`).join("")}</g>
</g>
<path d="${shape}" fill="none" stroke="${rim}" stroke-width="3" clip-path="url(#clip)"/>
</svg>`;
}
export const variants = {
  ink: { base: "#16140f", top: "#2a2721", bottom: "#141310", mark: "#ffd21f", markShade: "#e0a800", rim: "rgba(255,255,255,0.10)", grain: 0.10 },
  paper: { base: "#f3f1ea", top: "#fbfaf6", bottom: "#e7e3d8", mark: "#24221c", markShade: "#0f0e0b", rim: "rgba(255,255,255,0.9)", grain: 0.07 },
  yellow: { base: "#fbca04", top: "#ffd83a", bottom: "#e9b400", mark: "#24201a", markShade: "#120f0a", rim: "rgba(255,255,255,0.45)", grain: 0.07 },
};
