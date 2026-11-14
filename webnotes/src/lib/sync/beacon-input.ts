import { z } from "zod";
import { idInput } from "../input-limits";
import {
  MAX_UPDATE_BASE64_LENGTH,
  updateInput,
  UpdateInputError,
} from "./update-input";

export const beaconInput = z.object({
  id: idInput.min(1),
  update: updateInput,
});
// Allow JSON framing and escaped IDs without allowing an unbounded request body.
export const MAX_BEACON_BYTES = MAX_UPDATE_BASE64_LENGTH + 4096;

export async function readBeaconInput(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new UpdateInputError("INVALID", "Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BEACON_BYTES) {
        await reader.cancel();
        throw new UpdateInputError("TOO_LARGE", "Sync body exceeds the limit");
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    return beaconInput.parse(JSON.parse(body.toString("utf8")));
  } catch (error) {
    if (error instanceof UpdateInputError) throw error;
    throw new UpdateInputError("INVALID", "Invalid sync body");
  } finally {
    reader.releaseLock();
  }
}
