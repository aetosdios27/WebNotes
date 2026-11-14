export const taskCheckPath = "M4 8.5 7 11.5 12 5";
export function TaskCheck() {
  return (
    <svg className="task-check" viewBox="0 0 16 16" aria-hidden="true">
      <path d={taskCheckPath} pathLength="1" />
    </svg>
  );
}
