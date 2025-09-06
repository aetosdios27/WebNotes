// src/app/components/NoteListSkeleton.tsx

'use client';

import { Skeleton } from '@/app/components/ui/skeleton';

export function NoteListSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Mimic the header and toolbar */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="flex justify-around mb-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      {/* Create 5 placeholder note items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col space-y-2">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
      ))}
    </div>
  );
}