import { startOfDay, startOfWeek, subDays } from "date-fns";

// The wall is ordered by time, so time is its structure: Pinned, then Today, Yesterday,
// This week, then one section per calendar month. All boundaries are in the local
// timezone, as formatNoteTime already uses for card timestamps.

export const WEEK_STARTS_ON = 1; // Monday
export const PINNED_ROWS = 2;
export const BATCH = 48;

export type SectionKind = "pinned" | "today" | "yesterday" | "week" | "month";
export type MonthKey = `${number}-${string}`;

type Dated = { updatedAt: Date | string | number; isPinned?: boolean };

export interface Section<T> {
  key: string;
  kind: SectionKind;
  /** The first moment the section covers; for Pinned, the newest pinned edit. */
  start: Date;
  /** Distinct months of the section's notes, newest first. Empty for Pinned. */
  months: MonthKey[];
  notes: T[];
}

export function monthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function time(value: Dated["updatedAt"]) {
  return new Date(value).getTime();
}

/**
 * Groups notes for the wall. Pinned notes keep their input order (the store orders them by
 * pin time); every dated section runs newest edit first, so a left-to-right reader sees the
 * same order the wall sorts by. With `pinFirst: false` pinned notes are dated like the rest.
 */
export function groupByTime<T extends Dated>(
  notes: readonly T[],
  { now = new Date(), pinFirst = true }: { now?: Date; pinFirst?: boolean } = {},
): Section<T>[] {
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const week = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
  const pinned: T[] = [];
  const dated: T[] = [];
  for (const note of notes) (pinFirst && note.isPinned ? pinned : dated).push(note);
  dated.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));

  const sections: Section<T>[] = [];
  if (pinned.length)
    sections.push({
      key: "pinned",
      kind: "pinned",
      start: new Date(Math.max(...pinned.map(note => time(note.updatedAt)))),
      months: [],
      notes: pinned,
    });
  let current: Section<T> | undefined;
  for (const note of dated) {
    const date = new Date(note.updatedAt);
    const month = monthKey(date);
    // A clock ahead of this device still reads as today rather than as a future month.
    const [kind, key, start]: [SectionKind, string, Date] =
      date >= today ? ["today", "today", today]
        : date >= yesterday ? ["yesterday", "yesterday", yesterday]
          : date >= week ? ["week", "week", week]
            : ["month", month, new Date(date.getFullYear(), date.getMonth(), 1)];
    if (current?.key !== key) {
      current = { key, kind, start, months: [], notes: [] };
      sections.push(current);
    }
    current.notes.push(note);
    if (current.months.at(-1) !== month) current.months.push(month);
  }
  return sections;
}

/** Distinct months across the dated sections, newest first. */
export function sectionMonths(sections: readonly Section<unknown>[]): MonthKey[] {
  const months: MonthKey[] = [];
  for (const section of sections)
    for (const month of section.months) if (!months.includes(month)) months.push(month);
  return months;
}

/** The first section holding notes from `month`; Today and This week can hold two months. */
export function sectionForMonth<T>(sections: readonly Section<T>[], month: MonthKey) {
  return sections.find(section => section.months.includes(month));
}

/** The month a section stands for on the time rail: its newest. */
export function sectionMonth(section: Section<unknown> | undefined): MonthKey | undefined {
  return section?.months[0];
}

/**
 * Infinite loading counts dated notes only; Pinned is always present. Returns the sections
 * with notes beyond `limit` cut off, dropping sections that have none loaded yet.
 */
export function loadedSections<T>(sections: readonly Section<T>[], limit: number) {
  const loaded: Section<T>[] = [];
  let left = limit;
  for (const section of sections) {
    if (section.kind === "pinned") { loaded.push(section); continue; }
    if (left <= 0) break;
    loaded.push(section.notes.length <= left ? section : { ...section, notes: section.notes.slice(0, left) });
    left -= section.notes.length;
  }
  return loaded;
}

export function datedCount(sections: readonly Section<unknown>[]) {
  return sections.reduce((sum, section) => sum + (section.kind === "pinned" ? 0 : section.notes.length), 0);
}

/** The smallest batch-aligned limit that loads the first full screen of `key`'s section. */
export function limitToReach(sections: readonly Section<unknown>[], key: string, limit: number) {
  let before = 0;
  for (const section of sections) {
    if (section.key === key) {
      const needed = before + Math.min(section.notes.length, BATCH);
      return Math.max(limit, Math.ceil(needed / BATCH) * BATCH);
    }
    if (section.kind !== "pinned") before += section.notes.length;
  }
  return limit;
}

/** How many pinned cards show while folded to PINNED_ROWS rows of `columns`. */
export function foldedCount(total: number, columns: number, rows = PINNED_ROWS) {
  return Math.min(total, Math.max(1, columns) * rows);
}

export type CardSize = "short" | "medium" | "long";

/** Three fixed card heights keep rows even and predictable; length picks the step. */
export function cardSize(titleLength: number, textLength: number): CardSize {
  if (textLength > 210) return "long";
  if (textLength < 110 && titleLength < 56) return "short";
  return "medium";
}
