import { describe, expect, test } from "bun:test";
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
