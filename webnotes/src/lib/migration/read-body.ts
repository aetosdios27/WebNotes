import * as Y from "yjs";

// Read y-indexeddb's updates store without creating a cache or waiting on its
// success-only whenSynced promise. IndexedDB failures must keep metadata intact.
export async function readBody(id: string): Promise<string | null> {
  const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(`webnotes-note-${id}`);
    let missing = false;
    let blocked = false;
    request.onupgradeneeded = () => { missing = true; request.transaction?.abort(); };
    request.onerror = () => missing ? resolve(null) : reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error("IndexedDB open blocked")); };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
  });
  if (!db) return null;
  const doc = new Y.Doc();
  try {
    const updates = await new Promise<unknown[]>((resolve, reject) => {
      const transaction = db.transaction("updates", "readonly");
      const request = transaction.objectStore("updates").getAll();
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    for (const update of updates) {
      if (!(update instanceof Uint8Array)) throw new Error("Invalid cached Yjs update");
      Y.applyUpdate(doc, update);
    }
    const state = Y.encodeStateAsUpdate(doc);
    // Avoid spreading a large document onto the JS call stack.
    let binary = "";
    for (const byte of state) binary += String.fromCharCode(byte);
    return btoa(binary);
  } finally {
    doc.destroy();
    db.close();
  }
}
