"use client";

import { useRef } from "react";
import { Menu } from "@base-ui/react/menu";
import { AccountAvatar } from "./AccountAvatar";
import { Settings } from "lucide-react";
import { HoldToSignOut } from "./HoldToSignOut";
import { useSettings } from "./settings/SettingsProvider";

export default function AccountMenu({
  account,
  onSignOut,
}: {
  account: React.ComponentProps<typeof AccountAvatar>["account"];
  onSignOut: () => void;
}) {
  const { openSettings } = useSettings();
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Menu.Root>
      <Menu.Trigger
        ref={trigger}
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
            <Menu.Item
              className="account-card account-manage"
              onClick={() => openSettings("account", trigger.current)}
            >
              <AccountAvatar account={account} size={36} />
              <div>
                {account.name && <strong>{account.name}</strong>}
                {account.email && <span>{account.email}</span>}
                <small>Manage account</small>
              </div>
            </Menu.Item>
            <Menu.Separator className="note-menu-separator" />
            <Menu.Item
              className="note-menu-item"
              onClick={() => openSettings(undefined, trigger.current)}
            >
              <Settings aria-hidden="true" />
              Settings<kbd>⌘,</kbd>
            </Menu.Item>
            <HoldToSignOut menu onSignOut={onSignOut} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
