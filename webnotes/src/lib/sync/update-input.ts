import * as Y from "yjs";
import { z } from "zod";

export const MAX_UPDATE_BYTES = 1024 * 1024;

export const MAX_UPDATE_BASE64_LENGTH = 4 * Math.ceil(MAX_UPDATE_BYTES / 3);
export const updateInput = z.string().min(1).max(MAX_UPDATE_BASE64_LENGTH);

export class UpdateInputError extends Error {
  constructor(
    public readonly code: "TOO_LARGE" | "INVALID",
    message: string
  ) {
    super(message);
  }
}

export function decodeClientUpdate(base64: string): Uint8Array<ArrayBuffer> {
  if (base64.length > MAX_UPDATE_BASE64_LENGTH) {
    throw new UpdateInputError("TOO_LARGE", "Yjs update exceeds the 1 MB limit");
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength > MAX_UPDATE_BYTES) {
    throw new UpdateInputError("TOO_LARGE", "Yjs update exceeds the 1 MB limit");
  }

  try {
    Y.decodeUpdate(bytes);
  } catch (error) {
    console.error("Failed to decode incoming Yjs update:", error);
    throw new UpdateInputError("INVALID", "Invalid Yjs update");
  }
  return bytes;
}
