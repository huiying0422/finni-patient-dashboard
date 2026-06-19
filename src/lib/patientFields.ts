/**
 * Phase 3 — Declarative field config (the "menu" PatientForm reads from)
 *
 * Instead of writing a separate input for every field in PatientForm,
 * we list them here once. Add a row here + one line in types.ts = new field on the form.
 */
// ---------------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------------

// PATIENT_GENDER_VALUES = the four allowed gender strings (must match Zod enum).
// PatientFormValues = TypeScript type so field keys are type-checked.
import {
  PATIENT_GENDER_VALUES,
  type PatientFormValues,
} from "@/lib/types";

/** What kind of HTML control PatientForm should draw for this field. */
export type PatientFieldInputType = "text" | "date" | "select" | "textarea";

/** One choice in a dropdown — value is saved; label is what the user reads. */
export type PatientFieldOption = {
  value: string;
  label: string;
};

/** Allowed field paths — either "firstName" or nested "address.city". */
export type PatientFieldKey =
  | keyof Omit<PatientFormValues, "address">
  | `address.${keyof PatientFormValues["address"]}`;

/** One line in the field menu — PatientForm loops over an array of these. */
export type PatientFieldConfig = {
  key: PatientFieldKey; // where the value lives on the form object
  label: string; // human label above the input
  inputType: PatientFieldInputType; // text, date, select, or textarea
  optional?: boolean; // show "(optional)" — middle name, apt/unit
  options?: PatientFieldOption[]; // dropdown choices for select fields
  autoComplete?: string; // browser autofill hint (name, address, etc.)
  helperText?: string; // gray hint under label (clinical N/A message)
};

/** Shown under clinical textareas — tells staff to type N/A when there's nothing to report. */
export const CLINICAL_NA_HELPER_TEXT = 'Enter "N/A" if there is none.';

/** Status dropdown choices — must match z.enum in types.ts exactly. */
const STATUS_OPTIONS: PatientFieldOption[] = [
  { value: "Inquiry", label: "Inquiry" },
  { value: "Onboarding", label: "Onboarding" },
  { value: "Active", label: "Active" },
  { value: "Churned", label: "Churned" },
];

/** Gender dropdown choices — built from the same list Zod validates against. */
const GENDER_OPTIONS: PatientFieldOption[] = PATIENT_GENDER_VALUES.map(
  (value) => ({ value, label: value }),
);

/**
 * THE field menu — order here = order on screen in add form, edit form, and detail sheet.
 */
export const patientFields: PatientFieldConfig[] = [
  // --- Name block ---
  {
    key: "firstName",
    label: "First name",
    inputType: "text",
    autoComplete: "given-name",
  },
  {
    key: "middleName",
    label: "Middle name",
    inputType: "text",
    optional: true, // not required in Zod
  },
  {
    key: "lastName",
    label: "Last name",
    inputType: "text",
    autoComplete: "family-name",
  },
  // --- Demographics ---
  {
    key: "gender",
    label: "Gender",
    inputType: "select",
    options: GENDER_OPTIONS,
  },
  { key: "dateOfBirth", label: "Date of birth", inputType: "date" },
  {
    key: "status",
    label: "Status",
    inputType: "select",
    options: STATUS_OPTIONS,
  },
  // --- Address block ---
  {
    key: "address.street",
    label: "Street address",
    inputType: "text",
    autoComplete: "address-line1",
  },
  {
    key: "address.line2",
    label: "Apt / unit",
    inputType: "text",
    optional: true,
    autoComplete: "address-line2",
  },
  {
    key: "address.city",
    label: "City",
    inputType: "text",
    autoComplete: "address-level2",
  },
  {
    key: "address.state",
    label: "State",
    inputType: "text",
    autoComplete: "address-level1",
  },
  {
    key: "address.zip",
    label: "ZIP code",
    inputType: "text",
    autoComplete: "postal-code",
  },
  // --- Clinical PHI (detail sheet + form only — not in list table) ---
  {
    key: "healthHistory",
    label: "Health history",
    inputType: "textarea",
    helperText: CLINICAL_NA_HELPER_TEXT,
  },
  {
    key: "medicationHistory",
    label: "Medication history",
    inputType: "textarea",
    helperText: CLINICAL_NA_HELPER_TEXT,
  },
];

/**
 * Blank form for "Add patient" — empty strings mean "nothing typed yet."
 * gender uses a cast because we want NO default selection (user must pick one).
 */
export const defaultPatientFormValues = {
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  status: "Inquiry", // sensible default for new patients
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
  },
  healthHistory: "",
  medicationHistory: "",
} as unknown as PatientFormValues;

/**
 * When you open Edit, we need to copy Firestore data back into form-shaped objects.
 * Optional/missing fields become "" so inputs stay controlled (React term: always have a value).
 */
export function patientToFormValues(patient: {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: PatientFormValues["gender"];
  dateOfBirth: string;
  status: PatientFormValues["status"];
  address: PatientFormValues["address"] & { line2?: string };
  healthHistory?: string;
  medicationHistory?: string;
}): PatientFormValues {
  return {
    firstName: patient.firstName,
    middleName: patient.middleName ?? "", // old records may not have middle name
    lastName: patient.lastName,
    gender: patient.gender ?? ("" as unknown as PatientFormValues["gender"]),
    dateOfBirth: patient.dateOfBirth,
    status: patient.status,
    address: {
      street: patient.address.street,
      line2: patient.address.line2 ?? "",
      city: patient.address.city,
      state: patient.address.state,
      zip: patient.address.zip,
    },
    healthHistory: patient.healthHistory ?? "",
    medicationHistory: patient.medicationHistory ?? "",
  };
}
