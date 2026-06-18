const DEFAULT_TIMEOUT_MS = 15_000;

export const FIRESTORE_TIMEOUT_HINT =
  "Check that Vercel env vars use the VITE_FIREBASE_* names, API key HTTP referrers include https://*.vercel.app/*, and Firestore rules allow read/write.";

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
