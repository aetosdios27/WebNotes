'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from './ui/button';
import Image from 'next/image';
import { LogOut } from 'lucide-react';

export default function AuthButton() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      // Use flexbox to push items to opposite ends
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src={session.user.image ?? ''}
            alt={session.user.name ?? 'User avatar'}
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="text-sm text-zinc-300 truncate">{session.user.name}</span>
        </div>
        
        {/* Use a shadcn Button with ghost variant and custom hover styles */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="text-zinc-400 hover:bg-red-900/50 hover:text-red-400"
          aria-label="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="secondary" className="w-full" onClick={() => signIn('google')}>
      Sign In with Google
    </Button>
  );
}