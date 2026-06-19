/**
 * Phase 1 — Firebase app initialization and shared Firestore instance
 *
 * "Plugs in" Firebase once when the app loads.
 * Other files should use patients.ts — not import Firestore directly.
 */
// ---------------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------------

// initializeApp = start the Firebase app with your project keys from .env.
import { initializeApp, type FirebaseApp } from "firebase/app";

// getFirestore = get the database handle for reading/writing documents.
import { getFirestore, type Firestore } from "firebase/firestore";

// Config and helpers baked in at build time from .env (see firebaseConfig.ts).
import {
  firebaseConfig, // the six keys (apiKey, projectId, …)
  firebaseSetupMessage, // human error if keys missing — shown in App banner
  getMissingFirebaseFields, // which keys are empty
  isFirebaseConfigured, // true only if all six keys present
} from "./firebaseConfig";

// FIREBASE_ENV_ALIASES = maps field names to possible env var names (VITE_* or apiKey style).
import { FIREBASE_ENV_ALIASES } from "./resolveFirebaseEnv";

// Re-export so App.tsx can show diagnostics without deep imports.
export {
  firebaseConfig,
  firebaseSetupMessage,
  getFirebaseEnvDiagnostics,
  isFirebaseConfigured,
} from "./firebaseConfig";

export { FIREBASE_CONFIG_FIELDS, FIREBASE_ENV_ALIASES } from "./resolveFirebaseEnv";

/**
 * List env var names to show in the "Firebase not configured" banner.
 */
export function getMissingFirebaseEnvKeys(): string[] {
  const missingFields = getMissingFirebaseFields();
  return missingFields.flatMap((field) => FIREBASE_ENV_ALIASES[field]);
}

// ---------------------------------------------------------------------------
// Connect once at module load (when this file is first imported)
// ---------------------------------------------------------------------------

// Only call initializeApp if all six config values were present at build time.
const app: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

// Shared Firestore instance — null when Firebase wasn't configured.
export const db: Firestore | null = app ? getFirestore(app) : null;

/**
 * Returns db or throws with a clear message — use before any Firestore call.
 */
export function requireDb(): Firestore {
  if (!db) {
    throw new Error(firebaseSetupMessage ?? "Firebase is not configured.");
  }
  return db;
}
