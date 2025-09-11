'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import Image from 'next/image';
import { LogIn, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface AuthButtonProps {
  isOpen: boolean;
}

export default function AuthButton({ isOpen }: AuthButtonProps) {
  const { data: session } = useSession();

  if (session?.user) {
    // RENDER THE EXPANDED VIEW: Avatar, Name, and a visible Sign Out button
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

    // RENDER THE COLLAPSED VIEW: Clickable avatar that opens the "card"
    return (
      <div className="flex w-full items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>
              <Image
                src={session.user.image ?? ''}
                alt={session.user.name ?? 'User avatar'}
                width={28}
                height={28}
                className="rounded-full"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2 ml-2" side="right" align="start">
            <DropdownMenuItem 
              onClick={() => signOut()}
              className="text-red-500 focus:bg-red-900/50 focus:text-red-400 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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