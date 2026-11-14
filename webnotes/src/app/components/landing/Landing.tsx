"use client";

import { useEffect, useRef, useState } from "react";
import DemoNote from "./DemoNote";
import s from "./Landing.module.css";

export default function Landing({ onStart }: { onStart: () => Promise<void> }) {
  const root = useRef<HTMLDivElement>(null);
  const starting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [example, setExample] = useState<"Tables" | "Math" | "Code">("Tables");
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.removeAttribute("data-waiting"); observer.unobserve(entry.target); }
    }), { root: root.current, threshold: 0.12 });
    root.current?.querySelectorAll("[data-reveal]").forEach(node => { node.setAttribute("data-waiting", ""); observer.observe(node); });
    return () => observer.disconnect();
  }, []);
  async function start() {
    if (starting.current) return;
    starting.current = true; setBusy(true); setError("");
    try { await onStart(); } catch { starting.current = false; setBusy(false); setError("Couldn't open a note. Please try again."); }
  }
  const button = <button className={s.primary} disabled={busy} onClick={() => void start()}>{busy ? "Opening your page…" : "Just start writing"}<span aria-hidden="true">↗</span></button>;
  return <div className={s.landing} ref={root}>
    <div className={s.wrap}>
      <header className={s.nav}><a href="#top" className={s.brand}><img src="/logo-traced.svg" alt="" width="39" height="24" />webnotes</a><nav aria-label="Main navigation"><a className={s.explore} href="#inside">A look inside</a><a href="/signin">Sign in ↗</a></nav></header>
      <main id="top">
        <section className={s.hero} aria-labelledby="landing-title"><div className={s.invitation}><h1 id="landing-title">A thought.<br />A place for it.</h1><p>Open a page, put something down.<br />A little space to think, no account needed.</p><div className={s.actions}>{button}<a href="/signin">Sign in</a></div>{error && <p role="alert">{error}</p>}</div><DemoNote /></section>
        <section id="inside" className={s.tools} data-reveal aria-labelledby="tools-title"><div><h2 id="tools-title">More than<br />a blank page.</h2><p>A table for the trip. Math for the budget.<br />Code worth keeping. Type / and keep going.</p><div className={s.tabs} aria-label="Editor examples">{(["Tables", "Math", "Code"] as const).map(name => <button key={name} aria-pressed={example === name} onClick={() => setExample(name)}>{name}</button>)}</div></div><div className={s.sample} data-ui><article><h3>{example === "Tables" ? "Lisbon, on paper" : example === "Math" ? "Split the trip" : "A small thing to keep"}</h3><p>{example === "Code" ? "For the next time I need it." : "Eight nights. A little room for the unexpected."}</p>{example === "Tables" ? <table><thead><tr><th>Budget</th><th>Amount</th></tr></thead><tbody><tr><td>Flights</td><td>€312</td></tr><tr><td>Stay, 8 nights</td><td>€890</td></tr><tr><td>Food and trains</td><td>€400</td></tr><tr><td>Total</td><td>€1,602</td></tr></tbody></table> : example === "Math" ? <div className={s.formula}>€1,602 ÷ 2 = €801</div> : <pre><code>{'const trip = {\n  city: "Lisbon",\n  nights: 8,\n};\n\nconsole.log(trip.city);'}</code></pre>}<span className={s.command}>/ {example.toLowerCase()}</span></article></div></section>
        <section className={s.sync} data-reveal aria-labelledby="sync-title"><div className={s.devices} data-ui aria-label="Packing list shown on a computer and phone"><article><h3>Packing list</h3><p>Carry-on only.<br />If it does not fit, it stays.</p><p>✓ Passport<br />□ Film camera<br />□ Rain shell</p></article><article className={s.phone}><h3>Packing list</h3><p>Carry-on only.</p><p>✓ Passport<br />□ Film camera<br />□ Rain shell</p></article></div><div><h2 id="sync-title">Start here.<br />Pick up anywhere.</h2><p>Your notes live on your device, and work offline. Sign in when you want them on your other devices, too.</p><a href="/signin" className={s.underlink}>Sign in to sync ↗</a></div></section>
        <section className={s.closing} data-reveal aria-labelledby="closing-title">
          {/* ASCII ENGINE SLOT: mount the shared components/ascii background here later. */}
          <div data-ascii-slot="landing-closing" aria-hidden="true" />
          <div><h2 id="closing-title">Your next thought<br />can start here.</h2><p>A place for your notes.</p></div>{button}
        </section>
      </main>
      <footer className={s.footer}><a href="#top" className={s.brand}><img src="/logo-traced.svg" alt="" width="39" height="24" />webnotes</a><span>Yours to write. Yours to keep.</span><a href="/signin">Sign in ↗</a></footer>
    </div>
  </div>;
}
