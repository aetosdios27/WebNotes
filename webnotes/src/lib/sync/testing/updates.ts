import * as Y from "yjs";

export function makeUpdate(
  key: string,
  value: string,
  clientId?: number
): Uint8Array<ArrayBuffer> {
  const doc = new Y.Doc();
  try {
    if (clientId !== undefined) doc.clientID = clientId;
    doc.getMap("values").set(key, value);
    return new Uint8Array(Y.encodeStateAsUpdate(doc));
  } finally {
    doc.destroy();
  }
}

export function values(state: Uint8Array | null): Record<string, unknown> {
  const doc = new Y.Doc();
  try {
    if (state) Y.applyUpdate(doc, state);
    return doc.getMap("values").toJSON();
  } finally {
    doc.destroy();
  }
}
