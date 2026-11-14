// Local edits mark the snapshot dirty; serialize the latest body only when saving.
export function createContentSnapshot(
  read: () => string | undefined,
  save: (html: string) => void,
  delayMs = 1000,
) {
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!dirty) return;
    dirty = false;
    const html = read();
    if (html !== undefined) save(html);
  };

  return {
    schedule() {
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}
