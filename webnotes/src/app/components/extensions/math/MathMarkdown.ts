import type MarkdownIt from 'markdown-it';
import type { Node } from '@tiptap/pm/model';
import type { MarkdownSerializerState } from 'prosemirror-markdown';

export function latexSource(node: Node): string {
  return typeof node.attrs.latex === 'string' ? node.attrs.latex : '';
}

export function isEscaped(source: string, index: number): boolean {
  let backslashes = 0;
  while (source[--index] === '\\') backslashes++;
  return backslashes % 2 === 1;
}

export function canOpenInlineMath(source: string, index: number): boolean {
  return source[index] === '$' && source[index - 1] !== '$' &&
    !isEscaped(source, index) && /[^\s$]/.test(source[index + 1] ?? '');
}

export function readInlineMath(source: string, start: number) {
  if (!canOpenInlineMath(source, start)) return null;
  for (let end = source.indexOf('$', start + 1); end !== -1; end = source.indexOf('$', end + 1)) {
    if (isEscaped(source, end)) continue;
    if (/\s/.test(source[end - 1]) || /[\d$]/.test(source[end + 1] ?? '')) return null;
    return { latex: source.slice(start + 1, end), end: end + 1 };
  }
  return null;
}

// Character references preserve source that would otherwise be consumed as
// Markdown delimiters, paragraph breaks or table separators.
const mathEntities = /&(?:amp|#\d+);/g;
const escapeEntities = (text: string) => text.replace(mathEntities, entity => `&amp;${entity.slice(1)}`);
const entity = (character: string) => `&#${character.codePointAt(0)};`;

function inlineMarkdownSource(latex: string, inTable: boolean) {
  return escapeEntities(latex)
    .replace(/[$\n\r|]/g, (character, offset, source) => {
      if (character === '$' && isEscaped(source, offset)) return character;
      if (character === '|' && !inTable) return character;
      return entity(character);
    })
    .replace(/^\s+|\s+$/g, spaces => Array.from(spaces, entity).join(''))
    .replace(/\\+$/, run => run.length % 2 ? `${run.slice(1)}&#92;` : run);
}

// Shared by document loading, Markdown paste and the wall miniature.
const configured = new WeakSet<MarkdownIt>();
export function addMathMarkdown(md: MarkdownIt) {
  if (configured.has(md)) return;
  configured.add(md);

  md.inline.ruler.before('escape', 'math_inline', (state, silent) => {
    const match = readInlineMath(state.src, state.pos);
    if (!match || match.end > state.posMax) return false;
    if (!silent) state.push('math_inline', 'span', 0).content = match.latex;
    state.pos = match.end;
    return true;
  });

  md.block.ruler.before('fence', 'math_block', (state, start, end, silent) => {
    if (state.sCount[start] - state.blkIndent >= 4) return false;
    const line = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]);
    if (!line.startsWith('$$')) return false;
    const single = /^\$\$([^$].*?)\$\$[ \t]*$/.exec(line);
    let next = start + 1;
    let latex = single?.[1];
    if (latex === undefined) {
      if (line.trimEnd() !== '$$') return false;
      for (; next < end; next++) {
        if (!state.isEmpty(next) && state.sCount[next] < state.blkIndent) return false;
        const from = state.bMarks[next] + state.tShift[next];
        if (/^\$\$[ \t]*$/.test(state.src.slice(from, state.eMarks[next]))) break;
      }
      if (next === end) return false;
      latex = state.getLines(start + 1, next, state.blkIndent, false);
      next++;
    }
    if (silent) return true;
    const token = state.push('math_block', 'div', 0);
    token.content = latex;
    token.map = [start, next];
    state.line = next;
    return true;
  }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });

  for (const [name, tag, dataType] of [
    ['math_inline', 'span', 'math-inline'],
    ['math_block', 'div', 'math-block'],
  ] as const) {
    md.renderer.rules[name] = (tokens, index) => {
      const latex = tokens[index].content.replace(mathEntities, value => md.utils.unescapeAll(value));
      const source = md.utils.escapeHtml(latex);
      // Markdown source goes in a text node so paste sanitization preserves
      // leading and trailing whitespace. The schema persists it as data-latex.
      return `<${tag} data-type="${dataType}">${source}</${tag}>${tag === 'div' ? '\n' : ''}`;
    };
  }
}

export function mathMarkdownStorage(block: boolean) {
  return {
    markdown: {
      serialize(state: MarkdownSerializerState, node: Node, parent: Node, index: number) {
        const latex = latexSource(node);
        if (block) {
          const source = escapeEntities(latex).replace(/^(\s*)\$\$([ \t]*)$/gm, '$1&#36;&#36;$2');
          state.text(`$$\n${source}\n$$`, false);
          state.closeBlock(node);
        } else if (latex) {
          const inTable = 'inTable' in state && state.inTable === true;
          state.text(`$${inlineMarkdownSource(latex, inTable)}$`, false);
          // The inline delimiter rule also applies at adjacent node boundaries.
          const next = parent.maybeChild(index + 1);
          if (next?.type.name === 'mathInline' || /^[\d$]/.test(next?.text ?? '')) state.write('<!-- -->');
        }
      },
      parse: { setup: addMathMarkdown },
    },
  };
}
