// Capture HTML when a local edit happens, rather than reading the editor later:
// remote changes can arrive while a snapshot is waiting to be saved.
export function createContentSnapshot(
  save: (html: string) => void,
  delayMs = 1000,
) {
  let pending: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (pending === undefined) return;
    const html = pending;
    pending = undefined;
    save(html);
  };

  return {
    schedule(html: string) {
      pending = html;
      clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}
