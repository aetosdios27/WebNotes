"use client";
import { useEffect, useRef, type RefObject } from "react";
import { sectionMonth, type MonthKey, type Section } from "@/lib/time-sections";
import {
  computeLayout, rebaseOrigin, restGeometry, tickLength, DWELL_MS, LERP, MONTH_HEIGHT,
  type Layout, type RailYear, type Viewport,
} from "@/lib/time-rail";

const monthName = (month: number) => new Date(2000, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
const plural = (count: number) => count ? `${count.toLocaleString()} ${count === 1 ? "note" : "notes"}` : "No notes";

type Rail = {
  pointer: number | null;
  keyboard: number | null;
  origin: number;
  expanded: number | null;
  anchor: number;
  hoverYear: number;
  hoverMonth: number;
  since: number;
  active: number;
  view: Viewport;
  rows: { top: number; height: number }[];
  readout: number | null;
  first: boolean;
  months: HTMLElement[];
};

function scrollParent(element: HTMLElement | null) {
  for (let node = element?.parentElement; node; node = node.parentElement)
    if (/auto|scroll/.test(getComputedStyle(node).overflowY)) return node;
  return null;
}

export default function TimeRail({ years, sections, body, jump }: {
  years: RailYear[];
  sections: Section<unknown>[];
  body: RefObject<HTMLDivElement | null>;
  jump: (key: MonthKey | null) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLDivElement[]>([]);
  const readoutRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef(jump);
  useEffect(() => { jumpRef.current = jump; }, [jump]);

  useEffect(() => {
    const el = track.current, readout = readoutRef.current, scroller = scrollParent(body.current);
    if (!el || !readout || !scroller || !years.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const rows = years.length;
    const rail: Rail = {
      pointer: null, keyboard: null, origin: 0, expanded: null, anchor: 0, hoverYear: -1, hoverMonth: -1,
      since: 0, active: 0, view: { top: 0, height: 0 }, rows: years.map(() => ({ top: 0, height: 0 })),
      readout: null, first: true, months: [],
    };

    const measure = () => {
      const scroll = scroller.getBoundingClientRect();
      const own = el.parentElement!.getBoundingClientRect();
      const end = body.current?.getBoundingClientRect().bottom ?? scroll.bottom;
      const top = Math.max(0, scroll.top - own.top);
      const height = Math.max(0, Math.min(scroll.bottom, end) - own.top);
      el.style.height = `${height}px`;
      rail.view = { top, height: height - top };
      const line = scroll.top + 48;
      const current = Array.from(body.current?.querySelectorAll<HTMLElement>("[data-section]") ?? []).find(node => node.getBoundingClientRect().bottom > line);
      const month = sectionMonth(sections.find(section => section.key === current?.dataset.section));
      const index = years.findIndex(year => year.year === (month ? Number(month.slice(0, 4)) : years[0].year));
      rail.active = Math.max(0, index);
    };

    const collapse = () => {
      rail.expanded = null;
      rail.hoverMonth = -1;
      for (const node of rail.months) {
        node.classList.add("out");
        setTimeout(() => node.remove(), 130);
      }
      rail.months = [];
    };
    const expand = (row: number, top: number) => {
      rail.expanded = row;
      rail.anchor = top;
      rail.hoverMonth = -1;
      rail.months = years[row].months.map((month, i) => {
        const node = document.createElement("div");
        node.className = "tm";
        node.style.setProperty("--i", String(i));
        node.innerHTML = `<span class="in"><span class="lb">${monthName(month.month)}</span><span class="tk"></span></span>`;
        el.appendChild(node);
        return node;
      });
    };

    const layout = (): Layout => {
      const pointer = rail.keyboard != null
        ? restGeometry(rows, rail.view).restTop + (rail.keyboard + 0.5) * restGeometry(rows, rail.view).base
        : rail.pointer;
      return computeLayout({
        rows, view: rail.view, pointer, origin: rail.keyboard != null ? 0 : rail.origin,
        expanded: rail.expanded, expandedMonths: rail.expanded == null ? 0 : years[rail.expanded].months.length, anchor: rail.anchor,
      });
    };

    let frame = 0;
    const tick = (now: number) => {
      let target = layout();
      if (rail.pointer != null && rail.keyboard == null) {
        if (rail.expanded != null) {
          const top = target.tops[rail.expanded], monthsTop = top + target.heights[rail.expanded];
          const direction = rail.pointer < top - 1 ? "up" : rail.pointer > monthsTop + target.monthsHeight ? "down" : null;
          if (direction) {
            const row = rail.expanded;
            collapse();
            rail.origin = rebaseOrigin(rail.pointer, target.restTop, target.base, row, direction);
            rail.hoverYear = -1;
            target = layout();
          } else {
            rail.hoverMonth = rail.pointer < monthsTop ? -1 : Math.min(years[rail.expanded].months.length - 1, Math.floor((rail.pointer - monthsTop - 4) / MONTH_HEIGHT));
          }
        }
        if (rail.expanded == null) {
          const row = Math.floor(target.focus!);
          if (row !== rail.hoverYear) { rail.hoverYear = row; rail.since = now; }
          else if (now - rail.since > DWELL_MS) { expand(row, target.tops[row]); target = layout(); }
        }
      }

      const awake = rail.pointer != null || rail.keyboard != null;
      el.classList.toggle("awake", awake);
      const step = rail.first || reduced.matches ? 1 : LERP;
      rail.first = false;
      for (let i = 0; i < rows; i++) {
        const row = rail.rows[i];
        row.top += (target.tops[i] - row.top) * step;
        row.height += (target.heights[i] - row.height) * step;
        const node = rowRefs.current[i];
        const year = years[i].year;
        const pinned = i === 0 || i === rows - 1 || i === rail.active || (rows > 12 && Math.floor(year / 10) !== Math.floor(years[i - 1].year / 10));
        node.style.transform = `translateY(${row.top + row.height / 2}px)`;
        (node.firstChild as HTMLElement).style.opacity = String(pinned ? 1 : Math.max(0, Math.min(1, (row.height - 11) / 7)));
        node.classList.toggle("hot", awake && i === rail.hoverYear && rail.hoverMonth < 0);
        node.classList.toggle("act", i === rail.active);
      }
      if (rail.expanded != null) {
        const row = rail.rows[rail.expanded], monthsTop = row.top + row.height + 4;
        rail.months.forEach((node, i) => {
          node.style.transform = `translateY(${monthsTop + i * MONTH_HEIGHT + MONTH_HEIGHT / 2}px)`;
          node.classList.toggle("hot", i === rail.hoverMonth);
        });
      }
      if (awake && rail.hoverYear >= 0) {
        const year = years[rail.hoverYear], month = rail.hoverMonth >= 0 ? year.months[rail.hoverMonth] : null;
        const row = rail.rows[rail.hoverYear];
        const y = month ? row.top + row.height + 4 + rail.hoverMonth * MONTH_HEIGHT + MONTH_HEIGHT / 2 : row.top + row.height / 2;
        rail.readout = rail.readout == null || reduced.matches ? y : rail.readout + (y - rail.readout) * 0.3;
        readout.style.transform = `translateY(${rail.readout - 12}px)`;
        readout.innerHTML = `<b>${month ? `${monthName(month.month)} ` : ""}${year.year}</b><span>${plural(month ? month.count : year.count)}</span>`;
      } else rail.readout = null;
      frame = requestAnimationFrame(tick);
    };

    const toRail = (event: PointerEvent) => event.clientY - el.getBoundingClientRect().top;
    const onMove = (event: PointerEvent) => { rail.keyboard = null; rail.pointer = toRail(event); };
    const onLeave = () => { rail.pointer = null; rail.origin = 0; rail.hoverYear = -1; collapse(); };
    const target = () => {
      const year = years[rail.hoverYear];
      return year && (rail.hoverMonth >= 0 ? year.months[rail.hoverMonth] : year.months[0]).key;
    };
    const onClick = () => {
      const key = target();
      if (!key) return;
      rail.active = rail.hoverYear;
      jumpRef.current(key);
    };
    const onKey = (event: KeyboardEvent) => {
      const delta = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (delta) {
        event.preventDefault();
        rail.pointer = null;
        if (rail.expanded != null) {
          const next = rail.hoverMonth + delta;
          if (next >= -1 && next < years[rail.expanded].months.length) { rail.hoverMonth = next; return; }
          collapse();
        }
        const from = rail.keyboard ?? rail.active;
        rail.keyboard = rail.keyboard == null ? from : Math.max(0, Math.min(rows - 1, from + delta));
        rail.hoverYear = rail.keyboard;
      } else if (event.key === "Enter" && rail.keyboard != null) {
        event.preventDefault();
        if (rail.expanded == null) expand(rail.keyboard, layout().tops[rail.keyboard]);
        else onClick();
      } else if (event.key === "Escape" && rail.expanded != null) {
        collapse();
      }
    };
    const onBlur = () => { rail.keyboard = null; rail.hoverYear = -1; collapse(); };

    let scheduled = 0;
    const schedule = () => { scheduled ||= requestAnimationFrame(() => { scheduled = 0; measure(); }); };
    const resize = new ResizeObserver(schedule);
    resize.observe(scroller);
    if (body.current) resize.observe(body.current);
    scroller.addEventListener("scroll", schedule, { passive: true });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKey);
    el.addEventListener("blur", onBlur);
    measure();
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scheduled);
      resize.disconnect();
      scroller.removeEventListener("scroll", schedule);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("blur", onBlur);
      for (const node of rail.months) node.remove();
    };
  }, [years, sections, body]);

  if (!years.length) return null;
  const max = Math.max(...years.map(year => year.count));
  return (
    <nav className="time-rail" aria-label="Jump through time">
      <div ref={track} className="trail" tabIndex={0} aria-describedby="time-rail-help">
        {years.map((year, i) => (
          <div key={year.year} ref={node => { if (node) rowRefs.current[i] = node; }} className={`ty${year.year % 10 === 0 ? " dec" : ""}`}>
            <span className="lb">{year.year}</span>
            <span className="tk" style={{ width: tickLength(year.count, max) }} />
          </div>
        ))}
        <div ref={readoutRef} className="tread" aria-hidden="true" />
      </div>
      <span id="time-rail-help" hidden>Use the up and down arrows to choose a year, Enter to open its months or jump, Escape to close.</span>
    </nav>
  );
}
