export const NOTE_FONTS = [
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
] as const;

export type NoteFont = (typeof NOTE_FONTS)[number]["id"];

export function defaultNoteFont(value: unknown): NoteFont {
  return NOTE_FONTS.find((font) => font.id === value)?.id ?? "sans";
}

export const FONT_CLASSES: Record<string, string> = {
  serif: "font-serif text-lg leading-relaxed",
  mono: "font-mono text-[0.95rem] leading-7",
  sans: "font-sans",
};

export const NOTE_FONT_IDS = Object.keys(FONT_CLASSES);
