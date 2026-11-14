"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Landing from "./Landing";

function Shell() {
  return <div role="status" aria-label="Opening WebNotes" style={{ height: "100%", background: "var(--background)" }} />;
}
const NotesApp = dynamic(() => import("../../NotesApp"), { ssr: false, loading: Shell });

export default function HomeGate() {
  const { status } = useSession();
  const [destination, setDestination] = useState<"pending" | "landing" | "app">("pending");
  useEffect(() => {
    // LocalStorageAdapter's authoritative note index. Ignore landing/mockup keys
    // and Yjs document databases, which can outlive a deleted note.
    if ("__TAURI__" in window) { setDestination("app"); return; }
    if (status === "loading") return;
    try {
      const notes: unknown = JSON.parse(localStorage.getItem("webnotes_notes_v1") ?? "[]");
      setDestination(status === "authenticated" || (Array.isArray(notes) && notes.length > 0) ? "app" : "landing");
    } catch {
      // Unreadable storage must never route existing work to a first-run screen.
      setDestination("app");
    }
  }, [status]);
  if (destination === "pending") return <Shell />;
  if (destination === "app") return <NotesApp />;
  return <Landing onStart={async () => {
    const { useNotesStore } = await import("@/store/useNotesStore");
    await useNotesStore.getState().loadData();
    await useNotesStore.getState().createNote({ title: "", content: "" });
    setDestination("app");
  }} />;
}
