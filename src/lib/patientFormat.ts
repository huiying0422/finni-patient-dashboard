/**
 * Phase 8 — Display formatters and status badge styling
 *
 * These are "make it pretty for the screen" helpers.
 * They do NOT save data and do NOT talk to Firebase.
 */
// ---------------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------------

// Timestamp = Firestore server date type on createdAt / updatedAt fields.
import type { Timestamp } from "firebase/firestore";

// PatientFormValues = gives us the status union type ("Inquiry" | "Active" | …).
import type { PatientFormValues } from "@/lib/types";

/** The four allowed status words — same list as in the form dropdown. */
export type PatientStatus = PatientFormValues["status"];

/**
 * Background and text colors for each status pill in the list and detail sheet.
 * Inline styles because each status has its own Finni brand color.
 */
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

/**
 * Two-letter avatar label from first and last name, e.g. "Jane Doe" → "JD".
 * Used in the patient list for quick visual scanning.
 */
export function formatInitials(patient: NameFields): string {
  const first = patient.firstName.trim().charAt(0).toUpperCase();
  const last = patient.lastName.trim().charAt(0).toUpperCase();
  const initials = `${first}${last}`.trim();

  return initials || "?";
}

/**
 * Turns first + optional middle + last into one display name, e.g. "Jane Marie Doe".
 * Skips middle name when it's blank so you don't get double spaces.
 */
export function formatFullName(patient: NameFields): string {
  // Step 1: put the three name parts in an array.
  const parts = [patient.firstName, patient.middleName, patient.lastName];

  // Step 2: throw away empty/undefined pieces (filter(Boolean) removes "", undefined, null).
  const nonEmptyParts = parts.filter(Boolean);

  // Step 3: glue what's left together with single spaces.
  return nonEmptyParts.join(" ");
}

/**
 * Converts the stored date string (from the date input) into something humans read easily.
 * Example: "1990-01-15" → "Jan 15, 1990"
 */
export function formatDateOfBirth(dateOfBirth: string): string {
  // Step 1: try to parse the string into a real Date object.
  const parsed = new Date(dateOfBirth);

  // Step 2: if parsing failed, just show the raw string — better than showing "Invalid Date".
  if (Number.isNaN(parsed.getTime())) {
    return dateOfBirth;
  }

  // Step 3: format for US readers (month abbreviation, day, year).
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Shows when a record was created or last updated (from Firestore server timestamps).
 * Used in the detail sheet under "Created" and "Last updated".
 */
export function formatTimestamp(timestamp: Timestamp | undefined): string {
  // Step 1: if there's no timestamp yet (still loading from server), show a dash.
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "—";
  }

  // Step 2: Firestore Timestamps convert to a normal JavaScript Date, then we format it.
  return timestamp.toDate().toLocaleString("en-US", {
    dateStyle: "medium", // e.g. "Jun 17, 2026"
    timeStyle: "short", // e.g. "3:45 PM"
  });
}
