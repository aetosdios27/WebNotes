import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { CopyButton } from '@/app/components/ui/CopyButton';
import { latexSource } from './MathMarkdown';
import { renderLatex } from './MathUtils';

export function MathFormula({ editor, node, selected, getPos }: NodeViewProps) {
  const block = node.isBlock;
  const latex = latexSource(node);
  const { html, error } = useMemo(() => renderLatex(latex, block), [latex, block]);

  return (
    <NodeViewWrapper as={block ? 'div' : 'span'} className={block ? 'math-block-node' : undefined}
      data-formula={block ? 'block' : 'inline'} contentEditable={false}>
      <button
        type="button"
        className={block ? 'math-block-render' : 'math-inline-render'}
        data-selected={selected || undefined}
        aria-label={latex ? 'Edit formula' : 'Add formula'}
        aria-haspopup="dialog"
        onMouseDown={event => event.preventDefault()}
        onClick={event => {
          event.stopPropagation();
          const pos = getPos();
          if (typeof pos === 'number') editor.storage.mathEditing?.session.open(editor, pos);
        }}
      >
        {error ? <span className="math-invalid">{latex}</span> :
          html ? <span dangerouslySetInnerHTML={{ __html: html }} /> :
            <span className="text-muted">{block ? 'Add equation' : '$…$'}</span>}
      </button>
      {block && latex && <CopyButton value={latex} className="math-copy" />}
    </NodeViewWrapper>
  );
}

export function MathEditor({ editor }: { editor: Editor }) {
  const { session } = editor.storage.mathEditing;
  const edit = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const pos = edit.kind === 'editing' ? edit.pos : null;
  const popupRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const block = pos !== null && editor.state.doc.nodeAt(pos)?.isBlock === true;

  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (pos === null || !popup) return;
    const anchor = editor.view.nodeDOM(pos);
    if (!(anchor instanceof HTMLElement)) return;
    anchor.dataset.editingFormula = '';
    const stopPositioning = autoUpdate(anchor, popup, () => {
      void computePosition(anchor, popup, {
        strategy: 'fixed',
        placement: block ? 'bottom' : 'bottom-start',
        middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
      }).then(({ x, y }) => {
        Object.assign(popup.style, { left: `${x}px`, top: `${y}px` });
      });
    });
    return () => {
      stopPositioning();
      delete anchor.dataset.editingFormula;
    };
  }, [editor, pos, block]);

  const isOpen = pos !== null;
  useLayoutEffect(() => {
    const source = sourceRef.current;
    const popup = popupRef.current;
    if (!isOpen || !source || !popup) return;

    source.focus({ preventScroll: true });
    source.setSelectionRange(source.value.length, source.value.length);

    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || popup.contains(event.target)) return;
      // Preserve the caret on the formula when clicking the writing surface.
      // Other controls retain their ordinary pointer and focus behavior.
      if (editor.view.dom.contains(event.target) &&
          !event.target.closest('button, a, input, [role="button"]')) event.preventDefault();
      session.finish(editor, 'save');
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [editor, isOpen, session]);

  if (edit.kind !== 'editing') return null;
  return createPortal(
    <div
      ref={popupRef}
      role="dialog"
      aria-label={block ? 'Block equation' : 'Inline equation'}
      className="math-editor bg-popover"
      data-depth="popover"
      onClick={event => event.stopPropagation()}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          session.finish(editor, 'save', false);
        }
      }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          session.finish(editor, 'cancel');
        } else if (event.key === 'Enter' && (
          block ? event.metaKey || event.ctrlKey : !event.shiftKey
        )) {
          event.preventDefault();
          session.finish(editor, 'save');
        }
      }}
    >
      <label className="math-source-label">
        LaTeX source
        <textarea ref={sourceRef} value={edit.draft} rows={2}
          onChange={event => session.change(editor, event.target.value)}
          spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off"
          aria-invalid={Boolean(edit.error)} />
      </label>
      <div className="math-live-preview" aria-label="Formula preview">
        {edit.html ? <span dangerouslySetInnerHTML={{ __html: edit.html }} /> :
          <span className="text-muted">Formula preview</span>}
      </div>
      <div className="math-editor-actions">
        <span className="math-editor-message" role="status">
          {edit.error ?? (block ? 'Ctrl/⌘ + Enter to save' : 'Enter to save')}
        </span>
        <button type="button" onClick={() => session.finish(editor, 'save')}>Done</button>
      </div>
    </div>,
    document.body,
  );
}
