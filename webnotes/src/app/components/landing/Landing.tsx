"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CloudCheck,
  Code2,
  Eye,
  Sigma,
  Table2,
} from "lucide-react";
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
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.removeAttribute("data-waiting");
            observer.unobserve(entry.target);
          }
        }),
      { root: root.current, threshold: 0.12 },
    );
    root.current?.querySelectorAll("[data-reveal]").forEach((node) => {
      node.setAttribute("data-waiting", "");
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);
  async function start() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError("");
    try {
      await onStart();
    } catch {
      starting.current = false;
      setBusy(false);
      setError("Couldn't open a note. Please try again.");
    }
  }
  const button = (
    <button className={s.primary} disabled={busy} onClick={() => void start()}>
      {busy ? "Opening your page…" : "Just start writing"}
      <ArrowRight size={19} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
  return (
    <div className={s.landing} ref={root}>
      <div className={s.wrap}>
        <header className={s.nav}>
          <a href="#top" className={s.brand}>
            <img src="/logo-traced.svg" alt="" width="39" height="24" />
            webnotes
          </a>
          <nav aria-label="Main navigation">
            <a className={s.explore} href="#inside">
              <Eye size={16} strokeWidth={1.5} aria-hidden="true" />A look
              inside
            </a>
            <a href="/signin" className={s.ghost}>
              Sign in
            </a>
          </nav>
        </header>
        <main id="top">
          <section className={s.hero} aria-labelledby="landing-title">
            <div className={s.invitation}>
              <h1 id="landing-title">
                A thought.
                <br />A place for it.
              </h1>
              <p>
                Open a page, put something down.
                <br />A little space to think, no account needed.
              </p>
              <div className={s.actions}>
                {button}
                <a href="/signin" className={s.ghost}>
                  Sign in
                </a>
              </div>
              {error && <p role="alert">{error}</p>}
            </div>
            <DemoNote />
          </section>
          <section
            id="inside"
            className={s.tools}
            data-reveal
            aria-labelledby="tools-title"
          >
            <div>
              <h2 id="tools-title">
                More than
                <br />a blank page.
              </h2>
              <p>
                A table for the trip. Math for the budget.
                <br />
                Code worth keeping. Type / and keep going.
              </p>
              <div
                className={s.tabs}
                data-example={example}
                aria-label="Editor examples"
              >
                <span className={s.activeSegment} aria-hidden="true" />
                {(["Tables", "Math", "Code"] as const).map((name) => (
                  <button
                    key={name}
                    aria-pressed={example === name}
                    onClick={() => setExample(name)}
                  >
                    {name === "Tables" ? (
                      <Table2 size={17} strokeWidth={1.5} aria-hidden="true" />
                    ) : name === "Math" ? (
                      <Sigma size={17} strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <Code2 size={17} strokeWidth={1.5} aria-hidden="true" />
                    )}
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.sample} data-ui>
              {(["Tables", "Math", "Code"] as const).map((name) => (
                <article
                  key={name}
                  data-active={example === name}
                  aria-hidden={example !== name}
                  inert={example !== name}
                >
                  <h3>
                    {name === "Tables"
                      ? "Lisbon, on paper"
                      : name === "Math"
                        ? "Split the trip"
                        : "A small thing to keep"}
                  </h3>
                  <p>
                    {name === "Code"
                      ? "For the next time I need it."
                      : "Eight nights. A little room for the unexpected."}
                  </p>
                  {name === "Tables" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Budget</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Flights</td>
                          <td>€312</td>
                        </tr>
                        <tr>
                          <td>Stay, 8 nights</td>
                          <td>€890</td>
                        </tr>
                        <tr>
                          <td>Food and trains</td>
                          <td>€400</td>
                        </tr>
                        <tr>
                          <td>Total</td>
                          <td>€1,602</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : name === "Math" ? (
                    <div className={s.formula}>€1,602 ÷ 2 = €801</div>
                  ) : (
                    <pre>
                      <code>
                        {
                          'const trip = {\n  city: "Lisbon",\n  nights: 8,\n};\n\nconsole.log(trip.city);'
                        }
                      </code>
                    </pre>
                  )}
                  <span className={s.command}>/ {name.toLowerCase()}</span>
                </article>
              ))}
            </div>
          </section>
          <section className={s.sync} data-reveal aria-labelledby="sync-title">
            <div
              className={s.devices}
              data-ui
              aria-label="Packing list shown on a computer and phone"
            >
              <article className={s.packingCard}>
                <div className={s.packingPaper}>
                  <h3>Packing list</h3>
                  <p>
                    Carry-on only.
                    <br />
                    If it does not fit, it stays.
                  </p>
                  <PackingChecklist />
                </div>
              </article>
              <article className={s.phone}>
                <div className={s.phoneScreen}>
                  <span className={s.phoneSpeaker} aria-hidden="true" />
                  <h3>Packing list</h3>
                  <p>Carry-on only.</p>
                  <PackingChecklist />
                  <span className={s.phoneHome} aria-hidden="true" />
                </div>
              </article>
            </div>
            <div>
              <CloudCheck
                className={s.syncIcon}
                size={26}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 id="sync-title">
                Start here.
                <br />
                Pick up anywhere.
              </h2>
              <p>
                Your notes live on your device, and work offline. Sign in when
                you want them on your other devices, too.
              </p>
              <a href="/signin" className={s.underlink}>
                Sign in to sync{" "}
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </div>
          </section>
          <section
            className={s.closing}
            data-reveal
            aria-labelledby="closing-title"
          >
            {/* ASCII ENGINE SLOT: mount the shared components/ascii background here later. */}
            <div data-ascii-slot="landing-closing" aria-hidden="true" />
            <div>
              <h2 id="closing-title">
                Your next thought
                <br />
                can start here.
              </h2>
              <p>A place for your notes.</p>
            </div>
            {button}
          </section>
        </main>
        <footer className={s.footer}>
          <a href="#top" className={s.brand}>
            <img src="/logo-traced.svg" alt="" width="39" height="24" />
            webnotes
          </a>
          <span>Yours to write. Yours to keep.</span>
          <a href="/signin" className={s.ghost}>
            Sign in
          </a>
        </footer>
      </div>
    </div>
  );
}

function PackingChecklist() {
  return (
    <ul className={s.checklist} aria-label="Packing checklist">
      {["Passport", "Film camera", "Rain shell"].map((item, index) => (
        <li key={item}>
          <span
            className={s.checkbox}
            data-checked={index === 0}
            aria-hidden="true"
          >
            {index === 0 && <Check size={13} strokeWidth={1.5} />}
          </span>
          <span>
            {item}
            <span className={s.srOnly}>
              {index === 0 ? ", packed" : ", still to pack"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
