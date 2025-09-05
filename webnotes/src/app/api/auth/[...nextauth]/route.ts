// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth'; // Import your single source of truth

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };