"use client";

import type { ReactElement, ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { ContextMenu } from "@base-ui/react/context-menu";
import { useTheme } from "next-themes";
import {
  FilePlus2,
  FolderPlus,
  Pin,
  PinOff,
  FolderInput,
  Folder,
  Files,
  BookOpen,
  Type,
  History,
  House,
  Monitor,
  Sun,
  Moon,
  CircleHelp,
  Trash2,
  Check,
  ChevronRight,
} from "lucide-react";
import type { Note, Folder as NoteFolder } from "@/lib/storage/types";

export type NoteMenuActions = {
  createNote: () => void;
  createFolder: () => void;
  home: () => void;
  help: () => void;
  pin: (id: string) => void;
  remove: (id: string) => void;
  move: (id: string, folderId: string | null) => void;
  font: (id: string, font: string) => void;
  reading: (id: string, checked: boolean) => void;
  information: (id: string) => void;
};

type Props = {
  trigger: ReactElement;
  context?: boolean;
  note?: Note;
  folders: NoteFolder[];
  reading: boolean;
  actions: NoteMenuActions;
  folderActions?: ReactNode;
};

function Submenu({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className="note-menu-item">
        {icon}
        {label}
        <ChevronRight className="menu-trailing" aria-hidden="true" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner
          side="right"
          align="start"
          sideOffset={6}
          className="z-[60]"
        >
          <Menu.Popup
            data-depth="popover"
            className="note-actions-menu note-submenu"
          >
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

export default function NoteActionsMenu({
  trigger,
  context = false,
  note,
  folders,
  reading,
  actions,
  folderActions,
}: Props) {
  const { theme = "system", setTheme } = useTheme();
  const content = (
    <Menu.Popup data-depth="popover" className="note-actions-menu">
      <Menu.Group aria-label="Create">
        <Menu.GroupLabel className="note-menu-label">Create</Menu.GroupLabel>
        <Menu.Item className="note-menu-item" onClick={actions.createNote}>
          <FilePlus2 aria-hidden="true" />
          New note<kbd>N</kbd>
        </Menu.Item>
        <Menu.Item className="note-menu-item" onClick={actions.createFolder}>
          <FolderPlus aria-hidden="true" />
          New folder<kbd>⌘⇧F</kbd>
        </Menu.Item>
      </Menu.Group>
      {note && (
        <>
          <Menu.Separator className="note-menu-separator" />
          <Menu.Group aria-label="Note">
            <Menu.GroupLabel className="note-menu-label">Note</Menu.GroupLabel>
            <Menu.Item
              className="note-menu-item"
              onClick={() => actions.pin(note.id)}
            >
              {note.isPinned ? (
                <PinOff aria-hidden="true" />
              ) : (
                <Pin aria-hidden="true" />
              )}
              {note.isPinned ? "Unpin" : "Pin"}
            </Menu.Item>
            <Submenu icon={<FolderInput aria-hidden="true" />} label="Move to">
              <Menu.RadioGroup
                value={note.folderId ?? ""}
                onValueChange={(value) => actions.move(note.id, value || null)}
                aria-label="Move note to folder"
              >
                {[{ id: "", name: "All notes" }, ...folders].map((folder) => (
                  <Menu.RadioItem
                    closeOnClick
                    className="note-menu-item"
                    value={folder.id}
                    key={folder.id}
                  >
                    {folder.id ? (
                      <Folder aria-hidden="true" />
                    ) : (
                      <Files aria-hidden="true" />
                    )}
                    {folder.name}
                    <Menu.RadioItemIndicator className="menu-trailing">
                      <Check aria-hidden="true" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Submenu>
            <Menu.CheckboxItem
              closeOnClick
              className="note-menu-item"
              checked={reading}
              onCheckedChange={(checked) => actions.reading(note.id, checked)}
            >
              <BookOpen aria-hidden="true" />
              Reading mode
              <Menu.CheckboxItemIndicator className="menu-trailing">
                <Check aria-hidden="true" />
              </Menu.CheckboxItemIndicator>
            </Menu.CheckboxItem>
            <Submenu icon={<Type aria-hidden="true" />} label="Font">
              <Menu.RadioGroup
                value={note.font || "sans"}
                onValueChange={(value) => actions.font(note.id, value)}
                aria-label="Note font"
              >
                {["Sans", "Serif", "Mono"].map((font) => (
                  <Menu.RadioItem
                    closeOnClick
                    className="note-menu-item"
                    key={font}
                    value={font.toLowerCase()}
                  >
                    <Type aria-hidden="true" />
                    {font}
                    <Menu.RadioItemIndicator className="menu-trailing">
                      <Check aria-hidden="true" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Submenu>
            <Menu.Item
              className="note-menu-item"
              onClick={() => actions.information(note.id)}
            >
              <History aria-hidden="true" />
              Note information & history
            </Menu.Item>
          </Menu.Group>
        </>
      )}
      <Menu.Separator className="note-menu-separator" />
      <Menu.Group aria-label="App">
        <Menu.GroupLabel className="note-menu-label">App</Menu.GroupLabel>
        <Menu.Item className="note-menu-item" onClick={actions.home}>
          <House aria-hidden="true" />
          Home<kbd>⌘⇧H</kbd>
        </Menu.Item>
        <Submenu icon={<Monitor aria-hidden="true" />} label="Theme">
          <Menu.RadioGroup
            value={theme}
            onValueChange={setTheme}
            aria-label="Theme preference"
          >
            <Menu.RadioItem
              closeOnClick
              className="note-menu-item"
              value="system"
            >
              <Monitor aria-hidden="true" />
              System
              <Menu.RadioItemIndicator className="menu-trailing">
                <Check aria-hidden="true" />
              </Menu.RadioItemIndicator>
            </Menu.RadioItem>
            <Menu.RadioItem
              closeOnClick
              className="note-menu-item"
              value="light"
            >
              <Sun aria-hidden="true" />
              Light
              <Menu.RadioItemIndicator className="menu-trailing">
                <Check aria-hidden="true" />
              </Menu.RadioItemIndicator>
            </Menu.RadioItem>
            <Menu.RadioItem
              closeOnClick
              className="note-menu-item"
              value="dark"
            >
              <Moon aria-hidden="true" />
              Dark
              <Menu.RadioItemIndicator className="menu-trailing">
                <Check aria-hidden="true" />
              </Menu.RadioItemIndicator>
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Submenu>
        <Menu.Item className="note-menu-item" onClick={actions.help}>
          <CircleHelp aria-hidden="true" />
          Help & shortcuts<kbd>?</kbd>
        </Menu.Item>
        {folderActions}
      </Menu.Group>
      {note && (
        <>
          <Menu.Separator className="note-menu-separator" />
          <Menu.Group aria-label="Danger">
            <Menu.Item
              className="note-menu-item note-menu-danger"
              onClick={() => actions.remove(note.id)}
            >
              <Trash2 aria-hidden="true" />
              Delete note
            </Menu.Item>
          </Menu.Group>
        </>
      )}
    </Menu.Popup>
  );
  return context ? (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={trigger} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50">
          {content}
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  ) : (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className="z-50">
          {content}
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
