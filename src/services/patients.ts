import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { PLACEHOLDER_EDITOR_ID } from "@/lib/constants";
import {
  patientFormSchema,
  type Patient,
  type PatientFormValues,
} from "@/lib/types";

const PATIENTS_COLLECTION = "patients";

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

/** List all patients, newest first. */
export async function listPatients(): Promise<Patient[]> {
  const patientsQuery = query(
    collection(db, PATIENTS_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(patientsQuery);

  return snapshot.docs.map((docSnap) => toPatient(docSnap.id, docSnap.data()));
}

/** Subscribe to live patient list updates; returns an unsubscribe function. */
export function subscribePatients(
  onPatients: (patients: Patient[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const patientsQuery = query(
    collection(db, PATIENTS_COLLECTION),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    patientsQuery,
    (snapshot) => {
      const patients = snapshot.docs.map((docSnap) =>
        toPatient(docSnap.id, docSnap.data()),
      );
      onPatients(patients);
    },
    (error) => {
      onError(error);
    },
  );
}

/** Fetch a single patient by id, or null if not found. */
export async function getPatient(id: string): Promise<Patient | null> {
  const docSnap = await getDoc(doc(db, PATIENTS_COLLECTION, id));

  if (!docSnap.exists()) {
    return null;
  }

  return toPatient(docSnap.id, docSnap.data());
}

/** Validate and create a new patient; returns the new document id. */
export async function addPatient(values: PatientFormValues): Promise<string> {
  const validated = patientFormSchema.parse(values);
  const firestoreData = omitUndefined(validated);

  const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), {
    ...firestoreData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastEditedBy: PLACEHOLDER_EDITOR_ID,
  });

  return docRef.id;
}

/** Validate and update an existing patient. */
export async function updatePatient(
  id: string,
  values: PatientFormValues,
): Promise<void> {
  const validated = patientFormSchema.parse(values);
  const firestoreData = omitUndefined(validated);

  await updateDoc(doc(db, PATIENTS_COLLECTION, id), {
    ...firestoreData,
    updatedAt: serverTimestamp(),
    lastEditedBy: PLACEHOLDER_EDITOR_ID,
  });
}

/** Delete a patient by id. */
export async function deletePatient(id: string): Promise<void> {
  await deleteDoc(doc(db, PATIENTS_COLLECTION, id));
}
