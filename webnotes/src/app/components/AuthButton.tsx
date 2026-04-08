"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import {
  LogIn,
  LogOut,
  Check,
  X,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import type { SyncStatus } from "@/lib/storage/types";
import { isTauri } from "@/lib/tauri";
import { useNotesStore } from "@/store/useNotesStore";
import { open } from "@tauri-apps/plugin-shell";

interface AuthButtonProps {
  isOpen: boolean;
  syncStatus: SyncStatus;
}

export default function AuthButton({ isOpen, syncStatus }: AuthButtonProps) {
  // Web Session
  const { data: session, status } = useSession();

  // Desktop Session + Sync State
  const { user, logout, isOnline, pendingOperations } = useNotesStore();

  // Determine active user based on platform
  const activeUser = isTauri ? user : session?.user;
  const isLoading = !isTauri && status === "loading";

  // Build status config dynamically based on network + pending ops
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: "bg-yellow-500",
        tooltip: `Offline${
          pendingOperations > 0 ? ` • ${pendingOperations} pending` : ""
        }`,
        icon: <CloudOff className="w-2 h-2 text-zinc-900" />,
      };
    }

    if (pendingOperations > 0) {
      return {
        color: "bg-blue-500",
        tooltip: `Syncing ${pendingOperations} change${
          pendingOperations > 1 ? "s" : ""
        }...`,
        icon: <Loader2 className="w-2 h-2 text-zinc-900 animate-spin" />,
      };
    }

    switch (syncStatus) {
      case "synced":
        return {
          color: "bg-green-500",
          tooltip: "All changes saved",
          icon: <Check className="w-2 h-2 text-zinc-900" />,
        };
      case "syncing":
        return {
          color: "bg-blue-500",
          tooltip: "Saving...",
          icon: <Loader2 className="w-2 h-2 text-zinc-900 animate-spin" />,
        };
      case "unsynced":
        return {
          color: "bg-red-500",
          tooltip: "Changes not saved",
          icon: <X className="w-2 h-2 text-zinc-900" />,
        };
      default:
        return {
          color: "bg-zinc-500",
          tooltip: "Unknown status",
          icon: <Cloud className="w-2 h-2 text-zinc-900" />,
        };
    }
  };

  const config = getStatusConfig();

  const handleLogin = async () => {
    if (isTauri) {
      try {
        await open("https://web-notes-lyart.vercel.app/auth/desktop");
      } catch (e) {
        console.error("Failed to open browser", e);
      }
    } else {
      signIn("google");
    }
  };

  const handleLogout = () => {
    if (isTauri) {
      logout();
    } else {
      signOut();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[48px] items-center gap-3 px-1">
        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
        {isOpen && (
          <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-800" />
        )}
      </div>
    );
  }

  if (activeUser) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center justify-between px-1 py-1.5">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Image
                    src={activeUser.image || "/placeholder-user.png"}
                    alt={activeUser.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full bg-zinc-900"
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center
                                ${config.color} ring-2 ring-[#111214]`}
                  >
                    {config.icon}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{config.tooltip}</p>
              </TooltipContent>
            </Tooltip>

            {isOpen && (
              <div className="flex flex-col">
                <span className="truncate text-sm font-medium text-zinc-100">
                  {activeUser.name}
                </span>
                <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  {config.tooltip}
                </span>
                {/* Show pending count when offline */}
                {!isOnline && pendingOperations > 0 && (
                  <span className="text-xs text-[rgb(214,178,106)]">
                    {pendingOperations} pending
                  </span>
                )}
              </div>
            )}
          </div>

          {isOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogin}
      className={`h-[44px] w-full rounded-lg px-2 text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 ${
        isOpen ? "justify-start" : "justify-center"
      }`}
    >
      <LogIn className="w-5 h-5" />
      {isOpen && <span className="font-semibold">Sign In with Google</span>}
    </Button>
  );
}
