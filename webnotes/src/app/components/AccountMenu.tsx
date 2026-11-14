"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Avatar } from "@base-ui/react/avatar";
import { LogOut } from "lucide-react";

type Account = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function AccountAvatar({ account, size }: { account: Account; size: number }) {
  const initial = (account.name || account.email || "A")
    .slice(0, 1)
    .toUpperCase();
  return (
    <Avatar.Root className="account-photo" style={{ width: size, height: size }}>
      {account.image && (
        // Google photo URLs refuse requests that carry a referrer.
        <Avatar.Image
          src={account.image}
          alt=""
          referrerPolicy="no-referrer"
          width={size}
          height={size}
        />
      )}
      <Avatar.Fallback>{initial}</Avatar.Fallback>
    </Avatar.Root>
  );
}

/** How long Sign out must be held, in ms. */
const HOLD_MS = 900;

/**
 * Signing out is held, not clicked: pointer or Enter/Space starts a fill
 * across the row, and only a completed hold signs out. A timer decides
 * completion; the fill only shows progress.
 */
function HoldToSignOut({ onSignOut }: { onSignOut: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = () => {
    window.clearTimeout(timer.current);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onSignOut();
    }, HOLD_MS);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };
  return (
    <Menu.Item
      className="note-menu-item hold-action"
      closeOnClick={false}
      data-holding={holding || undefined}
      style={{ ["--hold-duration" as string]: `${HOLD_MS}ms` }}
      aria-description="Press and hold to sign out"
      onClick={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button === 0) start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (!event.repeat) start();
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") stop();
      }}
      onBlur={stop}
    >
      <LogOut aria-hidden="true" />
      Sign out
      <span className="hold-hint" aria-hidden="true">
        Hold
      </span>
    </Menu.Item>
  );
}

export default function AccountMenu({
  account,
  onSignOut,
}: {
  account: Account;
  onSignOut: () => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="account-trigger"
        aria-label={`Account: ${account.name || account.email || "signed in"}`}
      >
        <AccountAvatar account={account} size={28} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8}>
          <Menu.Popup
            data-depth="popover"
            className="note-actions-menu account-menu"
          >
            <div className="account-card">
              <AccountAvatar account={account} size={36} />
              <div>
                {account.name && <strong>{account.name}</strong>}
                {account.email && <span>{account.email}</span>}
              </div>
            </div>
            <Menu.Separator className="note-menu-separator" />
            <HoldToSignOut onSignOut={onSignOut} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
