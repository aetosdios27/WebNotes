import { z } from "zod";
import { NOTE_FONT_IDS } from "./note-fonts";

export const MAX_CONTENT_LENGTH = 2 * 1024 * 1024;
export const idInput = z.string().max(64);
export const titleInput = z.string().max(200);
export const folderNameInput = z
  .string()
  .trim()
  .min(1, "Folder name cannot be empty")
  .max(60, "Folder name must be 60 characters or fewer");
export const contentInput = z.string().max(MAX_CONTENT_LENGTH);
export const fontInput = z.enum(NOTE_FONT_IDS);
