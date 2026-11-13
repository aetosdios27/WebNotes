import * as Y from "yjs";

export const MAX_UPDATE_BYTES = 1024 * 1024;

export class UpdateInputError extends Error {
  constructor(
    public readonly code: "TOO_LARGE" | "INVALID",
    message: string
  ) {
    super(message);
  }
}

export function decodeClientUpdate(base64: string): Uint8Array<ArrayBuffer> {
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
