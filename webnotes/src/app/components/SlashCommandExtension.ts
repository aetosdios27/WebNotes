import { Extension, type Range } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion } from "@tiptap/suggestion";
import { findSlashCommands, type SlashCommandItem } from "./slash-command-registry";
import { renderSlashCommands } from "./SlashCommands";

const suggestionKey = new PluginKey<{ active: boolean; range: Range }>("slashSuggestion");
const dismissedKey = new PluginKey<number | null>("dismissedSlash");

export const SlashCommand = Extension.create({
  name: "slashCommand",
  priority: 110,

  addProseMirrorPlugins() {
    return [
      // Tiptap 3.19 clears the active suggestion on exit, then matches the same
      // trigger on the next transaction. Remember the slash until it's removed.
      new Plugin<number | null>({
        key: dismissedKey,
        state: {
          init: () => null,
          apply(transaction, dismissed, oldState) {
            const suggestion = suggestionKey.getState(oldState);
            if (transaction.getMeta(suggestionKey)?.exit && suggestion?.active) {
              return suggestion.range.from;
            }
            if (dismissed === null) return null;
            const mapped = transaction.mapping.mapResult(dismissed);
            return mapped.deleted ? null : mapped.pos;
          },
        },
      }),
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        pluginKey: suggestionKey,
        char: "/",
        allowSpaces: true,
        allow: ({ range, state }) => dismissedKey.getState(state) !== range.from,
        items: ({ query }) => findSlashCommands(query),
        command: ({ editor, range, props }) => props.run({ editor, range }),
        render: () => renderSlashCommands((view) => exitSuggestion(view, suggestionKey)),
      }),
    ];
  },
});
