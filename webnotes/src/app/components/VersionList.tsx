"use client";

import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { Clock, Loader2, Eye, CloudOff } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useNotesStore } from "@/store/useNotesStore";

interface VersionListProps {
  noteId: string;
  onPreview: (versionId: string) => void;
}

export function VersionList({ noteId, onPreview }: VersionListProps) {
  const { isOnline } = useNotesStore();

  const {
    data: versions,
    isLoading,
    isError,
    refetch,
  } = trpc.versions.list.useQuery(
    { noteId },
    {
      retry: 1, // Retry once then fail
      refetchOnWindowFocus: false,
    }
  );

  const { mutate: createSnapshot, isPending: isSnapshotting } =
    trpc.versions.snapshot.useMutation({
      onSuccess: () => refetch(),
    });

  const handleSnapshot = () => {
    createSnapshot({ noteId });
  };

  // 1. Offline State
  if (!isOnline) {
    return (
      <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
        <CloudOff className="w-6 h-6 mb-2 opacity-50" />
        <p className="text-xs">History unavailable offline</p>
      </div>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  // 3. Error State (Note not synced yet)
  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-zinc-500 mb-2">Syncing note to cloud...</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Retry
        </Button>
      </div>
    );
  }

  // 4. Empty State
  if (!versions || versions.length === 0) {
    return (
      <div className="p-6 text-center">
        <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">No history yet.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={handleSnapshot}
          disabled={isSnapshotting}
        >
          {isSnapshotting ? (
            <Loader2 className="w-3 h-3 animate-spin mr-2" />
          ) : (
            "Save Snapshot Now"
          )}
        </Button>
      </div>
    );
  }

  // 5. List
  return (
    <div className="space-y-4">
      {/* ... rest of the list render ... */}
      <div className="px-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:text-white"
          onClick={handleSnapshot}
          disabled={isSnapshotting}
        >
          {isSnapshotting ? (
            <Loader2 className="w-3 h-3 animate-spin mr-2" />
          ) : (
            "Create Snapshot"
          )}
        </Button>
      </div>

      <div className="space-y-1">
        {versions.map((version) => (
          <button
            key={version.id}
            onClick={() => onPreview(version.id)}
            className="w-full text-left group px-3 py-3 rounded-md hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 relative"
          >
            <div className="pr-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-300">
                  {formatDistanceToNow(new Date(version.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-[10px] text-zinc-500 font-mono">
                  {version.id.slice(0, 8)}
                </p>

                {version.changeType === "manual" && (
                  <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/20 uppercase font-semibold tracking-wide leading-none">
                    Manual
                  </span>
                )}
                {version.changeType === "restore_backup" && (
                  <span className="text-[9px] bg-yellow-500/10 text-yellow-400 px-1 py-0.5 rounded border border-yellow-500/20 uppercase font-semibold tracking-wide leading-none">
                    Restore
                  </span>
                )}
              </div>
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-zinc-900 p-1.5 rounded-md border border-zinc-700 shadow-sm text-zinc-400 hover:text-white hover:border-zinc-600">
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
