"use client";

import { useEffect, useRef, useState } from "react";
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
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let stop: (() => void) | undefined;
    void import("@/lib/sync/browser-runtime").then(({ startNoteSync }) => {
      if (!active) return;
      stop = startNoteSync({
        id, doc, userId,
        onStatus: next => {
          if (!active) return;
          setStatus(next);
          onSaving.current(next.saving);
        },
      });
    }).catch(() => {
      if (active) setStatus(previous => ({ ...previous, error: "Could not start note sync" }));
    });
    return () => {
      active = false;
      onSaving.current(false);
      stop?.();
    };
  }, [id, doc, userId]);
  return { ...status, dismissError: () => setStatus(previous => ({ ...previous, error: null })) };
}
