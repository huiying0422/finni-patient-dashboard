import {
  FIREBASE_CONFIG_FIELDS,
  FIREBASE_ENV_ALIASES,
  type FirebaseConfigField,
  type ResolvedFirebaseConfig,
} from "./resolveFirebaseEnv";

declare global {
  const __FIREBASE_CONFIG__: ResolvedFirebaseConfig;
}

/** Firebase web config embedded at build time via vite.config.ts */
export const firebaseConfig: ResolvedFirebaseConfig = __FIREBASE_CONFIG__;

export type FirebaseEnvKeyStatus = "ok" | "empty" | "missing";

export type FirebaseEnvDiagnostic = {
  field: FirebaseConfigField;
  envKeys: readonly string[];
  status: FirebaseEnvKeyStatus;
};

function getFieldStatus(value: string | undefined): FirebaseEnvKeyStatus {
  if (value === undefined) return "missing";
  if (value === "") return "empty";
  return "ok";
}

/** Per-field build-time status (no secret values). */
export function getFirebaseEnvDiagnostics(): FirebaseEnvDiagnostic[] {
  return FIREBASE_CONFIG_FIELDS.map((field) => ({
    field,
    envKeys: FIREBASE_ENV_ALIASES[field],
    status: getFieldStatus(firebaseConfig[field]),
  }));
}

export function getMissingFirebaseFields(): FirebaseConfigField[] {
  return getFirebaseEnvDiagnostics()
    .filter((entry) => entry.status !== "ok")
    .map((entry) => entry.field);
}

export const isFirebaseConfigured = getMissingFirebaseFields().length === 0;

export const firebaseSetupMessage = isFirebaseConfigured
  ? null
  : "Firebase is not configured. Set all six Firebase values as env vars, then redeploy so Vite can embed them at build time.";

export { FIREBASE_CONFIG_FIELDS, FIREBASE_ENV_ALIASES };
