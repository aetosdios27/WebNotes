// src/lib/trpc/client.ts
import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "./routers/_app";

// React hooks for components
export const trpc = createTRPCReact<AppRouter>();

// Helper to get base URL
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Shared link configuration
const trpcLink = httpBatchLink({
  url: `${getBaseUrl()}/api/trpc`,
  transformer: superjson,
});

// Vanilla client for non-React code (like your storage adapter)
export const trpcVanilla = createTRPCClient<AppRouter>({
  links: [trpcLink],
});
