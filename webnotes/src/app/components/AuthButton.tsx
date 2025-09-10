'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import Image from 'next/image';
import { LogIn, LogOut } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

// The component now accepts an `isOpen` prop
interface AuthButtonProps {
  isOpen: boolean;
}

export default function AuthButton({ isOpen }: AuthButtonProps) {
  const { data: session } = useSession();

  if (session?.user) {
    // If the sidebar is OPEN, render the full user info and sign out button
    if (isOpen) {
      return (
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <Image
              src={session.user.image ?? ''}
              alt={session.user.name ?? 'User avatar'}
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="text-sm text-zinc-300 truncate">{session.user.name}</span>
          </div>
          
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="text-zinc-400 hover:bg-red-900/50 hover:text-red-400 flex-shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Sign Out</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }

    // If the sidebar is COLLAPSED, render only the avatar with a tooltip
    return (
      <div className="flex w-full items-center justify-center">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => signOut()}>
                <Image
                  src={session.user.image ?? ''}
                  alt={session.user.name ?? 'User avatar'}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{session.user.name}</p>
              <p className="text-xs text-zinc-400">Click to sign out</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Render the Sign In button, which also adapts its style
  if (isOpen) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => signIn('google')}>
        <LogIn className="mr-2 h-4 w-4" /> Sign In with Google
      </Button>
    );
  }
  
  return (
    <div className="flex justify-center">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" onClick={() => signIn('google')}>
              <LogIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right"><p>Sign In with Google</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}