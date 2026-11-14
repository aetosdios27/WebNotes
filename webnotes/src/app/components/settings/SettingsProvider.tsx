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
import { browserHistoryLabels } from "@/lib/history-labels";
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
        // Same numbering as the app's own entries, so the ← → arrows stay true.
        browserHistoryLabels().push(
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
    if (!isSettings) return;
    const shell = document.querySelector(".app-shell");
    if (!(shell instanceof HTMLElement)) return;
    const previous = shell.inert;
    shell.inert = true;
    return () => {
      shell.inert = previous;
      requestAnimationFrame(() => {
        if (returnFocus.current?.isConnected) returnFocus.current.focus();
      });
    };
  }, [isSettings]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (isSettings && event.key === "Tab") {
        // Menu teardown can release its own focus guards after this dialog opens.
        // Keep this sheet's keyboard boundary independent of the menu lifecycle.
        const sheet = document.querySelector(".settings-sheet");
        const controls = Array.from(
          sheet?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
          ) ?? [],
        ).filter(
          (element) =>
            element.getClientRects().length &&
            !(
              element instanceof HTMLInputElement &&
              element.type === "radio" &&
              !element.checked
            ),
        );
        if (controls.length) {
          event.preventDefault();
          event.stopPropagation();
          const current = controls.findIndex(
            (element) => element === document.activeElement,
          );
          const next =
            current < 0
              ? event.shiftKey
                ? controls.length - 1
                : 0
              : (current + (event.shiftKey ? -1 : 1) + controls.length) %
                controls.length;
          controls[next]?.focus();
        }
        return;
      }
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
