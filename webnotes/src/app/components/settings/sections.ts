import { UserRound, Cloud, Type, Sun, Database, Keyboard } from "lucide-react";

export const settingsSections = [
  {
    id: "account",
    label: "Account",
    description: "Your profile and sign-in.",
    icon: UserRound,
  },
  {
    id: "sync",
    label: "Sync and devices",
    description: "Your connection and the notes on this device.",
    icon: Cloud,
  },
  {
    id: "writing",
    label: "Writing defaults",
    description: "A familiar starting point for every new note.",
    icon: Type,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Make yourself at home.",
    icon: Sun,
  },
  {
    id: "data",
    label: "Data",
    description: "Your notes are yours. Keep a copy.",
    icon: Database,
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    description: "A little less clicking, a little more writing.",
    icon: Keyboard,
  },
] as const;
export type SettingsSection = (typeof settingsSections)[number]["id"];
