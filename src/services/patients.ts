import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  patientFormSchema,
  type Patient,
  type PatientFormValues,
} from "@/lib/types";

const PATIENTS_COLLECTION = "patients";

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

  const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), {
    ...validated,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** Validate and update an existing patient. */
export async function updatePatient(
  id: string,
  values: PatientFormValues,
): Promise<void> {
  const validated = patientFormSchema.parse(values);

  await updateDoc(doc(db, PATIENTS_COLLECTION, id), {
    ...validated,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a patient by id. */
export async function deletePatient(id: string): Promise<void> {
  await deleteDoc(doc(db, PATIENTS_COLLECTION, id));
}
