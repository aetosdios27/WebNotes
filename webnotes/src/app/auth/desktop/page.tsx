"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function DesktopAuth() {
  const { data: session, status } = useSession();
  const [msg, setMsg] = useState("Authenticating...");

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      // 1. Not logged in? Go to Google Login.
      // callbackUrl points BACK to this page.
      window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(
        "/auth/desktop"
      )}`;
    } else if (status === "authenticated" && session?.user) {
      // 2. Logged in? Send data to Desktop.
      setMsg("Opening WebNotes Desktop...");

      const userPayload = encodeURIComponent(JSON.stringify(session.user));
      // The Protocol Handler
      const deepLink = `webnotes://auth?user=${userPayload}`;

      // Trigger the app open
      window.location.href = deepLink;

      setTimeout(() => {
        setMsg("You can close this tab.");
      }, 1500);
    }
  }, [session, status]);

  if (status === "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Authenticated</h1>
        <p className="text-zinc-400 mb-8">{msg}</p>

        <Button
          variant="outline"
          onClick={() => {
            const userPayload = encodeURIComponent(
              JSON.stringify(session?.user)
            );
            window.location.href = `webnotes://auth?user=${userPayload}`;
          }}
        >
          Open App Manually
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <Loader2 className="w-10 h-10 animate-spin text-zinc-500 mb-4" />
      <p className="text-zinc-400">{msg}</p>
    </div>
  );
}
