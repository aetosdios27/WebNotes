// src/app/components/AuthButton.tsx

'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from './ui/button';
import Image from 'next/image'; // 1. Import the Image component

export default function AuthButton() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <div className="flex items-center gap-4 p-2">
        {/* 2. Replace <img> with <Image /> */}
        <Image
          src={session.user.image ?? ''}
          alt={session.user.name ?? 'User avatar'}
          width={32} // 3. Add required width
          height={32} // 4. Add required height
          className="w-8 h-8 rounded-full"
        />
        <Button variant="ghost" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button variant="secondary" onClick={() => signIn('google')}>
      Sign In with Google
    </Button>
  );
}