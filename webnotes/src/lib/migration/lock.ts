// Uploads and deletes share one lock so a delete in any tab waits for an upload in any tab.
export const UPLOAD_LOCK = "webnotes-upload";

export function withUploadLock<T>(run: () => Promise<T>): Promise<T> {
  return typeof navigator !== "undefined" && navigator.locks
    ? (navigator.locks.request(UPLOAD_LOCK, run) as Promise<T>)
    : run();
}
