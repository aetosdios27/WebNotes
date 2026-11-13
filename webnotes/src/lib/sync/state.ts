import * as Y from "yjs";

export function mergeState(
  snapshot: Uint8Array | null,
  updates: readonly Uint8Array[]
): Uint8Array {
  // The binary API preserves updates whose dependencies have not arrived yet.
  return Y.mergeUpdates(snapshot ? [snapshot, ...updates] : [...updates]);
}

export function encodeDiff(
  state: Uint8Array,
  clientStateVector: Uint8Array
): Uint8Array {
  return Y.diffUpdate(state, clientStateVector);
}
