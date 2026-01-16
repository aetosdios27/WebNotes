// Fixes Windows Drag-and-Drop 'Red Cross' issue
export function applyWindowDragFix() {
  if (typeof window === "undefined") return;

  // Prevent default behavior for dragover/drop on the entire document
  // This tells the OS "We handle drops, don't show the forbidden sign"
  window.addEventListener(
    "dragover",
    (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    },
    false
  );

  window.addEventListener(
    "drop",
    (e) => {
      // Only prevent if we haven't handled it in React
      // But generally, preventing default at window level is safe for SPA
      e.preventDefault();
    },
    false
  );
}
