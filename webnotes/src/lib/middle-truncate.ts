const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const graphemes = (text: string) => Array.from(segmenter.segment(text), part => part.segment);

/** Keep `keep` characters of `full`, split around a middle ellipsis. Edges
 * snap to a word only when that costs three characters or fewer: telling
 * near-duplicates apart matters more than avoiding a word fragment. */
export function shortenMiddle(full: string, keep: number): string {
  const parts = graphemes(full);
  const headCount = Math.ceil(keep * 0.55);
  let head = parts.slice(0, headCount);
  let tail = parts.slice(parts.length - (keep - headCount));
  const headSpace = head.lastIndexOf(" ");
  if (headSpace > 0 && headSpace >= head.length - 3) head = head.slice(0, headSpace);
  const tailSpace = tail.indexOf(" ");
  if (tailSpace >= 0 && tailSpace <= 3) tail = tail.slice(tailSpace + 1);
  const separator = /^[\s,·—-]+$/u;
  while (head.length && separator.test(head[head.length - 1])) head.pop();
  while (tail.length && separator.test(tail[0])) tail.shift();
  return `${head.join("")} … ${tail.join("")}`;
}

/** The longest middle-shortened form of `full` that `fits`, so
 * "University applications … letters before" and "… letters after" stay
 * distinct where an end ellipsis would make them identical. */
export function middleTruncate(full: string, fits: (text: string) => boolean): string {
  if (fits(full)) return full;
  let low = 4;
  let high = graphemes(full).length - 1;
  if (high < low || !fits(shortenMiddle(full, low))) return fits("…") ? "…" : "";
  while (low < high) {
    const keep = Math.ceil((low + high) / 2);
    if (fits(shortenMiddle(full, keep))) low = keep;
    else high = keep - 1;
  }
  return shortenMiddle(full, low);
}
