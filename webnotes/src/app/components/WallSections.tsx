"use client";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Clock, Pin, Plus } from "lucide-react";
import type { Folder, Note } from "@/lib/storage/types";
import {
  BATCH, cardSize, datedCount, foldedCount, groupByTime, limitToReach, loadedSections,
  sectionForMonth, type MonthKey, type Section,
} from "@/lib/time-sections";
import { buildRailYears } from "@/lib/time-rail";
import NoteActionsMenu, { type NoteMenuActions } from "./NoteActionsMenu";
import TimeRail from "./TimeRail";
import { NoteMeta, NoteMiniature, noteText } from "./NoteSummary";
import { RollingText } from "./ui/rolling-text";

type CardProps = {
  note: Note;
  folders: Folder[];
  reading: boolean;
  actions: NoteMenuActions;
  openNote: (id: string) => void;
};

const NoteCard = memo(function NoteCard({ note, folders, reading, actions, openNote }: CardProps) {
  const size = useMemo(() => cardSize(note.title?.length ?? 0, noteText(note.content).length), [note.title, note.content]);
  return (
    <li className="note-cell" data-size={size}>
      <NoteActionsMenu
        context
        note={note}
        folders={folders}
        reading={reading}
        actions={actions}
        trigger={
          <button className="note-card" onClick={() => openNote(note.id)}>
            {note.isPinned && <Pin className="pin-mark" aria-label="Pinned" />}
            <strong>{note.title || "Untitled"}</strong>
            <NoteMiniature content={note.content} />
            <footer>
              <NoteMeta note={note} folders={folders} />
            </footer>
          </button>
        }
      />
    </li>
  );
});

let savedPage = { filter: "", limit: BATCH };

const sectionId = (key: string) => `wall-section-${key}`;

function sectionLabel(section: Section<Note>) {
  switch (section.kind) {
    case "pinned": return "Pinned";
    case "today": return "Today";
    case "yesterday": return "Yesterday";
    case "week": return "This week";
    case "month": return section.start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
}

/** The local date, refreshed at midnight so Today never goes stale on an open wall. */
function useToday() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setNow(new Date()), +midnight - Date.now() + 1000);
    return () => clearTimeout(timer);
  }, [now]);
  return now;
}

function scrollParent(element: HTMLElement | null) {
  for (let node = element?.parentElement; node; node = node.parentElement)
    if (/auto|scroll/.test(getComputedStyle(node).overflowY)) return node;
  return document.scrollingElement as HTMLElement | null;
}

function scrollToSection(body: HTMLElement | null, key: string | null) {
  const scroller = scrollParent(body);
  if (!scroller) return;
  const target = key && document.getElementById(sectionId(key));
  const top = target ? scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8 : 0;
  scroller.scrollTo({ top, behavior: "instant" });
}

const Outline = () => <li className="empty-outline" aria-hidden="true"><i /><i /><i /><i /></li>;

/** An empty wall is the wall's own layout: the first slot starts a note, the rest show where notes will go. */
function EmptyWall({ filter, folders, createNote }: { filter: string; folders: Folder[]; createNote: () => void }) {
  const pinned = filter === "pinned";
  const folder = folders.find(f => f.id === filter);
  return (
    <div className="wall-body wall-empty">
      <section className="wall-section" aria-labelledby="empty-wall-heading">
        <h2 className="section-heading" id="empty-wall-heading">
          {pinned ? <Pin aria-hidden="true" /> : <Clock aria-hidden="true" />}
          <span className="section-label">{pinned ? "Pinned" : "Today"}</span>
          <span className="section-count">0</span>
        </h2>
        {pinned && <p className="empty-note">Pin a note from its menu to keep it at the top of every wall.</p>}
        <ol className="note-grid empty-row">
          {!pinned && (
            <li className="note-cell">
              <button type="button" className="first-note" onClick={createNote}>
                <span className="first-note-plus"><Plus aria-hidden="true" /></span>
                <span className="first-note-copy">
                  <strong>{folder ? `New note in ${folder.name}` : "New note"}</strong>
                  <span>{folder ? "A note you start here is filed in this folder." : "Notes you write show up here, newest first."}</span>
                </span>
              </button>
            </li>
          )}
          <Outline /><Outline /><Outline /><Outline /><Outline />
        </ol>
        {!pinned && <ol className="note-grid empty-row empty-row-far" aria-hidden="true"><Outline /><Outline /><Outline /><Outline /><Outline /><Outline /></ol>}
      </section>
    </div>
  );
}

export default function WallSections({ notes, filter, folders, menuActions, activeNoteId, isReadingMode, openNote, createNote }: {
  /** Notes already filtered and ordered like the store: pinned first, then newest edit. */
  notes: Note[];
  filter: string;
  folders: Folder[];
  menuActions: NoteMenuActions;
  activeNoteId: string | null;
  isReadingMode: boolean;
  openNote: (id: string) => void;
  createNote: () => void;
}) {
  const now = useToday();
  const sections = useMemo(() => groupByTime(notes, { now, pinFirst: filter !== "pinned" }), [notes, now, filter]);
  const [limit, setLimit] = useState(() => savedPage.filter === filter ? savedPage.limit : BATCH);
  useEffect(() => { savedPage = { filter, limit }; }, [filter, limit]);
  const loaded = useMemo(() => loadedSections(sections, limit), [sections, limit]);
  const total = datedCount(sections);
  const years = useMemo(() => buildRailYears(sections), [sections]);
  const body = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Pinned folds to whole rows, so the count follows the grid's live column count.
  const [columns, setColumns] = useState(1);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  useLayoutEffect(() => {
    const element = body.current;
    if (!element) return;
    const measure = () => {
      const grid = element.querySelector(".note-grid");
      if (grid) setColumns(getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [sections.length]);

  useEffect(() => {
    if (!sentinel.current) return;
    const observer = new IntersectionObserver(
      entries => { if (entries.some(entry => entry.isIntersecting)) setLimit(limit => limit + BATCH); },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [limit, total]);

  // Jumping to a month that has not loaded yet loads up to it, then scrolls once it renders.
  const pendingJump = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (pendingJump.current === null) return;
    scrollToSection(body.current, pendingJump.current);
    pendingJump.current = null;
  }, [loaded]);
  const jump = useCallback((month: MonthKey | null) => {
    const section = month && sectionForMonth(sections, month);
    if (!section) { scrollToSection(body.current, null); return; }
    const needed = limitToReach(sections, section.key, limit);
    if (needed > limit) { pendingJump.current = section.key; setLimit(needed); }
    else scrollToSection(body.current, section.key);
  }, [sections, limit]);

  if (!notes.length) return <EmptyWall filter={filter} folders={folders} createNote={createNote} />;

  return (
    <div ref={body} className="wall-body" data-rail={years.length > 0 || undefined}>
      <div className="wall-sections">
        {loaded.map(section => {
          const label = sectionLabel(section);
          const full = sections.find(s => s.key === section.key)!.notes.length;
          const folded = section.kind === "pinned" && !pinnedOpen ? foldedCount(full, columns) : full;
          const date = section.kind === "today" || section.kind === "yesterday"
            ? section.start.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
            : null;
          return (
            <section key={section.key} id={sectionId(section.key)} data-section={section.key} className="wall-section" aria-labelledby={`${sectionId(section.key)}-heading`}>
              <h2 className="section-heading" id={`${sectionId(section.key)}-heading`}>
                {section.kind === "pinned" && <Pin aria-hidden="true" />}
                <span className="section-label">{label}</span>
                <span className="section-count" aria-label={`${full} ${full === 1 ? "note" : "notes"}`}>
                  <RollingText value={full} />
                </span>
                {date && <span className="section-date">{date}</span>}
              </h2>
              <ol className="note-grid" aria-label={`${label}, newest first`}>
                {section.notes.slice(0, folded).map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    folders={folders}
                    reading={activeNoteId === note.id && isReadingMode}
                    actions={menuActions}
                    openNote={openNote}
                  />
                ))}
              </ol>
              {section.kind === "pinned" && foldedCount(full, columns) < full && (
                <button className="section-toggle" aria-expanded={pinnedOpen} onClick={() => setPinnedOpen(open => !open)}>
                  {pinnedOpen ? "Show fewer" : `Show all ${full}`}
                </button>
              )}
            </section>
          );
        })}
        {datedCount(loaded) < total && (
          <div ref={sentinel} className="load-notes">
            <button onClick={() => setLimit(limit + BATCH)}>Load more notes</button>
          </div>
        )}
      </div>
      {years.length > 0 && <TimeRail years={years} sections={sections} body={body} jump={jump} />}
    </div>
  );
}
