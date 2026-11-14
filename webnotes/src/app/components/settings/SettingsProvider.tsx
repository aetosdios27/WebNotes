"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { SettingsSheet } from "./SettingsSheet";
import type { SettingsSection } from "./sections";

const SettingsContext = createContext<{
  isSettingsOpen: boolean;
  openSettings: (
    section?: SettingsSection,
    returnFocus?: HTMLElement | null,
  ) => void;
}>({ isSettingsOpen: false, openSettings: () => {} });
export const useSettings = () => useContext(SettingsContext);

/** Native history keeps the underlying editor mounted (including unsaved Yjs state).
 * Section changes replace that one entry, so Back always returns to writing.
 * The matching static app routes handle reloads, bookmarks and desktop exports.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const openedFromApp = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const isSettings =
    pathname === "/settings" || pathname.startsWith("/settings/");
  const openSettings = useCallback(
    (section?: SettingsSection, target?: HTMLElement | null) => {
      if (!window.location.pathname.startsWith("/settings")) {
        openedFromApp.current = true;
        returnFocus.current =
          target ??
          (document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
        const destination =
          section ??
          (window.matchMedia("(max-width: 700px)").matches ? "" : "account");
        window.history.pushState(
          null,
          "",
          `/settings${destination ? `/${destination}` : ""}`,
        );
      }
    },
    [],
  );
  const close = useCallback(() => {
    if (openedFromApp.current) window.history.back();
    else router.replace("/");
  }, [router]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (isSettings && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        if (!isSettings) openSettings();
      }
    };
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  }, [isSettings, openSettings, close]);
  return (
    <SettingsContext.Provider
      value={{ openSettings, isSettingsOpen: isSettings }}
    >
      {children}
      <SettingsSheet
        open={isSettings}
        sectionId={pathname.split("/")[2]}
        presentation={openedFromApp.current ? "modal" : "direct"}
        onClose={close}
        returnFocus={returnFocus}
      />
    </SettingsContext.Provider>
  );
}
