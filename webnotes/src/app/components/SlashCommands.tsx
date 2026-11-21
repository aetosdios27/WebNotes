"use client";

import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import type { EditorView } from "@tiptap/pm/view";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionProps } from "@tiptap/suggestion";
import { useLayoutEffect, useRef } from "react";
import { commandGroups, type SlashCommandItem } from "./slash-command-registry";
import { SlidingIndicator } from "./ui/sliding-indicator";

type SlashSuggestionProps = SuggestionProps<SlashCommandItem>;
type MenuProps = {
  id: string;
  query: string;
  items: SlashCommandItem[];
  selected: SlashCommandItem | undefined;
  onSelect: (item: SlashCommandItem) => void;
  onRun: (item: SlashCommandItem) => void;
};

function optionId(listboxId: string, item: SlashCommandItem) {
  return `${listboxId}-${item.id}`;
}

function SlashCommands({ id, query, items, selected, onSelect, onRun }: MenuProps) {
  const selectedRow = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    selectedRow.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [query, selected]);

  const row = (item: SlashCommandItem) => {
    const Icon = item.icon;
    return (
      <div
        key={item.id}
        id={optionId(id, item)}
        ref={item === selected ? selectedRow : null}
        className="slash-option"
        role="option"
        aria-selected={item === selected}
        onPointerMove={() => onSelect(item)}
        onClick={() => onRun(item)}
      >
        <Icon aria-hidden="true" />
        <span className="slash-title">{item.title}</span>
        {item.shortcut && <kbd aria-hidden="true">{item.shortcut}</kbd>}
        {item.symbol && <span className="slash-symbol" aria-hidden="true">{item.symbol}</span>}
      </div>
    );
  };

  return (
    <div data-depth="popover" className="slash-menu bg-popover">
      <div
        id={id}
        role="listbox"
        aria-label="Insert a block"
        className="slash-results"
        data-searching={query.trim() ? "" : undefined}
        onMouseDown={(event) => event.preventDefault()}
      >
        <SlidingIndicator value={`${query}:${selected?.id ?? ""}`} />
        {query.trim() ? items.map(row) : commandGroups.map((group) => (
          <div key={group} role="group" aria-label={group}>
            <div className="slash-group-label" aria-hidden="true">{group}</div>
            {items.filter((item) => item.group === group).map(row)}
          </div>
        ))}
        {items.length === 0 && (
          <div className="slash-empty" role="status">No blocks match “{query}”</div>
        )}
      </div>
    </div>
  );
}

let nextMenuId = 0;

export function renderSlashCommands(dismiss: (view: EditorView) => void) {
  let menu: ReturnType<typeof mountMenu> | undefined;

  return {
    onStart(props: SlashSuggestionProps) {
      menu?.close();
      menu = mountMenu(props, dismiss);
    },
    onUpdate(props: SlashSuggestionProps) {
      menu?.update(props);
    },
    onKeyDown({ view, event }: { view: EditorView; event: KeyboardEvent }) {
      if (event.key === "Escape") {
        dismiss(view);
        return true;
      }

      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return false;
      return menu?.keyDown(event.key) ?? false;
    },
    onExit() {
      menu?.close();
      menu = undefined;
    },
  };
}

function mountMenu(initial: SlashSuggestionProps, dismiss: (view: EditorView) => void) {
  const { editor } = initial;
  const { view } = editor;
  const id = `slash-commands-${++nextMenuId}`;
  let current = initial;
  let selectedIndex = 0;
  let firstMiss = initial.items.length ? undefined : initial.query.length;
  let open = true;
  let request = 0;

  function select(item: SlashCommandItem) {
    const index = current.items.indexOf(item);
    if (index === -1 || index === selectedIndex) return;
    selectedIndex = index;
    render();
  }

  function run(item: SlashCommandItem) {
    if (open && current.items.includes(item)) current.command(item);
  }

  const renderer = new ReactRenderer<unknown, MenuProps>(SlashCommands, {
    editor,
    className: "slash-positioner",
    props: { id, query: initial.query, items: initial.items, selected: initial.items[0], onSelect: select, onRun: run },
  });
  const root = renderer.element;
  view.dom.ownerDocument.body.append(root);
  view.dom.setAttribute("aria-controls", id);
  view.dom.setAttribute("aria-expanded", "true");

  function render() {
    const selected = current.items[selectedIndex];
    if (selected) view.dom.setAttribute("aria-activedescendant", optionId(id, selected));
    else view.dom.removeAttribute("aria-activedescendant");
    renderer.updateProps({ query: current.query, items: current.items, selected });
  }

  const caret = {
    contextElement: view.dom,
    getBoundingClientRect() {
      const { left, right, top, bottom } = view.coordsAtPos(view.state.selection.from);
      return new DOMRect(left, top, right - left, bottom - top);
    },
  };

  function position() {
    const frame = ++request;
    void computePosition(caret, root, {
      strategy: "fixed",
      placement: "bottom-start",
      middleware: [
        offset(5),
        flip({ padding: 8, crossAxis: false }),
        shift({ padding: 8 }),
        size({
          padding: 8,
          apply({ availableHeight }) {
            if (open && frame === request) {
              root.style.setProperty("--slash-available-height", `${Math.max(0, availableHeight)}px`);
            }
          },
        }),
      ],
    }).then(({ x, y, placement }) => {
      if (!open || frame !== request) return;
      root.style.left = `${x}px`;
      root.style.top = `${y}px`;
      root.dataset.side = placement.startsWith("top") ? "top" : "bottom";

      if (root.dataset.positioned === undefined && root.firstElementChild) {
        const surface = root.firstElementChild;
        surface.setAttribute("data-starting-style", "");
        root.dataset.positioned = "";
        surface.getBoundingClientRect();
        surface.removeAttribute("data-starting-style");
      }
    });
  }

  function onOutside(event: Event) {
    if (event.target instanceof Node && !root.contains(event.target) &&
        (event.type === "pointerdown" || !view.dom.contains(event.target))) {
      dismiss(view);
    }
  }

  const doc = view.dom.ownerDocument;
  doc.addEventListener("pointerdown", onOutside, true);
  doc.addEventListener("focusin", onOutside, true);
  const stopPositioning = autoUpdate(caret, root, position);
  render();

  return {
    update(props: SlashSuggestionProps) {
      if (current.query !== props.query) selectedIndex = 0;
      firstMiss = props.items.length ? undefined : Math.min(firstMiss ?? props.query.length, props.query.length);
      if (firstMiss !== undefined &&
          (/\s$/.test(props.query) || props.query.length - firstMiss >= 3)) {
        dismiss(view);
        return;
      }
      current = props;
      render();
      position();
    },
    keyDown(key: string) {
      const { items } = current;
      const item = items[selectedIndex];
      if (!open || !item) return false;

      switch (key) {
        case "ArrowUp":
          selectedIndex = (selectedIndex + items.length - 1) % items.length;
          break;
        case "ArrowDown":
          selectedIndex = (selectedIndex + 1) % items.length;
          break;
        case "Home":
          selectedIndex = 0;
          break;
        case "End":
          selectedIndex = items.length - 1;
          break;
        case "Enter":
        case "Tab":
          run(item);
          return true;
        default:
          return false;
      }
      render();
      return true;
    },
    close() {
      open = false;
      stopPositioning();
      doc.removeEventListener("pointerdown", onOutside, true);
      doc.removeEventListener("focusin", onOutside, true);
      view.dom.removeAttribute("aria-activedescendant");
      view.dom.removeAttribute("aria-controls");
      view.dom.removeAttribute("aria-expanded");

      root.inert = true;
      const surface = root.firstElementChild;
      if (surface && root.dataset.positioned !== undefined) {
        surface.setAttribute("data-ending-style", "");
        const animations = surface.getAnimations();
        if (animations.length) {
          void Promise.allSettled(animations.map((animation) => animation.finished))
            .then(() => renderer.destroy());
          return;
        }
      }
      renderer.destroy();
    },
  };
}
