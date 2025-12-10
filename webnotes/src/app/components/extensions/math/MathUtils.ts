import katex from 'katex';

// Render LaTeX safely
export function renderLatex(
  latex: string,
  displayMode: boolean = false
): { html: string; error: string | null } {
  if (!latex.trim()) {
    return { html: '', error: null };
  }

  try {
    const html = katex.renderToString(latex, {
      throwOnError: true,
      displayMode,
      strict: false,
      trust: true,
      macros: {
        "\\R": "\\mathbb{R}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}",
        "\\Q": "\\mathbb{Q}",
        "\\C": "\\mathbb{C}",
      },
    });
    return { html, error: null };
  } catch (e: any) {
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
        strict: false,
      });
      return { html, error: e.message || 'Invalid LaTeX' };
    } catch {
      return { html: `<span class="math-error">${escapeHtml(latex)}</span>`, error: e.message };
    }
  }
}

// Escape HTML for safe display
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// MATH TEMPLATES - 100% Coverage
// ============================================

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

// ============================================
// TYPING SHORTCUTS
// ============================================

export const mathShortcuts: Record<string, string> = {
  // Fractions & Powers
  '//': '\\frac{}{}',

  // Comparisons
  '>=': '\\geq',
  '<=': '\\leq',
  '!=': '\\neq',
  '==': '\\equiv',
  '~=': '\\approx',

  // Arrows
  '->': '\\rightarrow',
  '<-': '\\leftarrow',
  '<->': '\\leftrightarrow',
  '=>': '\\Rightarrow',
  '<=>': '\\Leftrightarrow',

  // Dots
  '...': '\\ldots',

  // Common
  'inf': '\\infty',
  'xx': '\\times',
  '**': '\\cdot',
  '+-': '\\pm',

  // Operators
  'sum': '\\sum',
  'prod': '\\prod',
  'int': '\\int',
  'lim': '\\lim',
  'sqrt': '\\sqrt{}',

  // Greek lowercase
  'alpha': '\\alpha',
  'beta': '\\beta',
  'gamma': '\\gamma',
  'delta': '\\delta',
  'eps': '\\epsilon',
  'zeta': '\\zeta',
  'eta': '\\eta',
  'theta': '\\theta',
  'iota': '\\iota',
  'kappa': '\\kappa',
  'lambda': '\\lambda',
  'mu': '\\mu',
  'nu': '\\nu',
  'xi': '\\xi',
  'pi': '\\pi',
  'rho': '\\rho',
  'sigma': '\\sigma',
  'tau': '\\tau',
  'phi': '\\phi',
  'chi': '\\chi',
  'psi': '\\psi',
  'omega': '\\omega',

  // Greek uppercase
  'Gamma': '\\Gamma',
  'Delta': '\\Delta',
  'Theta': '\\Theta',
  'Lambda': '\\Lambda',
  'Pi': '\\Pi',
  'Sigma': '\\Sigma',
  'Phi': '\\Phi',
  'Psi': '\\Psi',
  'Omega': '\\Omega',

  // Calculus
  'nabla': '\\nabla',
  'partial': '\\partial',

  // Set theory
  'forall': '\\forall',
  'exists': '\\exists',
  'in': '\\in',
  'notin': '\\notin',
  'subset': '\\subset',
  'subseteq': '\\subseteq',
  'cup': '\\cup',
  'cap': '\\cap',
  'empty': '\\emptyset',

  // Number sets
  'RR': '\\mathbb{R}',
  'NN': '\\mathbb{N}',
  'ZZ': '\\mathbb{Z}',
  'QQ': '\\mathbb{Q}',
  'CC': '\\mathbb{C}',
};

// Apply shortcuts to input
export function applyMathShortcuts(input: string): string {
  let result = input;

  const sortedShortcuts = Object.entries(mathShortcuts)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [shortcut, replacement] of sortedShortcuts) {
    const regex = new RegExp(`${escapeRegex(shortcut)}(?=\\s|$|[{}\\[\\]()^_])`, 'g');
    result = result.replace(regex, replacement);
  }

  return result;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}