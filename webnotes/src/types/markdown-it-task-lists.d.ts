declare module "markdown-it-task-lists" {
  import type MarkdownIt from "markdown-it";
  const taskLists: (md: MarkdownIt, options?: { enabled?: boolean; label?: boolean }) => void;
  export default taskLists;
}
