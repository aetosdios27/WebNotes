import * as Y from "yjs";

export function mergeState(
  snapshot: Uint8Array | null,
  updates: readonly Uint8Array[]
): Uint8Array {
  // Y.mergeUpdates keeps deleted content forever; a GC-enabled doc drops it.
  // Updates whose dependencies have not arrived stay pending and are still encoded.
  const doc = new Y.Doc();
  try {
    if (snapshot) Y.applyUpdate(doc, snapshot);
    for (const update of updates) Y.applyUpdate(doc, update);
    return Y.encodeStateAsUpdate(doc);
  } finally {
    doc.destroy();
  }
}

export function encodeDiff(
  state: Uint8Array,
  clientStateVector: Uint8Array
): Uint8Array {
  return Y.diffUpdate(state, clientStateVector);
}
