"use client";

import { useEffect, useRef, useState } from "react";
import s from "./Landing.module.css";

const samples = {
  "Lisbon in April": '<p>Flights are booked for the 11th. Six nights in Graça, then two in Sintra. Everything else is in <mark>Packing list</mark>.</p><h3>Before we go</h3><p>Reserve Ramiro for Friday.<br>Leave a whole afternoon for getting lost.</p>',
  "Packing list": '<p>Carry-on only. If it does not fit, it stays.</p><h3>In the bag</h3><p>Passport<br>Film camera, 3 rolls<br>Rain shell<br>Adapter</p>',
  "Apartment shortlist": '<p>Graça two-bed, top floor, no lift.</p><p>Ask about the terrace.</p>',
};
type Sample = keyof typeof samples;
type Suggestion = { kind: "link"; query: string; range: Range } | { kind: "block"; query: string; range: Range };

export default function DemoNote() {
  const body = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touched = useRef(false);
  const [title, setTitle] = useState<Sample>("Lisbon in April");
  const [hint, setHint] = useState("Try [[ to link a note, or / for a block.");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [query, setQuery] = useState("");
  const drafts = useRef<Record<Sample, string>>({ ...samples });
  function openSearch() { touched.current = true; setQuery(""); dialog.current?.showModal(); }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); touched.current = true; dialog.current?.showModal(); }
    }
    document.addEventListener("keydown", key);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => document.removeEventListener("keydown", key);
    const text = "Try [[ to link a note, or / for a block.";
    let index = 0;
    const timer = setInterval(() => {
      if (touched.current || index >= text.length) { clearInterval(timer); return; }
      setHint(text.slice(0, ++index));
    }, 55);
    return () => { clearInterval(timer); document.removeEventListener("keydown", key); };
  }, []);
  function load(name: Sample) {
    if (body.current) { drafts.current[title] = body.current.innerHTML; body.current.innerHTML = drafts.current[name]; }
    setTitle(name); setSuggestion(null); dialog.current?.close(); body.current?.focus();
  }
  function inspect() {
    const selection = window.getSelection();
    if (!body.current || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0).cloneRange();
    const before = range.cloneRange(); before.selectNodeContents(body.current); before.setEnd(range.endContainer, range.endOffset);
    const text = before.toString();
    const link = text.match(/\[\[([^\[\]\n]*)$/);
    const block = text.match(/(?:^|\s)\/([a-z]*)$/i);
    setSuggestion(link ? { kind: "link", query: link[1], range } : block ? { kind: "block", query: block[1], range } : null);
  }
  const options = suggestion ? (suggestion.kind === "link" ? Object.keys(samples) : ["Table", "Math", "Code"]).filter(name => name.toLowerCase().includes(suggestion.query.toLowerCase())) : [];
  function insert(name: string) {
    if (!suggestion) return;
    body.current?.focus();
    const range = suggestion.range;
    const count = suggestion.query.length + (suggestion.kind === "link" ? 2 : 1);
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset >= count) range.setStart(range.startContainer, range.startOffset - count);
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    const html = suggestion.kind === "link" ? `<mark>${name}</mark>&nbsp;` : name === "Table" ? '<table><tbody><tr><th>Item</th><th>Amount</th></tr><tr><td>Flights</td><td>€312</td></tr></tbody></table><p><br></p>' : name === "Math" ? '<p>€1,602 ÷ 2 = €801</p>' : '<pre><code>const city = "Lisbon";</code></pre><p><br></p>';
    document.execCommand("insertHTML", false, html); setSuggestion(null);
  }
  return <div onPointerDown={() => { touched.current = true; }} onKeyDownCapture={() => { touched.current = true; }}>
    <div className={s.demo} data-ui>
      <div className={s.demoBar}><img src="/logo-traced.svg" width="28" height="18" alt="WebNotes" /><button onClick={openSearch}>{title}<kbd>⌘ K</kbd></button><span>Demo only</span></div>
      <article className={s.paper}><h2>{title}</h2><p className={s.date}>Today · Travel</p>
        <div ref={body} className={s.editor} contentEditable suppressContentEditableWarning role="textbox" aria-label="Try the demo note" aria-multiline="true" spellCheck={false} dangerouslySetInnerHTML={{ __html: samples["Lisbon in April"] }} onInput={inspect}
          onPaste={event => { event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); }}
          onKeyDown={event => { if (event.key === "Escape") setSuggestion(null); if (suggestion && (event.key === "Enter" || event.key === "ArrowDown")) { event.preventDefault(); if (event.key === "Enter" && options[0]) insert(options[0]); else document.getElementById("demo-suggestion-0")?.focus(); } }} />
        {suggestion && <div className={s.suggestions} role="group" aria-label={suggestion.kind === "link" ? "Link a note" : "Insert a block"} onKeyDown={event => {
          const buttons = Array.from(event.currentTarget.querySelectorAll("button")); const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if (event.key === "Escape") { setSuggestion(null); body.current?.focus(); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
        }}>{options.length ? options.map((name, index) => <button id={`demo-suggestion-${index}`} key={name} onMouseDown={event => event.preventDefault()} onClick={() => insert(name)}>{name}</button>) : <p>No matches</p>}</div>}
      </article>
    </div>
    <div className={s.demoHint}><span>{hint}</span><button onClick={openSearch} aria-label="Find a sample note">Find a note ↗</button></div>
    <dialog ref={dialog} className={s.search} aria-label="Find a sample note" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div><input autoFocus aria-label="Search sample notes" placeholder="Find a sample note…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>("[data-result]")?.focus(); } }} /><button onClick={() => dialog.current?.close()}>Close</button></div>
      {(Object.keys(samples) as Sample[]).filter(name => name.toLowerCase().includes(query.toLowerCase())).map(name => <button data-result key={name} onClick={() => load(name)}>{name}<span>↗</span></button>)}
      <p>Sample notes only. Nothing here is saved.</p>
    </dialog>
  </div>;
}
