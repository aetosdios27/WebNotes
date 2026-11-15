"use client";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Section } from "@/lib/time-sections";
import type { MonthKey } from "@/lib/time-sections";
import type { RailYear, RailMonth } from "@/lib/time-rail";
import {
  PEAK, SIGMA, MONTH_HEIGHT, DWELL_MS, LERP, restBase, computeLayout, rebaseOrigin,
} from "@/lib/time-rail";
import { sectionForMonth, sectionMonth } from "@/lib/time-sections";

function scrollParent(element: HTMLElement | null) {
  for (let node = element?.parentElement; node; node = node.parentElement)
    if (/auto|scroll/.test(getComputedStyle(node).overflowY)) return node;
  return document.scrollingElement as HTMLElement | null;
}

export default function TimeRail({
  years,
  sections,
  body,
  jump,
}: {
  years: RailYear[];
  sections: Section<unknown>[];
  body: RefObject<HTMLDivElement | null>;
  jump: (key: MonthKey | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = containerRef.current;
    if (!el || years.length === 0) return;

    const N = years.length;
    const TR: any = {
      el, years, N, py: null as number | null, exp: null as number | null,
      origin: 0, hoverYear: -1, hoverMonth: -1, since: 0,
      active: 0, monthNodes: [] as HTMLElement[], nodes: [] as HTMLElement[],
      anchor: 0, first: true, ry: null as number | null, reduced: reduced.current,
    };

    // build nodes
    TR.nodes = years.map((y, i) => {
      const d = document.createElement("div");
      d.className = "ty" + (y.year % 10 === 0 ? " dec" : "");
      d.innerHTML = `<span class="lb">${y.year}</span><span class="tk"></span>`;
      el.appendChild(d);
      return d;
    });
    TR.read = document.createElement("div");
    TR.read.className = "tread";
    el.appendChild(TR.read);

    TR.cur = years.map(() => ({ t: 0, h: 0 }));

    const maxCount = Math.max(...years.map(y => y.count)) || 1;
    TR.nodes.forEach((n: HTMLElement, i: number) => {
      const y = years[i];
      const len = y.count ? 4 + Math.round(12 * Math.sqrt(y.count / maxCount)) : 2;
      const tk = n.querySelector(".tk") as HTMLElement;
      if (tk) tk.style.width = len + "px";
    });

    const collapse = () => {
      TR.exp = null;
      TR.monthNodes.forEach((n: HTMLElement) => { n.classList.add("out"); setTimeout(() => n.remove(), 130); });
      TR.monthNodes = [];
      TR.hoverMonth = -1;
    };
    const expand = (i: number, labelTop: number) => {
      TR.exp = i;
      TR.anchor = labelTop;
      TR.hoverMonth = -1;
      const y = years[i];
      TR.monthNodes = y.months.map((m: RailMonth, k: number) => {
        const d = document.createElement("div");
        d.className = "tm" + (m.count ? " has" : "");
        if (!reduced.current) d.style.animationDelay = `${k * 16}ms`;
        d.innerHTML = `<span class="in"><span class="lb">${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m.month - 1]}</span><span class="tk"></span></span>`;
        el.appendChild(d);
        return d;
      });
    };

    // active year from scroll
    const measureActive = () => {
      const scroller = scrollParent(body.current);
      if (!scroller || !body.current) return;
      const top = scroller.getBoundingClientRect().top + 48;
      const elements = body.current.querySelectorAll<HTMLElement>("[data-section]");
      const current = Array.from(elements).find((e) => e.getBoundingClientRect().bottom > top);
      const m = sectionMonth(sections.find((s) => s.key === current?.dataset.section));
      const activeYear = m ? Number(m.slice(0, 4)) : years[0]?.year;
      const idx = years.findIndex((y) => y.year === activeYear);
      TR.active = idx >= 0 ? idx : 0;
    };

    const layout = () => {
      const H = el.clientHeight;
      const base = restBase(N, H);
      const restTop = (H - base * N) / 2;
      const py = TR.py;
      const expandedIndex = TR.exp;
      const monthCount = expandedIndex != null ? years[expandedIndex].months.length : 0;
      const L = computeLayout({ N, H, py, origin: TR.origin, expandedIndex, expandedMonthCount: monthCount, anchor: TR.anchor });
      return { ...L, base, restTop };
    };

    const onPointerMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      TR.py = e.clientY - r.top;
    };
    const onPointerLeave = () => {
      TR.py = null;
      collapse();
      TR.origin = 0;
      TR.hoverYear = -1;
    };
    const onClick = () => {
      if (TR.hoverYear < 0) return;
      TR.active = TR.hoverYear;
      const y = years[TR.hoverYear];
      const m = TR.hoverMonth >= 0 ? y.months[TR.hoverMonth] : null;
      const key = m ? m.key : y.months[0]?.key ?? null;
      if (key) jump(key);
    };
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("click", onClick);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        TR.hoverYear = Math.min(N - 1, Math.max(0, TR.hoverYear + (TR.hoverYear < 0 ? 0 : dir) + (TR.hoverYear < 0 ? 1 : 0)));
        // set py to hovered row center approximated via layout target? keep origin
      }
      if (e.key === "Enter") {
        if (TR.exp != null) {
          const y = years[TR.exp];
          jump(y.months[TR.hoverMonth >= 0 ? TR.hoverMonth : 0]?.key ?? y.months[0].key);
        } else if (TR.hoverYear >= 0) {
          expand(TR.hoverYear, 0);
        }
      }
      if (e.key === "Escape") collapse();
    };
    el.addEventListener("keydown", onKeyDown);
    el.tabIndex = 0;

    const tick = (now: number) => {
      if (!el.isConnected) return;
      const L = layout();
      if (TR.py != null) {
        if (TR.exp != null) {
          const t = L.top[TR.exp];
          const mTop = t + L.h[TR.exp];
          const out = TR.py < t - 1 ? -0.02 : TR.py > mTop + L.extra ? 1.02 : null;
          if (out != null) {
            const e2 = TR.exp;
            collapse();
            TR.origin = rebaseOrigin(TR.py, L.restTop, e2, out, L.base);
            TR.hoverYear = -1;
            TR.raf = requestAnimationFrame(tick);
            return;
          }
          TR.hoverMonth = TR.py < mTop ? -1 : Math.min(years[TR.exp].months.length - 1, Math.floor((TR.py - mTop - 4) / MONTH_HEIGHT));
        }
        if (TR.exp == null) {
          const k = Math.floor(L.u!);
          if (k !== TR.hoverYear) { TR.hoverYear = k; TR.since = now; }
          else if (now - TR.since > DWELL_MS) expand(k, L.top[k]);
        }
      }
      measureActive();
      const awake = TR.py != null;
      el.classList.toggle("awake", awake);
      const lerp = reduced.current ? 1 : (TR.first ? 1 : LERP);
      TR.first = false;
      for (let i = 0; i < N; i++) {
        const c = TR.cur[i];
        c.t += (L.top[i] - c.t) * lerp;
        c.h += (L.h[i] - c.h) * lerp;
        const n = TR.nodes[i];
        const y = years[i].year;
        const always = i === 0 || i === N - 1 || i === TR.active || (N > 12 && (i > 0 && Math.floor(y / 10) !== Math.floor(years[i - 1].year / 10)));
        const show = Math.max(always ? 1 : 0, Math.min(1, (c.h - 11) / 7));
        n.style.transform = `translateY(${c.t + c.h / 2}px)`;
        const lb = n.querySelector(".lb") as HTMLElement;
        if (lb) lb.style.opacity = show.toFixed(3);
        n.classList.toggle("hot", awake && i === TR.hoverYear && TR.hoverMonth < 0);
        n.classList.toggle("act", i === TR.active);
      }
      if (TR.exp != null) {
        const c = TR.cur[TR.exp];
        const mTop = c.t + c.h + 4;
        TR.monthNodes.forEach((n: HTMLElement, k: number) => {
          n.style.transform = `translateY(${mTop + k * MONTH_HEIGHT + MONTH_HEIGHT / 2}px)`;
          n.classList.toggle("hot", k === TR.hoverMonth);
        });
      }
      if (awake && TR.hoverYear >= 0) {
        const y = years[TR.hoverYear];
        const m = TR.hoverMonth >= 0 ? y.months[TR.hoverMonth] : null;
        const c = TR.cur[TR.hoverYear];
        const ry = m ? c.t + c.h + 4 + TR.hoverMonth * MONTH_HEIGHT + MONTH_HEIGHT / 2 : c.t + c.h / 2;
        TR.ry = TR.ry == null ? ry : TR.ry + (ry - TR.ry) * 0.3;
        TR.read.style.transform = `translateY(${TR.ry - 12}px)`;
        const n = m ? m.count : y.count;
        TR.read.innerHTML = `<b>${m ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m.month - 1] + " " : ""}${y.year}</b><span class="num">${n ? n.toLocaleString() + (n === 1 ? " note" : " notes") : "No notes"}</span>`;
      } else TR.ry = null;
      TR.raf = requestAnimationFrame(tick);
    };
    TR.raf = requestAnimationFrame(tick);

    const scroller = scrollParent(body.current);
    const onScroll = () => { /* active measured in tick */ };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(TR.raf);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKeyDown);
      scroller?.removeEventListener("scroll", onScroll);
      // cleanup nodes
      while (el.firstChild) el.removeChild(el.firstChild);
    };
  }, [years, sections, body, jump]);

  if (years.length === 0) return null;
  return (
    <div ref={containerRef} className="trail time-rail" role="navigation" aria-label="Jump through time" tabIndex={0} />
  );
}
