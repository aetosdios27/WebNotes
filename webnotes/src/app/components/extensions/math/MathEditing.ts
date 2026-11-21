import { Extension, type Editor } from '@tiptap/core';
import type { Node, NodeType } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey, Selection, TextSelection, type Transaction } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { yUndoPluginKey } from '@tiptap/y-tiptap';
import { canOpenInlineMath, isEscaped, latexSource, readInlineMath } from './MathMarkdown';
import { renderLatex } from './MathUtils';

type MathEdit =
  | { kind: 'closed' }
  | { kind: 'editing'; pos: number; draft: string; html: string; error: string | null }
  | { kind: 'saving' };

class MathSession {
  private state: MathEdit = { kind: 'closed' };
  private listeners = new Set<() => void>();

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private set(state: MathEdit) {
    this.state = state;
    this.listeners.forEach(listener => listener());
  }

  open(editor: Editor, pos: number) {
    if (!editor.isEditable) return false;
    const node = editor.state.doc.nodeAt(pos);
    if (!isMath(node)) return false;
    if (this.state.kind === 'editing') {
      if (this.state.pos === pos) return true;
      this.finish(editor, 'save', false);
      // Outside pointer handling normally closes the previous session first.
      return false;
    }
    const draft = latexSource(node);
    this.set({ kind: 'editing', pos, draft, ...renderLatex(draft, node.isBlock) });
    return true;
  }

  change(editor: Editor, draft: string) {
    if (this.state.kind !== 'editing') return;
    const rendered = renderLatex(draft, editor.state.doc.nodeAt(this.state.pos)?.isBlock);
    this.set({
      ...this.state,
      draft,
      error: rendered.error,
      html: rendered.error ? this.state.html : rendered.html,
    });
  }

  map(transaction: Transaction) {
    if (this.state.kind !== 'editing' || !transaction.docChanged) return;
    const result = transaction.mapping.mapResult(this.state.pos, 1);
    if (result.deleted || !isMath(transaction.doc.nodeAt(result.pos))) {
      this.set({ kind: 'closed' });
    } else if (this.state.pos !== result.pos) {
      this.set({ ...this.state, pos: result.pos });
    }
  }

  finish(editor: Editor, action: 'save' | 'cancel', focus = true) {
    if (this.state.kind !== 'editing' || editor.isDestroyed) return;
    const { pos, draft } = this.state;
    this.set({ kind: 'saving' });

    const { state, view } = editor;
    const node = state.doc.nodeAt(pos);
    if (isMath(node)) {
      const original = latexSource(node);
      const latex = action === 'save' ? draft : original;
      const tr = state.tr;
      if (!latex.trim()) {
        tr.delete(pos, pos + node.nodeSize);
      } else if (latex !== original) {
        tr.setNodeMarkup(pos, undefined, { latex });
      }
      let end = tr.mapping.map(pos + node.nodeSize);
      if (node.isBlock && action === 'save' && !tr.doc.resolve(end).nodeAfter?.isTextblock) {
        const paragraph = state.schema.nodes.paragraph.create();
        const $end = tr.doc.resolve(end);
        if ($end.parent.canReplaceWith($end.index(), $end.index(), paragraph.type)) {
          tr.insert(end, paragraph);
          end++;
        }
      }
      tr.setSelection(Selection.findFrom(tr.doc.resolve(end), 1, true) ??
        Selection.near(tr.doc.resolve(end), -1));
      const undoManager = yUndoPluginKey.getState(state)?.undoManager;
      if (tr.docChanged) undoManager?.stopCapturing();
      view.dispatch(closeHistory(tr));
      if (tr.docChanged) {
        undoManager?.stopCapturing();
        if (!undoManager) view.dispatch(closeHistory(view.state.tr));
      }
      if (focus) view.focus();
    }
    this.set({ kind: 'closed' });
  }
}

declare module '@tiptap/core' {
  interface Storage {
    mathEditing: { session: MathSession };
  }
}

export function isMath(node: Node | null | undefined): node is Node {
  return node?.type.name === 'mathInline' || node?.type.name === 'mathBlock';
}

const openMath = 'openMath';

export function insertMath(
  tr: Transaction,
  type: NodeType,
  latex: string,
  insert: (node: Node) => boolean,
) {
  const node = type.create({ latex });
  const step = tr.steps.length;
  if (!insert(node)) return false;
  if (latex === '') {
    tr.mapping.slice(step).maps.at(-1)?.forEach((_from, _to, from, to) => {
      tr.doc.nodesBetween(from, to, (child, pos) => {
        if (child === node) tr.setMeta(openMath, pos);
      });
    });
  }
  return true;
}

type ProvisionalInline = { after: number; literal: string };
// A closing dollar at the end of input can only be disqualified by the next
// keystroke. Remember it until the user moves the caret or types another character.
const provisionalInline = new PluginKey<ProvisionalInline | null>('provisionalInlineMath');

export const MathEditing = Extension.create({
  name: 'mathEditing',
  priority: 1100,

  addStorage: () => ({ session: new MathSession() }),

  onTransaction({ transaction, appendedTransactions }) {
    const { session } = this.storage;
    session.map(transaction);
    let request: unknown = transaction.getMeta(openMath);
    for (const appended of appendedTransactions) {
      session.map(appended);
      if (typeof request === 'number') {
        const mapped = appended.mapping.mapResult(request, 1);
        request = mapped.deleted ? undefined : mapped.pos;
      }
    }
    if (typeof request === 'number') session.open(this.editor, request);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<ProvisionalInline | null>({
        key: provisionalInline,
        state: {
          init: () => null,
          apply(tr, previous) {
            const next: ProvisionalInline | undefined = tr.getMeta(provisionalInline);
            return next ?? (tr.selectionSet || tr.docChanged ? null : previous);
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const $from = state.doc.resolve(from);
            if (view.composing || !$from.parent.isTextblock || $from.parent.type.spec.code ||
                (state.storedMarks ?? $from.marks()).some(mark => mark.type.spec.code)) return false;

            const pending = provisionalInline.getState(state);
            if (pending?.after === from && from === to && /^[\d$]/.test(text)) {
              view.dispatch(state.tr.insertText(pending.literal + text, from - 1, to));
              return true;
            }

            const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\0');
            const input = before + text;
            const block = /^\$\$[ \t]+$/.test(input) ? '' : /^\$\$([^$].*?)\$\$$/.exec(input)?.[1];
            if (block !== undefined && to === $from.end()) {
              const pos = $from.before();
              const tr = state.tr.replaceWith(pos, $from.after(), state.schema.nodes.mathBlock.create({ latex: block }));
              if (block === '') tr.setMeta(openMath, pos);
              view.dispatch(tr);
              return true;
            }

            // Use the closest opening candidate. Never consume an existing atom.
            const segmentStart = input.lastIndexOf('\0') + 1;
            let delimiter = input.indexOf('$', segmentStart);
            while (delimiter !== -1) {
              const formula = readInlineMath(input, delimiter);
              if (formula?.end === input.length) {
                const following = $from.parent.textBetween(to - $from.start(), $from.parent.content.size)[0];
                if (following && /[\d$]/.test(following)) return false;
                const pos = $from.start() + delimiter;
                if (pos > from) return false;
                const node = state.schema.nodes.mathInline.create({ latex: formula.latex }, null, $from.marks());
                const tr = state.tr.replaceWith(pos, to, node);
                const after = pos + node.nodeSize;
                tr.setSelection(TextSelection.create(tr.doc, after));
                if (!following) tr.setMeta(provisionalInline, { after, literal: input.slice(delimiter) });
                view.dispatch(tr);
                return true;
              }
              if (formula) {
                delimiter = input.indexOf('$', formula.end);
                continue;
              }
              // Insert literally while a formula is being typed, ahead of Typography
              // and the regular mark input rules. A space directly after $ ends candidacy.
              if (canOpenInlineMath(input, delimiter) || (
                delimiter === segmentStart && input.startsWith('$$', delimiter)
              )) {
                const next = input.indexOf('$', delimiter + (input[delimiter + 1] === '$' ? 2 : 1));
                let end = next;
                while (end !== -1 && isEscaped(input, end)) end = input.indexOf('$', end + 1);
                if (end === -1) {
                  view.dispatch(state.tr.insertText(text, from, to));
                  return true;
                }
              }
              delimiter = input.indexOf('$', delimiter + 1);
            }
            return false;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    const arrow = (direction: -1 | 1) => {
      const { state, view } = this.editor;
      const { selection, doc } = state;
      if (selection instanceof NodeSelection && selection.node.type.name === 'mathInline') {
        view.dispatch(state.tr.setSelection(TextSelection.create(doc, direction < 0 ? selection.from : selection.to)));
        return true;
      }
      if (!(selection instanceof TextSelection) || !selection.$cursor) return false;
      const node = direction < 0 ? selection.$cursor.nodeBefore : selection.$cursor.nodeAfter;
      if (node?.type.name !== 'mathInline') return false;
      view.dispatch(state.tr.setSelection(NodeSelection.create(doc, selection.from - (direction < 0 ? node.nodeSize : 0))));
      return true;
    };
    return {
      ArrowLeft: () => arrow(-1),
      ArrowRight: () => arrow(1),
      Enter: () => {
        const selection = this.editor.state.selection;
        return selection instanceof NodeSelection && isMath(selection.node) &&
          this.storage.session.open(this.editor, selection.from);
      },
    };
  },
});
