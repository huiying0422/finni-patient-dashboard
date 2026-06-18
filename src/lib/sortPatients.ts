import type { Patient } from "@/lib/types";

/** Best-effort ms for Firestore Timestamp / plain seconds object / missing. */
export function createdAtMs(patient: Patient): number {
  const ts = patient.createdAt;
  if (!ts || typeof ts !== "object") return 0;
  if ("toMillis" in ts && typeof ts.toMillis === "function") {
    return ts.toMillis();
  }
  if ("seconds" in ts && typeof ts.seconds === "number") {
    return ts.seconds * 1000;
  }
  return 0;
}

/** Newest first; patients without createdAt still appear (at the end). */
export function sortPatientsByCreatedAt(patients: Patient[]): Patient[] {
  return [...patients].sort((a, b) => createdAtMs(b) - createdAtMs(a));
}
