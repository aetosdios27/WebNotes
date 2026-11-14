export const NOTE_FONTS = [
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
] as const;

export type NoteFont = (typeof NOTE_FONTS)[number]["id"];

export function defaultNoteFont(value: unknown): NoteFont {
  return NOTE_FONTS.find((font) => font.id === value)?.id ?? "sans";
}
