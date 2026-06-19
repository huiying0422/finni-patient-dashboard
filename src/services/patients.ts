/**
 * Phase 1 — Firestore service layer (live list added in Phase 5)
 *
 * This is the ONLY file that should talk to the patients collection in Firestore.
 * Think of it as the "librarian" — everyone else asks the librarian, not the shelves directly.
 */
// ---------------------------------------------------------------------------
// FIRESTORE IMPORTS — each function does one database job
// ---------------------------------------------------------------------------
import {
  addDoc, // create a brand-new document and auto-generate its id
  collection, // point at a folder (collection) like "patients"
  deleteDoc, // permanently remove one document
  doc, // point at one specific document by id
  onSnapshot, // live listener — calls you back whenever data changes
  serverTimestamp, // ask Firebase server for "now" (user can't fake the clock)
  updateDoc, // change fields on an existing document
  type FirestoreError, // TypeScript type for Firebase error objects
  type Unsubscribe, // type of the function that stops onSnapshot
} from "firebase/firestore";

// Placeholder user id written into lastEditedBy until real login exists.
import { PLACEHOLDER_EDITOR_ID } from "@/lib/constants";

// requireDb = get database or throw; firebaseSetupMessage = human error if .env missing.
import { firebaseSetupMessage, requireDb } from "@/lib/firebase";

// withFirestoreTimeout = give up after 15s if a write hangs (production safety).
import { withFirestoreTimeout } from "@/lib/firestoreTimeout";

// sortPatientsByCreatedAt = newest patients first (Firestore query avoided for simplicity).
import { sortPatientsByCreatedAt } from "@/lib/sortPatients";

// patientFormSchema = same Zod rules as the form; Patient types for TypeScript.
import {
  patientFormSchema,
  type Patient,
  type PatientFormValues,
} from "@/lib/types";

/** The folder name in Firestore where all patient documents live. */
const PATIENTS_COLLECTION = "patients";

/**
 * Turns scary Firebase error codes into plain English for the user.
 * We never put patient names or clinical text in these messages.
 */
function formatFirestoreError(error: FirestoreError): string {
  // Case 1: security rules said "no" — most common in demo when Console rules are still deny-all.
  if (error.code === "permission-denied") {
    return (
      "Firestore permission denied. In Firebase Console → Firestore → Rules, use open dev rules " +
      "(allow read, write: if true) for this demo, then publish rules."
    );
  }

  // Case 2: network or Firebase outage.
  if (error.code === "unavailable") {
    return "Firestore is unavailable. Check your network connection and try again.";
  }

  // Case 3: anything else — use Firebase's message or a generic fallback.
  return error.message || "Failed to load patients";
}

/**
 * Firestore refuses to save fields whose value is `undefined`.
 * Empty optional fields (middle name, apt/unit) become undefined after Zod — we strip them here.
 *
 * Works like cleaning out empty slots before putting papers in a folder.
 */
function omitUndefined<T>(value: T): T {
  // If the whole value is undefined, return as-is (caller may be walking a tree).
  if (value === undefined) {
    return value;
  }

  // If it's an array, clean each item inside the array the same way.
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefined(item)) as T;
  }

  // If it's a plain object (like address or the whole patient), drop keys with undefined values.
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined) // keep only real values
        .map(([key, entryValue]) => [key, omitUndefined(entryValue)]), // recurse into nested objects
    ) as T;
  }

  // Primitives (string, number, etc.) — return unchanged.
  return value;
}

/**
 * Wraps raw Firestore document data with our typed Patient shape (adds id).
 */
function toPatient(id: string, data: Record<string, unknown>): Patient {
  // Spread copies every field from Firestore; id is the document key.
  return { id, ...data } as Patient;
}

/**
 * Starts listening to the patients collection and calls you back whenever it changes.
 * Returns an "unsubscribe" function — call it when the component goes away (see usePatients).
 */
export function subscribePatients(
  onPatients: (patients: Patient[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  // Step 1: Guard — if Firebase was never configured at build, fail immediately.
  if (firebaseSetupMessage) {
    onError(new Error(firebaseSetupMessage));
    // Return a no-op unsubscribe so callers don't crash when they call cleanup.
    return () => {};
  }

  // Step 2: Get a live database connection (throws if config missing).
  const firestore = requireDb();

  // Step 3: Point at the "patients" collection — like opening that drawer in the filing cabinet.
  const patientsCollection = collection(firestore, PATIENTS_COLLECTION);

  // Step 4: onSnapshot = "tell me whenever anything in this collection changes."
  return onSnapshot(
    patientsCollection,
    (snapshot) => {
      // SUCCESS callback — snapshot.docs = array of every patient document right now.
      const patients = sortPatientsByCreatedAt(
        snapshot.docs.map((docSnap) => {
          // Each doc has an id (Firestore key) and data (the fields we saved).
          return toPatient(docSnap.id, docSnap.data());
        }),
      );

      // Hand the sorted list to React (usePatients → PatientList).
      onPatients(patients);
    },
    (err) => {
      // ERROR callback — listener failed (rules, network, etc.).
      onError(new Error(formatFirestoreError(err)));
    },
  );
}

/**
 * Creates a brand-new patient document in Firestore.
 * @returns The new document's id (Firestore assigns this automatically).
 */
export async function addPatient(values: PatientFormValues): Promise<string> {
  // Step 1: run the same Zod checks the form ran — don't trust the browser alone.
  const validated = patientFormSchema.parse(values);

  // Step 2: remove undefined optional fields so Firestore accepts the payload.
  const firestoreData = omitUndefined(validated);

  // Step 3: write to Firestore, but give up after 15s if it hangs (withFirestoreTimeout).
  const docRef = await withFirestoreTimeout(
    addDoc(collection(requireDb(), PATIENTS_COLLECTION), {
      ...firestoreData, // everything the user typed
      createdAt: serverTimestamp(), // server clock — user can't fake this
      updatedAt: serverTimestamp(),
      lastEditedBy: PLACEHOLDER_EDITOR_ID, // until real login exists
    }),
    "Save patient",
  );

  // Step 4: tell the caller the new id so UI can highlight or link if needed.
  return docRef.id;
}

/**
 * Updates an existing patient document (edit flow in the detail sheet).
 */
export async function updatePatient(
  id: string,
  values: PatientFormValues,
): Promise<void> {
  // Step 1: validate again at the service layer.
  const validated = patientFormSchema.parse(values);

  // Step 2: strip undefined optional fields.
  const firestoreData = omitUndefined(validated);

  // Step 3: patch the document with this id — updateDoc only changes listed fields.
  await withFirestoreTimeout(
    updateDoc(doc(requireDb(), PATIENTS_COLLECTION, id), {
      ...firestoreData,
      updatedAt: serverTimestamp(), // bump "last changed" time
      lastEditedBy: PLACEHOLDER_EDITOR_ID,
    }),
    "Update patient",
  );
}

/**
 * Permanently removes one patient document. No undo — that's why the UI asks "Are you sure?"
 */
export async function deletePatient(id: string): Promise<void> {
  await withFirestoreTimeout(
    deleteDoc(doc(requireDb(), PATIENTS_COLLECTION, id)),
    "Delete patient",
  );
}
