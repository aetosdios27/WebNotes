"use client";
import Brand from "./Brand";
import { WallSkeleton } from "./ContentSkeletons";
import { Skeleton } from "./ui/skeleton";
export default function LoadingScreen() {
  return (
    <section className="notes-window home" aria-label="Opening your notes">
      <header className="window-bar">
        <Brand className="text-lg" />
        <Skeleton className="h-8 w-full" />
      </header>
      <div className="wall-tabs">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-20" />
      </div>
      <WallSkeleton />
    </section>
  );
}
