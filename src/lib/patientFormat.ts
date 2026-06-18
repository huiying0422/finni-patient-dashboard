import type { Timestamp } from "firebase/firestore";

import type { PatientFormValues } from "@/lib/types";

export type PatientStatus = PatientFormValues["status"];

export const STATUS_BADGE_STYLES: Record<
  PatientStatus,
  { backgroundColor: string; color: string }
> = {
  Inquiry: { backgroundColor: "#D1BCE7", color: "#4A3A54" },
  Onboarding: { backgroundColor: "#FDE7D6", color: "#B8480F" },
  Active: { backgroundColor: "#E2F3E7", color: "#2E7D3A" },
  Churned: { backgroundColor: "#E6E6E6", color: "#758696" },
};

type NameFields = {
  firstName: string;
  middleName?: string;
  lastName: string;
};

export function formatFullName(patient: NameFields): string {
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

export function formatDateOfBirth(dateOfBirth: string): string {
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) {
    return dateOfBirth;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "—";
  }

  return timestamp.toDate().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
