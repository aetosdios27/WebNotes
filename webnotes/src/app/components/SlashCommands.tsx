"use client";

import { ReactRenderer } from "@tiptap/react";
import tippy from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Type,
  Sigma,
  Divide,
  Grid3X3,
  Infinity,
  Brackets,
  Braces,
  ArrowRight,
  PlusCircle,
  Table,
} from "lucide-react";
import { mathTemplates } from "./extensions/math";

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: any) => void;
  keywords?: string[];
}

interface SlashCommandsProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export const SlashCommands = forwardRef((props: SlashCommandsProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden p-2 min-w-[280px] max-h-[400px] overflow-y-auto">
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <button
            key={index}
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
              index === selectedIndex
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
            }`}
          >
            <div className="flex-shrink-0 text-zinc-500">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.title}</div>
              <div className="text-xs text-zinc-600 truncate">
                {item.description}
              </div>
            </div>
          </button>
        ))
      ) : (
        <div className="text-sm text-zinc-500 px-3 py-2">No results</div>
      )}
    </div>
  );
});

SlashCommands.displayName = "SlashCommands";

export const slashCommandItems = (): CommandItem[] => [
  // ============================================
  // TEXT & HEADINGS
  // ============================================
  {
    title: "Text",
    description: "Just start writing with plain text",
    icon: <Type className="h-4 w-4" />,
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode("paragraph", "paragraph")
        .run();
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: <Heading1 className="h-4 w-4" />,
    keywords: ["h1", "heading1", "title"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    keywords: ["h2", "heading2", "subtitle"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-4 w-4" />,
    keywords: ["h3", "heading3", "subheading"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },

  // ============================================
  // LISTS
  // ============================================
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: <List className="h-4 w-4" />,
    keywords: ["ul", "list", "bullet", "unordered"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: <ListOrdered className="h-4 w-4" />,
    keywords: ["ol", "ordered", "numbered", "list"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Create a checklist with todos",
    icon: <CheckSquare className="h-4 w-4" />,
    keywords: ["todo", "task", "checkbox", "checklist", "check", "[]"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },

  // ============================================
  // BLOCKS
  // ============================================
  {
    title: "Quote",
    description: "Create a blockquote",
    icon: <Quote className="h-4 w-4" />,
    keywords: ["blockquote", "citation", "quote"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Create a code block",
    icon: <Code className="h-4 w-4" />,
    keywords: ["code", "codeblock", "snippet", "programming"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Insert a horizontal rule",
    icon: <Minus className="h-4 w-4" />,
    keywords: ["hr", "horizontal", "line", "separator", "divider"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },

  // ============================================
  // TABLES (Notion-style, no header by default)
  // ============================================
  {
    title: "Table",
    description: "Insert a 3×3 table",
    icon: <Table className="h-4 w-4" />,
    keywords: ["table", "grid", "rows", "columns", "spreadsheet", "data"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: false })
        .run();
    },
  },
  {
    title: "Table 2×2",
    description: "Insert a small 2×2 table",
    icon: <Grid3X3 className="h-4 w-4" />,
    keywords: ["table", "grid", "small", "2x2"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 2, cols: 2, withHeaderRow: false })
        .run();
    },
  },
  {
    title: "Table 4×4",
    description: "Insert a larger 4×4 table",
    icon: <Grid3X3 className="h-4 w-4" />,
    keywords: ["table", "grid", "large", "4x4"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 4, cols: 4, withHeaderRow: false })
        .run();
    },
  },

  // ============================================
  // MATH - BASIC
  // ============================================
  {
    title: "Math Inline",
    description: "Inline equation ($...$)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "latex", "equation", "formula", "inline", "$", "katex"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setMathInline("").run();
    },
  },
  {
    title: "Math Block",
    description: "Display equation ($$...$$)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "latex", "equation", "block", "display", "$$", "katex"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setMathBlock("").run();
    },
  },
  {
    title: "Fraction",
    description: "Insert a fraction (a/b)",
    icon: <Divide className="h-4 w-4" />,
    keywords: ["math", "fraction", "frac", "divide", "ratio"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.fraction)
        .run();
    },
  },
  {
    title: "Square Root",
    description: "Insert square root (√)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "sqrt", "root", "square"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.sqrt)
        .run();
    },
  },
  {
    title: "Subscript",
    description: "Insert subscript (xᵢ)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "subscript", "index", "sub"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.subscript)
        .run();
    },
  },
  {
    title: "Superscript",
    description: "Insert superscript (xⁿ)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "superscript", "power", "exponent", "sup"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.superscript)
        .run();
    },
  },
  {
    title: "Infinity",
    description: "Insert infinity (∞)",
    icon: <Infinity className="h-4 w-4" />,
    keywords: ["math", "infinity", "inf", "infinite"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.infinity)
        .run();
    },
  },
  {
    title: "Plus/Minus",
    description: "Insert plus-minus (±)",
    icon: <PlusCircle className="h-4 w-4" />,
    keywords: ["math", "plus", "minus", "pm", "plusminus"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.plusMinus)
        .run();
    },
  },

  // ============================================
  // MATH - CALCULUS
  // ============================================
  {
    title: "Sum",
    description: "Insert summation (Σ)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "sum", "sigma", "summation", "series"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.sum)
        .run();
    },
  },
  {
    title: "Product",
    description: "Insert product (Π)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "product", "pi", "prod", "multiply"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.product)
        .run();
    },
  },
  {
    title: "Integral",
    description: "Insert integral (∫)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "integral", "int", "calculus", "integration"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.integral)
        .run();
    },
  },
  {
    title: "Limit",
    description: "Insert limit (lim)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "limit", "lim", "calculus"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.limit)
        .run();
    },
  },
  {
    title: "Derivative",
    description: "Insert derivative (d/dx)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "derivative", "diff", "calculus", "dx"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.derivative)
        .run();
    },
  },
  {
    title: "Partial Derivative",
    description: "Insert partial derivative (∂)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "partial", "derivative", "multivariable"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.partial)
        .run();
    },
  },
  {
    title: "Gradient",
    description: "Insert gradient (∇)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "gradient", "nabla", "del", "vector"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.gradient)
        .run();
    },
  },

  // ============================================
  // MATH - LINEAR ALGEBRA
  // ============================================
  {
    title: "Matrix",
    description: "Insert 2×2 matrix",
    icon: <Grid3X3 className="h-4 w-4" />,
    keywords: ["math", "matrix", "array", "linear", "algebra"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.matrix)
        .run();
    },
  },
  {
    title: "Determinant",
    description: "Insert determinant |A|",
    icon: <Grid3X3 className="h-4 w-4" />,
    keywords: ["math", "determinant", "det", "matrix", "linear"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.determinant)
        .run();
    },
  },
  {
    title: "Vector",
    description: "Insert column vector",
    icon: <Brackets className="h-4 w-4" />,
    keywords: ["math", "vector", "column", "linear", "algebra"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.vector)
        .run();
    },
  },
  {
    title: "Norm",
    description: "Insert norm ||x||",
    icon: <Brackets className="h-4 w-4" />,
    keywords: ["math", "norm", "magnitude", "length", "absolute"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.norm)
        .run();
    },
  },

  // ============================================
  // MATH - STATISTICS
  // ============================================
  {
    title: "Expectation",
    description: "Expected value E[X]",
    icon: <Sigma className="h-4 w-4" />,
    keywords: [
      "math",
      "expectation",
      "expected",
      "mean",
      "average",
      "statistics",
    ],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.expectation)
        .run();
    },
  },
  {
    title: "Probability",
    description: "Probability P(X)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "probability", "prob", "statistics", "chance"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.probability)
        .run();
    },
  },
  {
    title: "Variance",
    description: "Variance Var(X)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "variance", "var", "statistics", "spread"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.variance)
        .run();
    },
  },
  {
    title: "Normal Distribution",
    description: "Normal distribution N(μ,σ²)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "normal", "gaussian", "distribution", "bell", "curve"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.normalDist)
        .run();
    },
  },

  // ============================================
  // MATH - MACHINE LEARNING
  // ============================================
  {
    title: "Hat",
    description: "Insert hat notation (ŷ)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "hat", "estimate", "prediction", "ml"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.hat)
        .run();
    },
  },
  {
    title: "Argmax",
    description: "Insert argmax",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "argmax", "maximum", "optimization", "ml"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.argmax)
        .run();
    },
  },
  {
    title: "Argmin",
    description: "Insert argmin",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "argmin", "minimum", "optimization", "ml"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.argmin)
        .run();
    },
  },
  {
    title: "Sigmoid",
    description: "Sigmoid function σ(x)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "sigmoid", "logistic", "activation", "neural", "ml"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.sigmoid)
        .run();
    },
  },
  {
    title: "Softmax",
    description: "Softmax function",
    icon: <Sigma className="h-4 w-4" />,
    keywords: [
      "math",
      "softmax",
      "activation",
      "classification",
      "neural",
      "ml",
    ],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.softmax)
        .run();
    },
  },

  // ============================================
  // MATH - SET THEORY
  // ============================================
  {
    title: "Element Of",
    description: "Element of set (x ∈ A)",
    icon: <Braces className="h-4 w-4" />,
    keywords: ["math", "element", "in", "member", "set", "belongs"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.elementOf)
        .run();
    },
  },
  {
    title: "Union",
    description: "Set union (A ∪ B)",
    icon: <Braces className="h-4 w-4" />,
    keywords: ["math", "union", "cup", "set", "or"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.union)
        .run();
    },
  },
  {
    title: "Intersection",
    description: "Set intersection (A ∩ B)",
    icon: <Braces className="h-4 w-4" />,
    keywords: ["math", "intersection", "cap", "set", "and"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.intersection)
        .run();
    },
  },
  {
    title: "Subset",
    description: "Subset (A ⊆ B)",
    icon: <Braces className="h-4 w-4" />,
    keywords: ["math", "subset", "contained", "set"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.subset)
        .run();
    },
  },

  // ============================================
  // MATH - LOGIC
  // ============================================
  {
    title: "For All",
    description: "Universal quantifier (∀)",
    icon: <ArrowRight className="h-4 w-4" />,
    keywords: ["math", "forall", "all", "universal", "quantifier", "logic"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.forall)
        .run();
    },
  },
  {
    title: "Exists",
    description: "Existential quantifier (∃)",
    icon: <ArrowRight className="h-4 w-4" />,
    keywords: ["math", "exists", "existential", "quantifier", "logic"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.exists)
        .run();
    },
  },
  {
    title: "Implies",
    description: "Logical implication (⇒)",
    icon: <ArrowRight className="h-4 w-4" />,
    keywords: ["math", "implies", "implication", "then", "logic", "arrow"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.implies)
        .run();
    },
  },
  {
    title: "If and Only If",
    description: "Biconditional (⇔)",
    icon: <ArrowRight className="h-4 w-4" />,
    keywords: ["math", "iff", "biconditional", "equivalent", "logic"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.iff)
        .run();
    },
  },

  // ============================================
  // MATH - COMBINATORICS
  // ============================================
  {
    title: "Binomial",
    description: "Binomial coefficient (n choose k)",
    icon: <Sigma className="h-4 w-4" />,
    keywords: ["math", "binomial", "choose", "combination", "combinatorics"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathInline(mathTemplates.binomial)
        .run();
    },
  },

  // ============================================
  // MATH - PIECEWISE
  // ============================================
  {
    title: "Cases",
    description: "Piecewise function",
    icon: <Braces className="h-4 w-4" />,
    keywords: ["math", "cases", "piecewise", "conditional", "if"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMathBlock(mathTemplates.cases)
        .run();
    },
  },
];

export const slashCommandSuggestion = {
  items: ({ query }: { query: string }) => {
    const items = slashCommandItems();

    if (!query) return items;

    const searchTerm = query.toLowerCase();

    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(searchTerm)
        )
      );
    });
  },

  render: () => {
    let component: ReactRenderer;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommands, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }

        return (component.ref as any)?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
