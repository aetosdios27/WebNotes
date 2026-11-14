"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import type { SyncStatus } from "@/lib/sync/engine";

export function useNoteSync(options: {
  id: string;
  doc: Y.Doc;
  userId: string | undefined;
  onSavingStatusChange: (saving: boolean) => void;
}) {
  const [status, setStatus] = useState<SyncStatus>({ saving: false, error: null, pulled: false, hasServerState: false });
  const onSaving = useRef(options.onSavingStatusChange);
  onSaving.current = options.onSavingStatusChange;
  const { id, doc, userId } = options;
  const stopRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const stopSync = useCallback(() => {
    const stop = stopRef.current;
    stopRef.current = undefined;
    return stop?.() ?? Promise.resolve();
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void import("@/lib/sync/browser-runtime").then(({ startNoteSync }) => {
      if (!active) return;
      const stop = startNoteSync({
        id, doc, userId,
        onStatus: next => {
          if (!active) return;
          setStatus(next);
          onSaving.current(next.saving);
        },
      });
      stopRef.current = stop;
    }).catch(() => {
      if (active) setStatus(previous => ({ ...previous, error: "Could not start note sync" }));
    });
    return () => {
      active = false;
      onSaving.current(false);
      void stopSync();
    };
  }, [id, doc, userId, stopSync]);
  return { ...status, stopSync, dismissError: () => setStatus(previous => ({ ...previous, error: null })) };
}
