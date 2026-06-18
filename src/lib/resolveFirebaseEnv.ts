export const FIREBASE_CONFIG_FIELDS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

export type FirebaseConfigField = (typeof FIREBASE_CONFIG_FIELDS)[number];

export type ResolvedFirebaseConfig = Record<FirebaseConfigField, string>;

/** Maps each Firebase field to accepted env var names (VITE_* local, Firebase names on Vercel). */
export const FIREBASE_ENV_ALIASES: Record<
  FirebaseConfigField,
  readonly [string, string]
> = {
  apiKey: ["VITE_FIREBASE_API_KEY", "apiKey"],
  authDomain: ["VITE_FIREBASE_AUTH_DOMAIN", "authDomain"],
  projectId: ["VITE_FIREBASE_PROJECT_ID", "projectId"],
  storageBucket: ["VITE_FIREBASE_STORAGE_BUCKET", "storageBucket"],
  messagingSenderId: ["VITE_FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"],
  appId: ["VITE_FIREBASE_APP_ID", "appId"],
};

function pickEnv(
  env: Record<string, string | undefined>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = env[key];
    // Skip empty strings so a blank VITE_* var does not block a valid apiKey/projectId on Vercel.
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

/** Resolve Firebase config from process env at build time (supports both naming conventions). */
export function resolveFirebaseEnv(
  env: Record<string, string | undefined>,
): ResolvedFirebaseConfig {
  return {
    apiKey: pickEnv(env, FIREBASE_ENV_ALIASES.apiKey),
    authDomain: pickEnv(env, FIREBASE_ENV_ALIASES.authDomain),
    projectId: pickEnv(env, FIREBASE_ENV_ALIASES.projectId),
    storageBucket: pickEnv(env, FIREBASE_ENV_ALIASES.storageBucket),
    messagingSenderId: pickEnv(env, FIREBASE_ENV_ALIASES.messagingSenderId),
    appId: pickEnv(env, FIREBASE_ENV_ALIASES.appId),
  };
}
