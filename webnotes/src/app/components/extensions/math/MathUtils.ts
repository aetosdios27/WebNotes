import katex from 'katex';

// Notes arrive from paste, import and sync, so their LaTeX is untrusted input.
// `trust` stays off: it would let \href{javascript:...} and \htmlStyle run.
const katexOptions = {
  strict: false,
  trust: false,
  maxSize: 20,
  maxExpand: 500,
  macros: {
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\Q": "\\mathbb{Q}",
    "\\C": "\\mathbb{C}",
  },
} as const;

export function renderLatex(
  latex: string,
  displayMode = false,
): { html: string; error: string | null } {
  if (!latex.trim()) return { html: '', error: null };

  try {
    const html = katex.renderToString(latex, {
      ...katexOptions,
      // KaTeX can write definitions into the macros object during a render.
      macros: { ...katexOptions.macros },
      displayMode,
      throwOnError: true,
    });
    return { html, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (/expected ['"]\}['"]/i.test(message)) return { html: '', error: 'Missing }' };
    if (/undefined control sequence/i.test(message)) return { html: '', error: 'Unknown LaTeX command' };
    if (/unexpected end of input/i.test(message)) return { html: '', error: 'Incomplete formula' };
    return { html: '', error: 'Invalid LaTeX' };
  }
}

export const mathTemplates = {
  // ==================
  // BASIC
  // ==================
  fraction: '\\frac{a}{b}',
  subscript: 'x_{i}',
  superscript: 'x^{n}',
  sqrt: '\\sqrt{x}',
  infinity: '\\infty',
  plusMinus: '\\pm',

  // ==================
  // CALCULUS
  // ==================
  sum: '\\sum_{i=1}^{n} x_i',
  product: '\\prod_{i=1}^{n} x_i',
  integral: '\\int_{a}^{b} f(x) \\, dx',
  limit: '\\lim_{x \\to \\infty} f(x)',
  derivative: '\\frac{d}{dx} f(x)',
  partial: '\\frac{\\partial f}{\\partial x}',
  gradient: '\\nabla f',

  // ==================
  // LINEAR ALGEBRA
  // ==================
  matrix: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  determinant: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
  vector: '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}',
  norm: '\\|x\\|',

  // ==================
  // STATISTICS
  // ==================
  expectation: '\\mathbb{E}[X]',
  probability: 'P(X = x)',
  variance: '\\text{Var}(X)',
  normalDist: '\\mathcal{N}(\\mu, \\sigma^2)',

  // ==================
  // MACHINE LEARNING
  // ==================
  hat: '\\hat{y}',
  argmax: '\\arg\\max_{x} f(x)',
  argmin: '\\arg\\min_{x} f(x)',
  sigmoid: '\\sigma(x) = \\frac{1}{1 + e^{-x}}',
  softmax: '\\text{softmax}(x_i) = \\frac{e^{x_i}}{\\sum_{j} e^{x_j}}',

  // ==================
  // SET THEORY
  // ==================
  elementOf: 'x \\in A',
  union: 'A \\cup B',
  intersection: 'A \\cap B',
  subset: 'A \\subseteq B',

  // ==================
  // LOGIC
  // ==================
  forall: '\\forall x \\in X',
  exists: '\\exists x \\in X',
  implies: 'P \\Rightarrow Q',
  iff: 'P \\Leftrightarrow Q',

  // ==================
  // COMBINATORICS
  // ==================
  binomial: '\\binom{n}{k}',

  // ==================
  // PIECEWISE
  // ==================
  cases: '\\begin{cases} x & \\text{if } x > 0 \\\\ -x & \\text{otherwise} \\end{cases}',
};
