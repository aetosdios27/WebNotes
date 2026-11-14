"use client";

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
            <Menu.Item className="note-menu-item" onClick={onSignOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
