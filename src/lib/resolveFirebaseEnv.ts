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

/** Accepted env var names per Firebase field (first match wins). */
export const FIREBASE_ENV_ALIASES: Record<
  FirebaseConfigField,
  readonly string[]
> = {
  apiKey: ["VITE_FIREBASE_API_KEY", "apiKey"],
  authDomain: ["VITE_FIREBASE_AUTH_DOMAIN", "authDomain"],
  projectId: ["VITE_FIREBASE_PROJECT_ID", "projectId"],
  storageBucket: ["VITE_FIREBASE_STORAGE_BUCKET", "storageBucket"],
  messagingSenderId: [
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    // Common typos / alternate names:
    "VITE_FIREBASE_MESSAGING_SENDER",
    "VITE_MESSAGING_SENDER_ID",
    "messagingSenderId",
  ],
  appId: ["VITE_FIREBASE_APP_ID", "appId"],
};

function pickEnv(
  env: Record<string, string | undefined>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = env[key];
    if (value === undefined) continue;
    const trimmed = value.trim();
    if (trimmed !== "") return trimmed;
  }
  return "";
}

/** Resolve Firebase config from process env at build time. */
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

export type FirebaseEnvKeyStatus = "set" | "empty" | "unset";

/** Build-time audit — which env keys exist (no secret values). */
export function auditFirebaseEnvKeys(
  env: Record<string, string | undefined>,
): Record<string, FirebaseEnvKeyStatus> {
  const keys = new Set(
    FIREBASE_CONFIG_FIELDS.flatMap((field) => FIREBASE_ENV_ALIASES[field]),
  );
  return Object.fromEntries(
    [...keys].map((key) => {
      const value = env[key];
      const status: FirebaseEnvKeyStatus =
        value === undefined
          ? "unset"
          : value.trim() === ""
            ? "empty"
            : "set";
      return [key, status];
    }),
  );
}

/** Human-readable build error listing exact env names to set. */
export function formatMissingFirebaseEnvError(
  env: Record<string, string | undefined>,
): string {
  const config = resolveFirebaseEnv(env);
  const missing = FIREBASE_CONFIG_FIELDS.filter((field) => !config[field]);

  if (missing.length === 0) return "";

  const audit = auditFirebaseEnvKeys(env);
  const lines = missing.map((field) => {
    const keys = FIREBASE_ENV_ALIASES[field];
    const keyStatus = keys
      .map((key) => `${key}=${audit[key]}`)
      .join(", ");
    return `  • ${field}: set ${keys[0]} in .env (checked: ${keyStatus})`;
  });

  return (
    "Firebase env incomplete at build time. Add to .env before npm run build:\n" +
    lines.join("\n") +
    "\nThen run npm run deploy."
  );
}
