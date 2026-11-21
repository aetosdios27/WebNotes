import { describe, expect, test } from "bun:test";
import MarkdownIt from "markdown-it";
import { addMathMarkdown, readInlineMath } from "./MathMarkdown";
import { renderLatex } from "./MathUtils";

describe("renderLatex treats note LaTeX as untrusted", () => {
  test("\\href cannot produce a javascript: link", () => {
    const { html } = renderLatex("\\href{javascript:alert(1)}{click}");
    expect(html).not.toMatch(/<a\b/);
    expect(html).not.toMatch(/href="/);
  });

  test("\\htmlStyle cannot inject inline CSS", () => {
    const { html } = renderLatex("\\htmlStyle{position:fixed;inset:0}{x}");
    expect(html).not.toMatch(/style="[^"]*position/);
  });

  test("ordinary math and the number-set macros still render", () => {
    const { html, error } = renderLatex("x \\in \\R, \\frac{a}{b}");
    expect(error).toBeNull();
    expect(html).toContain("katex");
    expect(html).toContain("mathbb");
  });

  test("runaway macro expansion is cut off instead of hanging", () => {
    const bomb = "\\def\\a{\\a\\a}\\a";
    const started = performance.now();
    renderLatex(bomb);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('math delimiters', () => {
  test('the opening and closing dollars respect whitespace, escapes and prices', () => {
    expect(readInlineMath('$x^2 -> y$', 0)?.latex).toBe('x^2 -> y');
    expect(readInlineMath(String.raw`$\text{\$5}$`, 0)?.latex).toBe(String.raw`\text{\$5}`);
    for (const text of ['$5 and $10', '$5$10', '$ a$', '$b $', '$$x$$']) {
      expect(readInlineMath(text, 0)).toBeNull();
    }
    expect(readInlineMath(String.raw`\$x$`, 1)).toBeNull();
  });

  test('the Markdown parser preserves source without treating it as HTML or inline markup', () => {
    const md = new MarkdownIt({ html: true }).use(addMathMarkdown).use(addMathMarkdown);
    const html = md.render('Inline $a < b & f_* "q"$ and `$x$`.\n\n$$\n  a + b\n  + c\n$$');
    expect(html).toContain('data-type="math-inline">a &lt; b &amp; f_* &quot;q&quot;</span>');
    expect(html).toContain('<code>$x$</code>');
    expect(html).toContain('data-type="math-block">  a + b\n  + c</div>');
  });

  test('a block formula in a quote keeps its line breaks and indentation', () => {
    const md = new MarkdownIt().use(addMathMarkdown);
    expect(md.render('> $$\n> f(x)\n>   + g(x)\n> $$\n\nAfter'))
      .toContain('data-type="math-block">f(x)\n  + g(x)</div>');
  });
});

describe('KaTeX rendering', () => {
  test('provides a short actionable error without echoing input', () => {
    expect(renderLatex(String.raw`\frac{a}`)).toEqual({ html: '', error: 'Missing }' });
    expect(renderLatex(String.raw`\somethingUnknown`)).toEqual({ html: '', error: 'Unknown LaTeX command' });
  });

  test('keeps macro definitions local to each formula', () => {
    expect(renderLatex(String.raw`\gdef\localMacro{x}\localMacro`).error).toBeNull();
    expect(renderLatex(String.raw`\localMacro`).error).toBe('Unknown LaTeX command');
  });
});
