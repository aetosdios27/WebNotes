import type { Editor, Range } from "@tiptap/core";
import {
  CheckSquare,
  Code,
  Diff,
  Divide,
  Grid3X3,
  Heading1,
  Heading2,
  Heading3,
  Infinity as InfinityIcon,
  Brackets,
  List,
  ListOrdered,
  Minus,
  Pi,
  Quote,
  Radical,
  Sigma,
  SquareFunction,
  Subscript,
  Superscript,
  Table,
  Type,
  type LucideIcon,
} from "lucide-react";
import { mathTemplates } from "./extensions/math";

export const commandGroups = ["Basic blocks", "Lists", "Insert", "Math"] as const;

type CommandGroup = (typeof commandGroups)[number];
export type CommandContext = { editor: Editor; range: Range };

export type SlashCommandItem = {
  id: string;
  title: string;
  group: CommandGroup;
  icon: LucideIcon;
  keywords: readonly string[];
  shortcut?: string;
  symbol?: string;
  searchOnly?: boolean;
  run: (context: CommandContext) => void;
};

function replaceTrigger({ editor, range }: CommandContext) {
  return editor.chain().focus().deleteRange(range);
}

function mathTemplate(
  template: keyof typeof mathTemplates,
  title: string,
  { icon = SquareFunction, keywords, symbol, block = false }: {
    icon?: LucideIcon;
    keywords: readonly string[];
    symbol?: string;
    block?: boolean;
  },
): SlashCommandItem {
  const latex = mathTemplates[template];
  return {
    id: template,
    title,
    group: "Math",
    icon,
    keywords,
    symbol,
    searchOnly: true,
    run(context) {
      const chain = replaceTrigger(context);
      if (block) chain.setMathBlock(latex).run();
      else chain.setMathInline(latex).run();
    },
  };
}

const commands: readonly SlashCommandItem[] = [
  {
    id: "text",
    title: "Text",
    group: "Basic blocks",
    icon: Type,
    keywords: ["paragraph", "plain"],
    run(context) {
      replaceTrigger(context).setNode("paragraph").run();
    },
  },
  {
    id: "heading-1",
    title: "Heading 1",
    group: "Basic blocks",
    icon: Heading1,
    keywords: ["h1", "heading1", "title"],
    shortcut: "#",
    run(context) {
      replaceTrigger(context).setNode("heading", { level: 1 }).run();
    },
  },
  {
    id: "heading-2",
    title: "Heading 2",
    group: "Basic blocks",
    icon: Heading2,
    keywords: ["h2", "heading2", "subtitle"],
    shortcut: "##",
    run(context) {
      replaceTrigger(context).setNode("heading", { level: 2 }).run();
    },
  },
  {
    id: "heading-3",
    title: "Heading 3",
    group: "Basic blocks",
    icon: Heading3,
    keywords: ["h3", "heading3", "subheading"],
    shortcut: "###",
    run(context) {
      replaceTrigger(context).setNode("heading", { level: 3 }).run();
    },
  },
  {
    id: "quote",
    title: "Quote",
    group: "Basic blocks",
    icon: Quote,
    keywords: ["blockquote", "citation", "quote"],
    shortcut: ">",
    run(context) {
      replaceTrigger(context).toggleBlockquote().run();
    },
  },
  {
    id: "code-block",
    title: "Code block",
    group: "Basic blocks",
    icon: Code,
    keywords: ["code", "codeblock", "snippet", "programming"],
    shortcut: "```",
    run(context) {
      replaceTrigger(context).insertContent({ type: "codeBlock", attrs: { language: "text" } }).run();
    },
  },
  {
    id: "bullet-list",
    title: "Bullet list",
    group: "Lists",
    icon: List,
    keywords: ["ul", "list", "bullet", "unordered"],
    shortcut: "-",
    run(context) {
      replaceTrigger(context).toggleBulletList().run();
    },
  },
  {
    id: "numbered-list",
    title: "Numbered list",
    group: "Lists",
    icon: ListOrdered,
    keywords: ["ol", "ordered", "numbered", "list"],
    shortcut: "1.",
    run(context) {
      replaceTrigger(context).toggleOrderedList().run();
    },
  },
  {
    id: "task-list",
    title: "Task list",
    group: "Lists",
    icon: CheckSquare,
    keywords: ["todo", "task", "checkbox", "checklist", "check", "[]"],
    shortcut: "[]",
    run(context) {
      replaceTrigger(context).toggleTaskList().run();
    },
  },
  {
    id: "divider",
    title: "Divider",
    group: "Insert",
    icon: Minus,
    keywords: ["hr", "horizontal", "line", "separator", "divider"],
    shortcut: "---",
    run(context) {
      replaceTrigger(context).setHorizontalRule().run();
    },
  },
  {
    id: "table",
    title: "Table",
    group: "Insert",
    icon: Table,
    keywords: ["table", "grid", "rows", "columns", "spreadsheet", "data"],
    run(context) {
      replaceTrigger(context).insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
    },
  },
  {
    id: "table-2x2",
    title: "Table 2×2",
    group: "Insert",
    icon: Table,
    keywords: ["table", "grid", "small", "2x2"],
    searchOnly: true,
    run(context) {
      replaceTrigger(context).insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
    },
  },
  {
    id: "table-4x4",
    title: "Table 4×4",
    group: "Insert",
    icon: Table,
    keywords: ["table", "grid", "large", "4x4"],
    searchOnly: true,
    run(context) {
      replaceTrigger(context).insertTable({ rows: 4, cols: 4, withHeaderRow: false }).run();
    },
  },
  {
    id: "inline-math",
    title: "Inline math",
    group: "Math",
    icon: Sigma,
    keywords: ["math", "latex", "equation", "formula", "inline", "$", "katex"],
    shortcut: "$",
    run(context) {
      replaceTrigger(context).setMathInline("").run();
    },
  },
  {
    id: "math-block",
    title: "Math block",
    group: "Math",
    icon: Sigma,
    keywords: ["math", "latex", "equation", "block", "display", "$$", "katex"],
    shortcut: "$$",
    run(context) {
      replaceTrigger(context).setMathBlock("").run();
    },
  },
  mathTemplate("fraction", "Fraction", {
    icon: Divide,
    keywords: ["math", "fraction", "frac", "divide", "ratio"],
    symbol: "a⁄b",
  }),
  mathTemplate("sqrt", "Square root", {
    icon: Radical,
    keywords: ["math", "sqrt", "root", "square"],
    symbol: "√",
  }),
  mathTemplate("subscript", "Subscript", {
    icon: Subscript,
    keywords: ["math", "subscript", "index", "sub"],
    symbol: "xᵢ",
  }),
  mathTemplate("superscript", "Superscript", {
    icon: Superscript,
    keywords: ["math", "superscript", "power", "exponent", "sup"],
    symbol: "xⁿ",
  }),
  mathTemplate("infinity", "Infinity", {
    icon: InfinityIcon,
    keywords: ["math", "infinity", "inf", "infinite"],
    symbol: "∞",
  }),
  mathTemplate("plusMinus", "Plus/minus", {
    icon: Diff,
    keywords: ["math", "plus", "minus", "pm", "plusminus"],
    symbol: "±",
  }),
  mathTemplate("sum", "Sum", {
    icon: Sigma,
    keywords: ["math", "sum", "sigma", "summation", "series"],
    symbol: "∑",
    block: true,
  }),
  mathTemplate("product", "Product", {
    icon: Pi,
    keywords: ["math", "product", "pi", "prod", "multiply"],
    symbol: "∏",
    block: true,
  }),
  mathTemplate("integral", "Integral", {
    keywords: ["math", "integral", "int", "calculus", "integration"],
    symbol: "∫",
    block: true,
  }),
  mathTemplate("limit", "Limit", {
    keywords: ["math", "limit", "lim", "calculus"],
    symbol: "lim",
    block: true,
  }),
  mathTemplate("derivative", "Derivative", {
    keywords: ["math", "derivative", "diff", "calculus", "dx"],
    symbol: "d/dx",
  }),
  mathTemplate("partial", "Partial derivative", {
    keywords: ["math", "partial", "derivative", "multivariable"],
    symbol: "∂",
  }),
  mathTemplate("gradient", "Gradient", {
    keywords: ["math", "gradient", "nabla", "del", "vector"],
    symbol: "∇",
  }),
  mathTemplate("matrix", "Matrix", {
    icon: Grid3X3,
    keywords: ["math", "matrix", "array", "linear", "algebra"],
    block: true,
  }),
  mathTemplate("determinant", "Determinant", {
    icon: Grid3X3,
    keywords: ["math", "determinant", "det", "matrix", "linear"],
    symbol: "|A|",
    block: true,
  }),
  mathTemplate("vector", "Vector", {
    icon: Brackets,
    keywords: ["math", "vector", "column", "linear", "algebra"],
  }),
  mathTemplate("norm", "Norm", {
    icon: Brackets,
    keywords: ["math", "norm", "magnitude", "length", "absolute"],
    symbol: "‖x‖",
  }),
  mathTemplate("expectation", "Expectation", {
    keywords: ["math", "expectation", "expected", "mean", "average", "statistics"],
    symbol: "E[X]",
  }),
  mathTemplate("probability", "Probability", {
    keywords: ["math", "probability", "prob", "statistics", "chance"],
    symbol: "P(X)",
  }),
  mathTemplate("variance", "Variance", {
    keywords: ["math", "variance", "var", "statistics", "spread"],
    symbol: "Var(X)",
  }),
  mathTemplate("normalDist", "Normal distribution", {
    keywords: ["math", "normal", "gaussian", "distribution", "bell", "curve"],
    symbol: "N(μ, σ²)",
  }),
  mathTemplate("hat", "Hat", {
    keywords: ["math", "hat", "estimate", "prediction", "ml"],
    symbol: "ŷ",
  }),
  mathTemplate("argmax", "Argmax", {
    keywords: ["math", "argmax", "maximum", "optimization", "ml"],
  }),
  mathTemplate("argmin", "Argmin", {
    keywords: ["math", "argmin", "minimum", "optimization", "ml"],
  }),
  mathTemplate("sigmoid", "Sigmoid", {
    keywords: ["math", "sigmoid", "logistic", "activation", "neural", "ml"],
    symbol: "x",
    block: true,
  }),
  mathTemplate("softmax", "Softmax", {
    keywords: ["math", "softmax", "activation", "classification", "neural", "ml"],
    block: true,
  }),
  mathTemplate("elementOf", "Element of", {
    keywords: ["math", "element", "in", "member", "set", "belongs"],
    symbol: "∈",
  }),
  mathTemplate("union", "Union", {
    keywords: ["math", "union", "cup", "set", "or"],
    symbol: "∪",
  }),
  mathTemplate("intersection", "Intersection", {
    keywords: ["math", "intersection", "cap", "set", "and"],
    symbol: "∩",
  }),
  mathTemplate("subset", "Subset", {
    keywords: ["math", "subset", "contained", "set"],
    symbol: "⊆",
  }),
  mathTemplate("forall", "For all", {
    keywords: ["math", "forall", "all", "universal", "quantifier", "logic"],
    symbol: "∀",
  }),
  mathTemplate("exists", "Exists", {
    keywords: ["math", "exists", "existential", "quantifier", "logic"],
    symbol: "∃",
  }),
  mathTemplate("implies", "Implies", {
    keywords: ["math", "implies", "implication", "then", "logic", "arrow"],
    symbol: "⇒",
  }),
  mathTemplate("iff", "If and only if", {
    keywords: ["math", "iff", "biconditional", "equivalent", "logic"],
    symbol: "⇔",
  }),
  mathTemplate("binomial", "Binomial", {
    keywords: ["math", "binomial", "choose", "combination", "combinatorics"],
    symbol: "n choose k",
  }),
  mathTemplate("cases", "Cases", {
    keywords: ["math", "cases", "piecewise", "conditional", "if"],
    block: true,
  }),
];

const defaultCommands = commands.filter((item) => !item.searchOnly);
const searchIndex = commands.map((item) => {
  const title = item.title.toLowerCase();
  const wordStarts = Array.from(title.matchAll(/[\s/-]+/g), (match) =>
    title.slice(match.index + match[0].length),
  );
  return { item, title, wordStarts };
});

function searchRank(entry: (typeof searchIndex)[number], term: string) {
  if (entry.title.startsWith(term)) return 0;
  if (entry.wordStarts.some((suffix) => suffix.startsWith(term))) return 1;
  if (entry.item.keywords.some((keyword) => keyword.startsWith(term)) ||
      entry.item.shortcut?.startsWith(term)) return 2;
  if (entry.title.includes(term)) return 3;
  return Infinity;
}

export function findSlashCommands(query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return defaultCommands;

  return searchIndex
    .map((entry) => ({ item: entry.item, rank: searchRank(entry, term) }))
    .filter(({ rank }) => rank < Infinity)
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}
