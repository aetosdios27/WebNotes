import { Skeleton, LoadingRegion } from "./ui/skeleton";

export function EditorSkeleton({ bodyOnly = false }: { bodyOnly?: boolean }) {
  return (
    <div className={bodyOnly ? "paragraph-skeleton" : "editor-skeleton"}>
      {!bodyOnly && (
        <>
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-meta" />
        </>
      )}
      <Skeleton className="skeleton-line" />
      <Skeleton className="skeleton-line" />
      <Skeleton className="skeleton-line short" />
    </div>
  );
}
export function WallSkeleton() {
  return (
    <div className="note-grid">
      {[160, 210, 180, 140, 195, 170, 145, 190].map((height, i) => (
        <div className="note-card skeleton-card" style={{ height }} key={i}>
          <Skeleton className="skeleton-card-title" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
export function HistorySkeleton() {
  return (
    <div className="history-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <div className="history-skeleton-row" key={i}>
          <Skeleton className="skeleton-card-title" />
          <Skeleton className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
export function EditorLoading() {
  return (
    <LoadingRegion
      pending
      skeleton={<EditorSkeleton />}
      label="Opening note"
      className="editor-loading"
    />
  );
}
