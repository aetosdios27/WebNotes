// Ordered list of heuristics. Checked top to bottom.
// First match wins.

interface Heuristic {
  lang: string;
  patterns: RegExp[];
}

export const HEURISTICS: Heuristic[] = [
  // 1. Systems & Strongly Typed (Distinct syntax)
  {
    lang: "rust",
    patterns: [
      /fn\s+main\s*\(/,
      /let\s+mut\s/,
      /println!/,
      /pub\s+fn/,
      /#\[derive/,
      /impl\s+\w+/,
      /::new\(/,
    ],
  },
  {
    lang: "cpp",
    patterns: [
      /#include\s+<iostream>/,
      /#include\s+<vector>/,
      /std::/,
      /cout\s+<</,
      /cin\s+>>/,
      /int\s+main\s*\(\s*\)\s*{/,
      /::iterator/,
    ],
  },
  {
    lang: "c",
    patterns: [
      /#include\s+<stdio\.h>/,
      /#include\s+<stdlib\.h>/,
      /printf\s*\(/,
      /malloc\s*\(/,
      /char\s*\*/,
    ],
  },
  {
    lang: "go",
    patterns: [
      /package\s+main/,
      /func\s+main\s*\(/,
      /fmt\.Print/,
      /func\s+\(.*\)\s+\w+/,
      /if\s+err\s*!=\s*nil\s*{/,
    ],
  },
  {
    lang: "java",
    patterns: [
      /public\s+class/,
      /public\s+static\s+void\s+main/,
      /System\.out\.println/,
      /ArrayList<.*>/,
      /@Override/,
    ],
  },
  {
    lang: "csharp",
    patterns: [
      /using\s+System;/,
      /namespace\s+\w+/,
      /Console\.WriteLine/,
      /public\s+async\s+Task/,
    ],
  },

  // 2. Web & Scripting (Common overlapping syntax)
  {
    lang: "typescript",
    patterns: [
      /interface\s+\w+\s*{/,
      /type\s+\w+\s*=\s*/,
      /:\s*string/,
      /:\s*number/,
      /:\s*boolean/,
      /:\s*void/,
      /React\.FC</,
      /<[A-Z]\w+.*\/?>/, // JSX/TSX components
    ],
  },
  {
    lang: "python",
    patterns: [
      /def\s+\w+\s*\(.*\):\s*$/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
      /import\s+numpy/,
      /import\s+pandas/,
      /print\s*\(/, // Generic, but Python requires () in 3.x
      /elif\s+/,
      /for\s+\w+\s+in\s+/,
    ],
  },
  {
    lang: "php",
    patterns: [
      /<\?php/,
      /\$\w+/, // Variables start with $
      /echo\s+/,
      /->/, // Object operator
    ],
  },
  {
    lang: "ruby",
    patterns: [
      /def\s+\w+/,
      /end\s*$/,
      /puts\s+/,
      /require_relative/,
      /attr_accessor/,
    ],
  },

  // 3. Markup & Data
  {
    lang: "html",
    patterns: [
      /<!DOCTYPE\s+html>/i,
      /<html>/,
      /<body>/,
      /<div/,
      /<span/,
      /<a\s+href=/,
    ],
  },
  {
    lang: "json",
    patterns: [
      /^\s*{\s*"/, // Starts with { "
      /^\s*\[\s*"/, // Starts with [ "
      /":\s*"/, // "key": "value"
      /":\s*true/,
      /":\s*false/,
    ],
  },
  {
    lang: "yaml",
    patterns: [/^\w+:\s*\w+/, /^\s*-\s+\w+/, /^version:\s*['"]?[\d.]+['"]?/],
  },
  {
    lang: "sql",
    patterns: [
      /SELECT\s+.*\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+.*\s+SET/i,
      /DELETE\s+FROM/i,
      /CREATE\s+TABLE/i,
      /PRIMARY\s+KEY/i,
    ],
  },
  {
    lang: "graphql",
    patterns: [
      /type\s+\w+\s*{/,
      /query\s+\w+/,
      /mutation\s+\w+/,
      /fragment\s+\w+/,
    ],
  },
  {
    lang: "dockerfile",
    patterns: [
      /^FROM\s+\w+/,
      /^RUN\s+/,
      /^CMD\s+\[/,
      /^COPY\s+/,
      /^WORKDIR\s+/,
    ],
  },

  // 4. Shell (Check late, as many languages use shell-like words)
  {
    lang: "bash",
    patterns: [
      /^#!\/bin\/bash/,
      /echo\s+"/,
      /sudo\s+/,
      /npm\s+install/,
      /cargo\s+run/,
      /pip\s+install/,
      /git\s+commit/,
      /docker\s+run/,
    ],
  },

  // 5. JavaScript (Last fallback for C-style syntax)
  {
    lang: "javascript",
    patterns: [
      /const\s+/,
      /let\s+/,
      /function\s+/,
      /=>/,
      /console\.log/,
      /import\s+.*\s+from/,
      /export\s+default/,
    ],
  },
];

export function detectHeuristic(code: string): string | null {
  for (const { lang, patterns } of HEURISTICS) {
    if (patterns.some((p) => p.test(code))) return lang;
  }
  return null;
}
