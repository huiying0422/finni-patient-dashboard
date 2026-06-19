/**
 * Phase 1 — Zod schemas, inferred form types, and Patient record shape
 *
 * This file is the "rule book" for patient data.
 * If you change a rule here, the form AND the database both follow it.
 */

// Timestamp = Firestore's way of storing a date+time on the server (createdAt, updatedAt).
import { Timestamp } from "firebase/firestore";

// z = Zod library — checks values at runtime and can build TypeScript types from rules.
import { z } from "zod";

// ---------------------------------------------------------------------------
// REGEX PATTERNS — hidden rules for ZIP and state format
// ---------------------------------------------------------------------------

// Matches 12345 or 12345-6789 (US ZIP codes).
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// Matches exactly two capital letters after we uppercase input — e.g. TX, CA.
const US_STATE_REGEX = /^[A-Z]{2}$/;

// ---------------------------------------------------------------------------
// REUSABLE ZOD HELPERS — small factories we call many times below
// ---------------------------------------------------------------------------

/**
 * Rule: must be a string, trim spaces, and not be empty after trimming.
 * @param message — shown under the field if the user leaves it blank
 */
const trimmedRequired = (message: string) =>
  z.string().trim().min(1, message);

/**
 * Rule for health/medication text areas — still required, but typing "N/A" is OK.
 */
const clinicalParagraphRequired = (label: string) =>
  trimmedRequired(`${label} is required. Enter "N/A" if there is none.`);

/**
 * Rule for optional fields (middle name, apt/unit).
 * Empty string → undefined so Firestore doesn't get invalid undefined keys later.
 */
const trimmedOptional = () =>
  z
    .string()
    .trim()
    .transform((value) => {
      if (value === "") {
        return undefined; // "no value" — field will be omitted on save
      }
      return value; // keep what they typed
    })
    .optional();

// ---------------------------------------------------------------------------
// ADDRESS SCHEMA — nested object under patientFormSchema.address
// ---------------------------------------------------------------------------

export const addressSchema = z.object({
  street: trimmedRequired("Street address is required"), // required text
  line2: trimmedOptional(), // apt/unit — optional
  city: trimmedRequired("City is required"), // required text
  state: z
    .string()
    .trim()
    .min(1, "State is required")
    .transform((value) => value.toUpperCase()) // friendly: accept "tx", store as "TX"
    .pipe(
      z.string().regex(US_STATE_REGEX, "Enter a valid 2-letter state code"),
    ),
  zip: z
    .string()
    .trim()
    .min(1, "ZIP code is required")
    .regex(
      US_ZIP_REGEX,
      "Enter a valid US ZIP code (e.g. 12345 or 12345-6789)",
    ),
});

// ---------------------------------------------------------------------------
// GENDER — only these four strings are allowed (dropdown, not free text)
// ---------------------------------------------------------------------------

export const PATIENT_GENDER_VALUES = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
] as const;

// ---------------------------------------------------------------------------
// MAIN FORM SCHEMA — everything typed on add/edit (before audit fields)
// ---------------------------------------------------------------------------

export const patientFormSchema = z.object({
  // --- Name ---
  firstName: trimmedRequired("First name is required"),
  middleName: trimmedOptional(), // optional
  lastName: trimmedRequired("Last name is required"),

  // --- Gender — must be one of PATIENT_GENDER_VALUES ---
  gender: z.enum(PATIENT_GENDER_VALUES, {
    message: "Please select a gender",
  }),

  // --- Date of birth — string from <input type="date">, validated as real date ---
  dateOfBirth: z
    .string()
    .trim()
    .min(1, "Date of birth is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Enter a valid date of birth",
    })
    .refine((value) => new Date(value) <= new Date(), {
      message: "Date of birth cannot be in the future",
    }),

  // --- Care lifecycle stage — fixed enum, not arbitrary text ---
  status: z.enum(["Inquiry", "Onboarding", "Active", "Churned"], {
    message: "Please select a patient status",
  }),

  // --- Nested address object (rules defined in addressSchema above) ---
  address: addressSchema,

  // --- Clinical PHI paragraphs — required; use "N/A" when none ---
  healthHistory: clinicalParagraphRequired("Health history"),
  medicationHistory: clinicalParagraphRequired("Medication history"),
});

/**
 * TypeScript type automatically built from patientFormSchema.
 * Use this wherever you mean "what the user typed in the form."
 */
export type PatientFormValues = z.infer<typeof patientFormSchema>;

// ---------------------------------------------------------------------------
// FULL PATIENT — form fields PLUS fields only the server/service adds
// ---------------------------------------------------------------------------

export type Patient = PatientFormValues & {
  id: string; // Firestore document id
  providerId?: string; // future: tie record to logged-in provider
  createdAt: Timestamp; // when record was first saved (server time)
  updatedAt: Timestamp; // when record was last changed (server time)
  lastEditedBy?: string; // who edited last (placeholder until Auth)
};
