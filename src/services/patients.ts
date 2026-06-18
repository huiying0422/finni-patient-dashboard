/**
 * Firestore service layer — the only module that reads from or writes to the
 * patients collection. Components and hooks call these functions instead of
 * importing Firebase directly, keeping data access in one place.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";

import { PLACEHOLDER_EDITOR_ID } from "@/lib/constants";
import { firebaseSetupMessage, requireDb } from "@/lib/firebase";
import { withFirestoreTimeout } from "@/lib/firestoreTimeout";
import { sortPatientsByCreatedAt } from "@/lib/sortPatients";
import {
  patientFormSchema,
  type Patient,
  type PatientFormValues,
} from "@/lib/types";

const PATIENTS_COLLECTION = "patients";

function formatFirestoreError(error: FirestoreError): string {
  if (error.code === "permission-denied") {
    return (
      "Firestore permission denied. In Firebase Console → Firestore → Rules, use open dev rules " +
      "(allow read, write: if true) for this demo, then publish rules."
    );
  }
  if (error.code === "unavailable") {
    return "Firestore is unavailable. Check your network connection and try again.";
  }
  return error.message || "Failed to load patients";
}

/** Firestore rejects undefined field values — omit them before write. */
function omitUndefined<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => omitUndefined(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, omitUndefined(entryValue)]),
    ) as T;
  }

  return value;
}

/** Map a Firestore document snapshot to a typed Patient. */
function toPatient(id: string, data: Record<string, unknown>): Patient {
  return { id, ...data } as Patient;
}

/** Subscribe to live patient list updates; returns an unsubscribe function. */
export function subscribePatients(
  onPatients: (patients: Patient[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (firebaseSetupMessage) {
    onError(new Error(firebaseSetupMessage));
    return () => {};
  }

  const firestore = requireDb();
  // No orderBy — documents missing createdAt are still returned; we sort client-side.
  const patientsCollection = collection(firestore, PATIENTS_COLLECTION);

  return onSnapshot(
    patientsCollection,
    (snapshot) => {
      const patients = sortPatientsByCreatedAt(
        snapshot.docs.map((docSnap) => toPatient(docSnap.id, docSnap.data())),
      );
      onPatients(patients);
    },
    (err) => {
      onError(new Error(formatFirestoreError(err)));
    },
  );
}

/** Validate and create a new patient; returns the new document id. */
export async function addPatient(values: PatientFormValues): Promise<string> {
  const validated = patientFormSchema.parse(values);
  const firestoreData = omitUndefined(validated);

  const docRef = await withFirestoreTimeout(
    addDoc(collection(requireDb(), PATIENTS_COLLECTION), {
      ...firestoreData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastEditedBy: PLACEHOLDER_EDITOR_ID,
    }),
    "Save patient",
  );

  return docRef.id;
}

/** Validate and update an existing patient. */
export async function updatePatient(
  id: string,
  values: PatientFormValues,
): Promise<void> {
  const validated = patientFormSchema.parse(values);
  const firestoreData = omitUndefined(validated);

  await withFirestoreTimeout(
    updateDoc(doc(requireDb(), PATIENTS_COLLECTION, id), {
      ...firestoreData,
      updatedAt: serverTimestamp(),
      lastEditedBy: PLACEHOLDER_EDITOR_ID,
    }),
    "Update patient",
  );
}

/** Delete a patient by id. */
export async function deletePatient(id: string): Promise<void> {
  await withFirestoreTimeout(
    deleteDoc(doc(requireDb(), PATIENTS_COLLECTION, id)),
    "Delete patient",
  );
}
