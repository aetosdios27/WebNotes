"use client";

import { useEffect, useRef } from "react";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { isTauri } from "@/lib/tauri";
import { useNotesStore } from "@/store/useNotesStore";
import { toast } from "sonner";

export default function AuthListener() {
  const { setUser } = useNotesStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isTauri || initialized.current) return;
    initialized.current = true;

    const setupListener = async () => {
      console.log("Listening for deep links...");

      // This is the Tauri v2 API
      await onOpenUrl((urls) => {
        console.log("Deep link received:", urls);

        for (const url of urls) {
          if (url.startsWith("webnotes://auth")) {
            try {
              // Parse: webnotes://auth?user={...}
              const urlObj = new URL(url);
              const userParam = urlObj.searchParams.get("user");

              if (userParam) {
                const user = JSON.parse(decodeURIComponent(userParam));
                setUser(user);
                toast.success(`Welcome back, ${user.name}!`);

                // Optional: Force a sync or data reload here
              }
            } catch (e) {
              console.error("Auth parsing failed", e);
              toast.error("Authentication failed");
            }
          }
        }
      });
    };

    setupListener();
  }, [setUser]);

  return null;
}
