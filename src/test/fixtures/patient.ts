import type { Patient } from "@/lib/types";

/** Distinctive address strings — easy to assert they are NOT in the list. */
export const TEST_ADDRESS = {
  street: "742 Evergreen Terrace",
  line2: "Apt 2B",
  city: "Springfield",
  state: "IL",
  zip: "62704",
} as const;

export function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "patient-1",
    firstName: "Jane",
    middleName: "Marie",
    lastName: "Doe",
    gender: "Female",
    dateOfBirth: "1990-01-15",
    status: "Active",
    address: { ...TEST_ADDRESS },
    healthHistory: "Asthma",
    medicationHistory: "N/A",
    createdAt: { toDate: () => new Date("2026-01-01") } as Patient["createdAt"],
    updatedAt: { toDate: () => new Date("2026-06-01") } as Patient["updatedAt"],
    lastEditedBy: "dev-dashboard@finni.local",
    ...overrides,
  };
}
