const DEFAULT_TIMEOUT_MS = 15_000;

export const FIRESTORE_TIMEOUT_HINT =
  "Check Firestore rules allow read/write and that Firebase env vars are set before build.";

/** Prevent Firestore offline-queue hangs from leaving the UI stuck on Saving/Seeding. */
export function withFirestoreTimeout<T>(
  promise: Promise<T>,
  label: string,
  ms = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            `${label} timed out after ${ms / 1000}s. ${FIRESTORE_TIMEOUT_HINT}`,
          ),
        );
      }, ms);
    }),
  ]);
}
