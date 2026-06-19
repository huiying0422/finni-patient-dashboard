/**
 * One-time backfill for legacy Firestore patients created before gender / clinical fields.
 *
 * Usage:
 *   npm run backfill:patients:dry-run   # preview changes only
 *   npm run backfill:patients           # write to Firestore
 *
 * Requires .env with all six VITE_FIREBASE_* keys (same as local dev).
 * Firestore rules must allow writes (open dev rules in Firebase Console).
 */
import { loadEnv } from "vite";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { resolveFirebaseEnv } from "../src/lib/resolveFirebaseEnv";
import { PATIENT_GENDER_VALUES } from "../src/lib/types";

const PATIENTS_COLLECTION = "patients";
const MIGRATION_EDITOR_ID = "migration-backfill@finni.local";
const CLINICAL_PLACEHOLDER = "N/A";

const dryRun = process.argv.includes("--dry-run");

type BackfillPatch = {
  gender?: (typeof PATIENT_GENDER_VALUES)[number];
  healthHistory?: string;
  medicationHistory?: string;
  updatedAt: ReturnType<typeof serverTimestamp>;
  lastEditedBy: string;
};

function randomGender(): (typeof PATIENT_GENDER_VALUES)[number] {
  const index = Math.floor(Math.random() * PATIENT_GENDER_VALUES.length);
  return PATIENT_GENDER_VALUES[index];
}

function isValidGender(
  value: unknown,
): value is (typeof PATIENT_GENDER_VALUES)[number] {
  return (
    typeof value === "string" &&
    (PATIENT_GENDER_VALUES as readonly string[]).includes(value)
  );
}

function isMissingClinical(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
}

function buildPatch(data: Record<string, unknown>): BackfillPatch | null {
  const patch: BackfillPatch = {
    updatedAt: serverTimestamp(),
    lastEditedBy: MIGRATION_EDITOR_ID,
  };
  let hasChanges = false;

  if (!isValidGender(data.gender)) {
    patch.gender = randomGender();
    hasChanges = true;
  }

  if (isMissingClinical(data.healthHistory)) {
    patch.healthHistory = CLINICAL_PLACEHOLDER;
    hasChanges = true;
  }

  if (isMissingClinical(data.medicationHistory)) {
    patch.medicationHistory = CLINICAL_PLACEHOLDER;
    hasChanges = true;
  }

  return hasChanges ? patch : null;
}

async function main() {
  const env = { ...loadEnv("development", process.cwd(), ""), ...process.env };
  const firebaseConfig = resolveFirebaseEnv(env);

  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Firebase env incomplete. Set in .env: ${missing.join(", ")}`,
    );
  }

  console.log(
    dryRun
      ? `[dry-run] Scanning ${firebaseConfig.projectId} / ${PATIENTS_COLLECTION}…`
      : `[live] Backfilling ${firebaseConfig.projectId} / ${PATIENTS_COLLECTION}…`,
  );

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const snapshot = await getDocs(collection(db, PATIENTS_COLLECTION));

  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const patch = buildPatch(data);

    if (!patch) {
      skipped++;
      continue;
    }

    const { updatedAt: _ts, ...logPatch } = patch;

    if (dryRun) {
      console.log(`  [dry-run] ${docSnap.id}:`, logPatch);
    } else {
      await updateDoc(doc(db, PATIENTS_COLLECTION, docSnap.id), patch);
      console.log(`  updated ${docSnap.id}:`, logPatch);
    }

    updated++;
  }

  console.log(
    `\nDone. ${updated} patient(s) ${dryRun ? "would be" : "were"} updated; ${skipped} already complete (total ${snapshot.size}).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
