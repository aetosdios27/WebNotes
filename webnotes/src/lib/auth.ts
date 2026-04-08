// src/lib/auth.ts
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const hasGoogleAuth =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const hasDatabase = !!process.env.DATABASE_URL;

const providers = hasGoogleAuth
  ? [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        httpOptions: {
          timeout: 10000,
        },
      }),
    ]
  : [];

let adapter: NextAuthOptions["adapter"] | undefined;

if (hasDatabase) {
  const { PrismaAdapter } = require("@auth/prisma-adapter");
  const prisma = require("./prisma").default;
  adapter = PrismaAdapter(prisma);
}

export const authOptions: NextAuthOptions = {
  ...(adapter ? { adapter } : {}),
  providers,
  session: { strategy: adapter ? "database" : "jwt" },
  secret: process.env.AUTH_SECRET ?? "dev-insecure-auth-secret",
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id =
          user?.id ?? (typeof token?.sub === "string" ? token.sub : "");
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
