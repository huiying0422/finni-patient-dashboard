import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  firebaseConfig,
  firebaseSetupMessage,
  getFirebaseEnvDiagnostics,
  getMissingFirebaseFields,
  isFirebaseConfigured,
} from "./firebaseConfig";
import { FIREBASE_ENV_ALIASES } from "./resolveFirebaseEnv";

export {
  firebaseConfig,
  firebaseSetupMessage,
  getFirebaseEnvDiagnostics,
  isFirebaseConfigured,
} from "./firebaseConfig";

export { FIREBASE_CONFIG_FIELDS, FIREBASE_ENV_ALIASES } from "./resolveFirebaseEnv";

/** Env keys that may supply each missing field (for error display). */
export function getMissingFirebaseEnvKeys(): string[] {
  return getMissingFirebaseFields().flatMap(
    (field) => FIREBASE_ENV_ALIASES[field],
  );
}

const app: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

/** Shared Firestore instance — null when Firebase env vars were not embedded at build time. */
export const db: Firestore | null = app ? getFirestore(app) : null;

/** Fail fast before Firestore calls that would otherwise retry indefinitely. */
export function requireDb(): Firestore {
  if (!db) {
    throw new Error(firebaseSetupMessage ?? "Firebase is not configured.");
  }
  return db;
}
