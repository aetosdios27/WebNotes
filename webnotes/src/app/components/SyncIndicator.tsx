"use client";
import { Check, CloudOff, CloudUpload, HardDrive } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
export default function SyncIndicator({
  online,
  saving,
  failed,
  cloud,
}: {
  online: boolean;
  saving: boolean;
  failed: boolean;
  cloud: boolean;
}) {
  const label = !online
    ? "Offline"
    : failed
      ? "Sync paused"
      : saving
        ? "Saving"
        : cloud
          ? "Synced"
          : "On device";
  const description = !online
    ? "You’re offline. Device notes stay here; cloud sync resumes when you reconnect."
    : failed
      ? "Sync hasn’t finished. Your device copy is still here. We’ll keep trying."
      : saving
        ? "Saving changes. Keep writing while WebNotes catches up."
        : cloud
          ? "Your latest changes are synced."
          : "Notes are stored on this device. Sign in to sync across devices.";
  const Icon =
    !online || failed
      ? CloudOff
      : saving
        ? CloudUpload
        : cloud
          ? Check
          : HardDrive;
  return (
    <Tooltip>
      <TooltipTrigger className="save-state" aria-label={description}>
        <Icon aria-hidden="true" strokeWidth={1.5} />
        <span className="sync-label">{label}</span>
      </TooltipTrigger>
      <TooltipContent role="tooltip" className="max-w-64">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
