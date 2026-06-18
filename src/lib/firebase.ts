import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

/** Env keys missing from the build (common when Vercel vars are unset or deploy wasn't rerun). */
export function getMissingFirebaseEnvKeys(): string[] {
  return REQUIRED_ENV_KEYS.filter((key) => !import.meta.env[key]);
}

export const isFirebaseConfigured = getMissingFirebaseEnvKeys().length === 0;

export const firebaseSetupMessage = isFirebaseConfigured
  ? null
  : `Firebase is not configured. Missing environment variable(s): ${getMissingFirebaseEnvKeys().join(", ")}. ` +
    "On Vercel, add all VITE_FIREBASE_* values under Project Settings → Environment Variables, then redeploy so Vite can embed them at build time.";

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
