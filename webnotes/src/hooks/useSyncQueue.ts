// src/hooks/useSyncQueue.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import {
  createSyncQueue,
  enqueueCreate,
  enqueueUpdate,
  enqueueDelete,
  isQueueEmpty,
  isProcessing,
} from "@/lib/effect/sync-queue";
import { runEffect } from "@/lib/effect/runtime";
import type { Note } from "@/lib/storage/types";

interface SyncQueueState {
  queue: any;
  processing: any;
  fiber: any;
}

export function useSyncQueue() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const queueRef = useRef<SyncQueueState | null>(null);
  const initialized = useRef(false);

  // Initialize the queue
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    runEffect(createSyncQueue).then((state) => {
      queueRef.current = state;
    });

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Poll queue status
  useEffect(() => {
    if (!queueRef.current) return;

    const interval = setInterval(async () => {
      if (!queueRef.current) return;

      const empty = await runEffect(isQueueEmpty(queueRef.current));
      const processing = await runEffect(isProcessing(queueRef.current));

      setPending(empty ? 0 : 1); // Simplified, could track actual count
      setSyncing(processing);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Queue operations
  const queueCreate = async (note: Note) => {
    if (!queueRef.current) return;
    await runEffect(enqueueCreate(queueRef.current, note));
    setPending((p) => p + 1);
  };

  const queueUpdate = async (id: string, data: Partial<Note>) => {
    if (!queueRef.current) return;
    await runEffect(enqueueUpdate(queueRef.current, id, data));
    setPending((p) => p + 1);
  };

  const queueDelete = async (id: string) => {
    if (!queueRef.current) return;
    await runEffect(enqueueDelete(queueRef.current, id));
    setPending((p) => p + 1);
  };

  return {
    isOnline,
    pending,
    syncing,
    queueCreate,
    queueUpdate,
    queueDelete,
  };
}
