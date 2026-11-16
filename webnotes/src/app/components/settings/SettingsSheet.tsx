"use client";

import { Spinner } from "@/app/components/ui/spinner";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Cloud,
  Database,
  Download,
  Info,
  Monitor,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useNotesStore } from "@/store/useNotesStore";
import { isTauri } from "@/lib/tauri";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { trpc } from "@/lib/trpc/client";
import { appShortcuts } from "@/lib/shortcuts";
import { defaultNoteFont, NOTE_FONTS } from "@/lib/note-fonts";
import { HoldToSignOut } from "../HoldToSignOut";
import { AccountAvatar } from "../AccountAvatar";
import { settingsSections } from "./sections";
import "./settings.css";

function NoteLine({ children }: { children: ReactNode }) {
  return (
    <p className="settings-note">
      <Info aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-grow">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function Shortcuts() {
  const [query, setQuery] = useState("");
  const filtered = appShortcuts.filter((item) =>
    `${item.category} ${item.label}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <label className="settings-search">
        <Search aria-hidden="true" />
        <input
          type="search"
          aria-label="Search shortcuts"
          placeholder="Search shortcuts…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {Array.from(new Set(filtered.map((item) => item.category))).map(
        (category) => (
          <section className="settings-shortcuts" key={category}>
            <h2>{category}</h2>
            {filtered
              .filter((item) => item.category === category)
              .map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <span className="settings-keys">
                    {item.keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </span>
                </div>
              ))}
          </section>
        ),
      )}
      {!filtered.length && (
        <p className="settings-empty">
          No shortcuts match. Try “note” or “settings”.
        </p>
      )}
      <NoteLine>On Windows and Linux, use Ctrl instead of ⌘.</NoteLine>
    </>
  );
}
function ThemeArt() {
  return (
    <span className="settings-theme-art" aria-hidden="true">
      <span className="settings-mini-rail">
        <i />
        <i />
        <i />
      </span>
      <span className="settings-mini-note">
        <i />
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

export function SettingsSheet({
  open,
  sectionId,
  presentation,
  onClose,
  returnFocus,
}: {
  open: boolean;
  sectionId?: string;
  presentation: "modal" | "direct";
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const { data: session, status } = useSession();
  const {
    user,
    notes,
    folders,
    isOnline,
    syncStatus,
    pendingOperations,
    isLoading,
    settings,
    updateSettings,
    loadData,
    logout,
  } = useNotesStore();
  const noteCount = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;
  const folderCount = `${folders.length} ${folders.length === 1 ? "folder" : "folders"}`;
  const account = isTauri ? user : session?.user;
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const section =
    settingsSections.find(({ id }) => id === sectionId) ?? settingsSections[0];
  const list = !sectionId;
  const title = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const focusTitle = useCallback(() => {
    const headings = document.querySelectorAll<HTMLElement>(
      ".settings-sheet h1[tabindex], .settings-header h2[tabindex]",
    );
    Array.from(headings)
      .find((heading) => heading.getClientRects().length)
      ?.focus();
  }, []);
  const focusOnMount = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) requestAnimationFrame(focusTitle);
    },
    [focusTitle],
  );
  const revoke = trpc.account.signOutAll.useMutation();
  useEffect(() => {
    if (open && isLoading) void loadData();
  }, [open, isLoading, loadData]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  useEffect(() => {
    if (!open) return;
    scroll.current?.scrollTo(0, 0);
    focusTitle();
  }, [open, sectionId, focusTitle]);
  function navigate(id?: string) {
    window.history.replaceState(null, "", `/settings${id ? `/${id}` : ""}`);
  }
  function savedStamp() {
    setSaved(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2400);
  }
  function authenticate() {
    if (isTauri)
      void openExternal("https://web-notes-lyart.vercel.app/auth/desktop");
    else window.location.assign("/signin?callbackUrl=%2Fsettings%2Faccount");
  }
  async function leave(all = false) {
    try {
      if (all) await revoke.mutateAsync();
      if (isTauri) logout();
      else await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  }
  const connection = !isOnline
    ? "You’re offline"
    : !account
      ? "Your notes live on this device"
      : isTauri
        ? "Notes are saved on this device"
        : pendingOperations > 0 || syncStatus === "syncing"
          ? "Saving changes…"
          : syncStatus === "unsynced"
            ? "Some changes haven’t synced"
            : "Local changes saved";
  const connectionDetail = !isOnline
    ? "Your edits stay here. Reconnect to resume sync."
    : !account
      ? "Sign in to sync them to your other devices."
      : isTauri
        ? "Cloud sync is not available in the desktop app yet."
        : "Your account is connected. Local saving status does not verify every note’s cloud sync.";
  async function download() {
    setExporting(true);
    try {
      const { exportNotesZip } = await import("@/lib/export-notes");
      const bytes = await exportNotesZip(notes, folders);
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/zip" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `webnotes-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Notes exported");
    } catch {
      toast.error("Could not export notes. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  const closeButton = (
    <button
      className="settings-icon"
      aria-label="Close settings"
      onClick={onClose}
    >
      <X aria-hidden="true" />
    </button>
  );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className="settings-backdrop"
        />
        <Dialog.Popup
          ref={focusOnMount}
          aria-modal="true"
          className="settings-sheet"
          data-presentation={presentation}
          data-list={list || undefined}
          initialFocus={title}
          finalFocus={returnFocus}
        >
          <aside className="settings-rail">
            <div className="settings-brand">
              <svg
                className="settings-logo"
                viewBox="0 0 160 70"
                aria-hidden="true"
              >
                <path d="M0 1H35V34L97 0V34L33 69H0Z" />
                <path d="M98 34L160 0V34L98 69Z" />
              </svg>
              <span>webnotes</span>
            </div>
            <div className="settings-phone-title">
              <h1 ref={list ? title : undefined} tabIndex={-1}>
                Settings
              </h1>
              {closeButton}
            </div>
            <p className="settings-rail-label">Settings</p>
            <nav aria-label="Settings sections">
              {settingsSections.map(({ id, label, icon: Icon }) => (
                <a
                  href={`/settings/${id}`}
                  key={id}
                  aria-current={section.id === id ? "page" : undefined}
                  onClick={(event) => {
                    if (
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey
                    ) {
                      event.preventDefault();
                      navigate(id);
                    }
                  }}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                  <ChevronRight
                    className="settings-chevron"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </nav>
            <div className="settings-rail-bottom">
              <div className="settings-identity">
                {account ? (
                  <AccountAvatar account={account} size={31} />
                ) : (
                  <Monitor aria-hidden="true" />
                )}
                <div className="settings-grow">
                  <strong>{account?.name || "On this device"}</strong>
                  <span>
                    {account?.email || `${noteCount} · Not signed in`}
                  </span>
                </div>
              </div>
              <p>Local first. Always.</p>
            </div>
          </aside>
          <main className="settings-content">
            <div className="settings-phone-header">
              <button onClick={() => navigate()}>
                <ArrowLeft aria-hidden="true" />
                Settings
              </button>
              {closeButton}
            </div>
            <header className="settings-header">
              <div className="settings-grow">
                <Dialog.Title ref={!list ? title : undefined} tabIndex={-1}>
                  {list ? "Settings" : section.label}
                </Dialog.Title>
                <Dialog.Description>{section.description}</Dialog.Description>
              </div>
              <span className="settings-saved" role="status">
                {saved && (
                  <>
                    <Check aria-hidden="true" />
                    Saved
                  </>
                )}
              </span>
              <span className="settings-desktop-close">{closeButton}</span>
            </header>
            <div className="settings-scroll" ref={scroll}>
              {section.id === "account" &&
                (status === "loading" && !isTauri ? (
                  <p role="status" className="settings-waiting"><Spinner size={14} />Loading account</p>
                ) : account ? (
                  <>
                    <div className="settings-profile">
                      <div className="settings-identity">
                        <AccountAvatar account={account} size={58} />
                        <div className="settings-grow">
                          <h2>{account.name || "Google account"}</h2>
                          <p>{account.email}</p>
                        </div>
                      </div>
                      <div className="settings-google">
                        <b aria-hidden="true">G</b>Signed in with Google
                        <span>Personal account</span>
                      </div>
                    </div>
                    <div className="settings-account-summary">
                      <Cloud aria-hidden="true" />
                      <div className="settings-grow">
                        <h2>Your notes are at home on this device.</h2>
                        <p>{connection}</p>
                      </div>
                      <button
                        className="settings-icon"
                        onClick={() => navigate("sync")}
                        aria-label="View sync and devices"
                      >
                        <ChevronRight aria-hidden="true" />
                      </button>
                    </div>
                    <div className="settings-account-actions">
                      <Row
                        title="Sign out of this device"
                        description="Sync pauses until you sign in again."
                      >
                        <HoldToSignOut onSignOut={() => void leave()} />
                      </Row>
                      {!isTauri && (
                        <Row
                          title="Sign out of all devices"
                          description="End every active session, including this one. Local copies stay on each device."
                        >
                          <HoldToSignOut
                            label={
                              revoke.isPending ? "Signing out…" : "Sign out all"
                            }
                            disabled={revoke.isPending}
                            onSignOut={() => void leave(true)}
                          />
                        </Row>
                      )}
                    </div>
                    <NoteLine>
                      Your name and photo come from your Google profile.
                    </NoteLine>
                  </>
                ) : (
                  <>
                    <div className="settings-quiet">
                      <Monitor aria-hidden="true" />
                      <h2>A home for your notes. Right here.</h2>
                      <p>
                        Your {noteCount} {notes.length === 1 ? "lives" : "live"}{" "}
                        on this device. You can keep writing without an account.
                        Sign in when you want them on your other devices.
                      </p>
                      <button
                        className="settings-button settings-primary"
                        onClick={authenticate}
                      >
                        <b aria-hidden="true">G</b>Sign in to sync
                      </button>
                    </div>
                    <div className="settings-account-summary">
                      <Database aria-hidden="true" />
                      <div>
                        <h2>{noteCount} on this device</h2>
                        <p>{folderCount} · Not signed in</p>
                      </div>
                    </div>
                    <NoteLine>
                      Clearing your browser’s site data will remove local notes.{" "}
                      <button
                        className="settings-link"
                        onClick={() => navigate("data")}
                      >
                        Export a backup
                      </button>{" "}
                      to keep a copy.
                    </NoteLine>
                  </>
                ))}
              {section.id === "sync" && (
                <>
                  <div className="settings-status">
                    <Cloud aria-hidden="true" />
                    <div className="settings-grow">
                      <h2>{connection}</h2>
                      <p>{connectionDetail}</p>
                    </div>
                  </div>
                  <div className="settings-group">
                    <Row
                      title="Connection"
                      description={isOnline ? "Online" : "Offline"}
                    />
                    <Row
                      title="On this device"
                      description={`${noteCount} · ${folderCount}`}
                    />
                    <Row
                      title="Account"
                      description={account?.email || "Not signed in"}
                    />
                  </div>
                  <NoteLine>
                    Device sessions aren’t listed here.{" "}
                    {account
                      ? "You can end all browser sessions from Account."
                      : "You can keep writing without an account."}
                  </NoteLine>
                </>
              )}
              {section.id === "writing" && (
                <>
                  <div className="settings-group">
                    <Row
                      title="Default font"
                      description="For new notes. Existing notes stay as they are."
                    />
                    <fieldset className="settings-font-options">
                      <legend className="sr-only">Default font</legend>
                      {NOTE_FONTS.map(({ id, label }) => (
                        <label key={id} className={`settings-font-${id}`}>
                          <input
                            type="radio"
                            name="default-font"
                            value={id}
                            checked={
                              defaultNoteFont(settings.defaultFont) === id
                            }
                            onChange={() =>
                              void updateSettings({ defaultFont: id })
                                .then(savedStamp)
                                .catch(() =>
                                  toast.error(
                                    "Could not save your font preference",
                                  ),
                                )
                            }
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </fieldset>
                    <div
                      className={`settings-paper settings-font-${defaultNoteFont(settings.defaultFont)}`}
                    >
                      <small>New note preview</small>
                      <h3>A little room to think</h3>
                      <p>
                        Follow a thought. Leave a little room for{" "}
                        <mark>what comes next</mark>.
                      </p>
                    </div>
                  </div>
                  <NoteLine>
                    This default is saved on this device and applies to the next
                    note you create.
                  </NoteLine>
                </>
              )}
              {section.id === "appearance" && (
                <>
                  <h2>Theme</h2>
                  <p className="settings-subtitle">
                    System follows your device’s appearance.
                  </p>
                  <fieldset className="settings-themes">
                    <legend className="sr-only">Theme</legend>
                    {["system", "light", "dark"].map((value) => (
                      <label
                        className="settings-theme"
                        data-theme={value}
                        key={value}
                      >
                        <input
                          type="radio"
                          name="settings-theme"
                          value={value}
                          checked={theme === value}
                          onChange={() => {
                            setTheme(value);
                            savedStamp();
                          }}
                        />
                        <ThemeArt />
                        <span className="settings-theme-name">
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                          <span className="settings-check">
                            {theme === value && <Check aria-hidden="true" />}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <NoteLine>
                    Your note colors stay consistent in light and dark.
                    Highlights stay yellow in both.
                  </NoteLine>
                </>
              )}
              {section.id === "data" && (
                <>
                  <div className="settings-group">
                    <Row
                      title="Export all notes"
                      description={`${noteCount} currently available on this device, organised by folder.`}
                    >
                      <button
                        className="settings-button"
                        disabled={exporting}
                        onClick={() => void download()}
                      >
                        {exporting ? <Spinner size={14} /> : <Download aria-hidden="true" />}
                        {exporting ? "Exporting" : "Markdown .zip"}
                      </button>
                    </Row>
                  </div>
                  <NoteLine>
                    The archive contains Markdown text. Images, attachments and
                    version history aren’t bundled.
                  </NoteLine>
                  {account && (
                    <div className="settings-delete">
                      <h2>Delete account</h2>
                      <p>Coming soon. Email support to delete your data now.</p>
                      <button className="settings-button" disabled>
                        Delete account
                      </button>
                    </div>
                  )}
                </>
              )}
              {section.id === "shortcuts" && <Shortcuts />}
            </div>
            <footer className="settings-footer">
              <span>
                <Check aria-hidden="true" />
                Changes apply instantly
              </span>
              <span>/settings/{section.id}</span>
            </footer>
          </main>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
