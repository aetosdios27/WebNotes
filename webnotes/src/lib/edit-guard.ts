/**
 * Run an async operation and only forward its completion while `isCurrent()`
 * still reports true. A slow save must not close or mutate a newer editor after
 * the editor that started the save has unmounted.
 */
export async function whenCurrent<T>(
  run: () => Promise<T>,
  isCurrent: () => boolean,
  onSuccess: (value: T) => void,
  onError: (error: unknown) => void,
): Promise<void> {
  try {
    const value = await run();
    if (isCurrent()) onSuccess(value);
  } catch (error) {
    if (isCurrent()) onError(error);
  }
}
