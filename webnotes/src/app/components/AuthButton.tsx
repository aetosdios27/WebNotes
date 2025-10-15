// src/app/components/AuthButton.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { LogIn, LogOut, Check, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import type { SyncStatus } from '@/lib/storage/types';

interface AuthButtonProps {
  isOpen: boolean;
  syncStatus: SyncStatus;
}

const statusConfig = {
  synced: {
    color: 'bg-green-500',
    tooltip: 'All changes saved to cloud.',
    icon: <Check className="w-2 h-2 text-zinc-900" />,
  },
  syncing: {
    color: 'bg-yellow-500',
    tooltip: 'Saving changes...',
    // THE FIX: Reduced spinner size to fit inside the smaller dot
    icon: <div className="w-2.5 h-2.5 border-2 border-zinc-900 border-t-yellow-300 rounded-full animate-spin" />,
  },
  unsynced: {
    color: 'bg-red-500',
    tooltip: 'Offline. Changes are saved locally.',
    icon: <X className="w-2 h-2 text-zinc-900" />,
  },
};

export default function AuthButton({ isOpen, syncStatus }: AuthButtonProps) {
  const { data: session, status } = useSession();
  const config = statusConfig[syncStatus] || statusConfig.unsynced;

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-4 p-2 h-[48px]">
        <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
        {isOpen && <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />}
      </div>
    );
  }

  if (session?.user) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Image
                    src={session.user.image || ''}
                    alt={session.user.name || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div 
                    // THE FIX: Reduced dot size from w-3.5 h-3.5 to w-3 h-3
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
                {session.user.name}
              </span>
            )}
          </div>
          {isOpen && (
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
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
      onClick={() => signIn('google')}
      className={`w-full flex items-center gap-3 p-2 ${isOpen ? 'justify-start' : 'justify-center'}`}
    >
      <LogIn className="w-5 h-5" />
      {isOpen && <span className="font-semibold">Sign In with Google</span>}
    </Button>
  );
}