"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { LogIn, LogOut, Check, X } from "lucide-react";
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

const statusConfig = {
  synced: {
    color: "bg-green-500",
    tooltip: "All changes saved to cloud.",
    icon: <Check className="w-2 h-2 text-zinc-900" />,
  },
  syncing: {
    color: "bg-yellow-500",
    tooltip: "Saving changes...",
    icon: (
      <div className="w-2.5 h-2.5 border-2 border-zinc-900 border-t-yellow-300 rounded-full animate-spin" />
    ),
  },
  unsynced: {
    color: "bg-red-500",
    tooltip: "Offline. Changes are saved locally.",
    icon: <X className="w-2 h-2 text-zinc-900" />,
  },
};

export default function AuthButton({ isOpen, syncStatus }: AuthButtonProps) {
  // Web Session
  const { data: session, status } = useSession();

  // Desktop Session
  const { user, logout } = useNotesStore();

  const config = statusConfig[syncStatus] || statusConfig.unsynced;

  // Determine active user based on platform
  const activeUser = isTauri ? user : session?.user;
  const isLoading = !isTauri && status === "loading";

  const handleLogin = async () => {
    if (isTauri) {
      // Open system browser for handshake
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
      <div className="flex items-center gap-4 p-2 h-[48px]">
        <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
        {isOpen && (
          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
        )}
      </div>
    );
  }

  if (activeUser) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Image
                    src={activeUser.image || "/placeholder-user.png"} // Fallback if no image
                    alt={activeUser.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full bg-zinc-800"
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full flex items-center justify-center
                                ${config.color} ring-2 ring-zinc-900`}
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
              <span className="text-sm font-medium truncate text-zinc-300">
                {activeUser.name}
              </span>
            )}
          </div>
          {isOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-zinc-800 hover:text-red-400 transition-colors"
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
      className={`w-full flex items-center gap-3 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-200 ${
        isOpen ? "justify-start" : "justify-center"
      }`}
    >
      <LogIn className="w-5 h-5" />
      {isOpen && <span className="font-semibold">Sign In with Google</span>}
    </Button>
  );
}
