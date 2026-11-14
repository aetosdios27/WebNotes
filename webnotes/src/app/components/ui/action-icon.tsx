import {
  FilePlus2,
  FolderPlus,
  House,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  LogIn,
  LogOut,
  Settings2,
} from "lucide-react";

const actionIcons = {
  "New note": FilePlus2,
  "New folder": FolderPlus,
  Home: House,
  "Rename folder": Pencil,
  "Delete folder": Trash2,
  "Delete note": Trash2,
  "Pin note": Pin,
  "Unpin note": PinOff,
  "Sign in": LogIn,
  "Sign out": LogOut,
};

export function ActionIcon({ label }: { label: string }) {
  const Icon =
    Object.entries(actionIcons).find(([name]) => name === label)?.[1] ??
    Settings2;
  return (
    <Icon
      aria-hidden="true"
      className={label.startsWith("Delete") ? "text-destructive" : undefined}
    />
  );
}
