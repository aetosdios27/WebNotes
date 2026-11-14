"use client";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { Clock, CloudOff, CloudUpload } from "lucide-react";
import { Button } from "./ui/button";
import { useNotesStore } from "@/store/useNotesStore";
import { LoadingRegion } from "./ui/skeleton";
import { HistorySkeleton } from "./ContentSkeletons";

export function VersionList({
  noteId,
  onPreview,
}: {
  noteId: string;
  onPreview: (id: string) => void;
}) {
  const isOnline = useNotesStore((s) => s.isOnline);
  const query = trpc.versions.list.useQuery(
    { noteId },
    { retry: 1, refetchOnWindowFocus: false, enabled: isOnline },
  );
  const snapshot = trpc.versions.snapshot.useMutation({
    onSuccess: () => {
      void query.refetch();
    },
  });
  const save = () => snapshot.mutate({ noteId });
  if (!isOnline)
    return (
      <div className="quiet-state">
        <CloudOff aria-hidden="true" />
        <p>Version history needs a connection.</p>
        <small>Your device copy is still here.</small>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  return (
    <LoadingRegion
      pending={query.isLoading}
      skeleton={<HistorySkeleton />}
      label="Opening version history"
    >
      {query.isError ? (
        <div className="quiet-state">
          <CloudUpload aria-hidden="true" />
          <p>Version history couldn’t load.</p>
          <small>This doesn’t change your device copy.</small>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : !query.data?.length ? (
        <div className="quiet-state">
          <Clock aria-hidden="true" />
          <p>This note has no saved versions yet.</p>
          <Button
            variant="outline"
            onClick={save}
            disabled={snapshot.isPending}
          >
            {snapshot.isPending ? "Saving version…" : "Save a version"}
          </Button>
        </div>
      ) : (
        <div className="history-list">
          <Button
            variant="outline"
            onClick={save}
            disabled={snapshot.isPending}
          >
            {snapshot.isPending ? "Saving version…" : "Save a version"}
          </Button>
          {query.data.map((version) => (
            <button
              className="history-row"
              key={version.id}
              onClick={() => onPreview(version.id)}
            >
              <Clock size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>
                {formatDistanceToNow(new Date(version.createdAt), {
                  addSuffix: true,
                })}
                <small>
                  {version.changeType === "manual"
                    ? "Saved by you"
                    : version.changeType === "restore_backup"
                      ? "Before restore"
                      : "Automatic version"}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
      {snapshot.isError && (
        <div className="quiet-state" role="status">
          <p>The version couldn’t be saved. Your note is unchanged.</p>
          <Button variant="ghost" onClick={save}>
            Try again
          </Button>
        </div>
      )}
    </LoadingRegion>
  );
}
