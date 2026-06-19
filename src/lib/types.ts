/**
 * Patient types and Zod validation schemas — the single source of truth for
 * what a patient record contains and what values are acceptable on create/update.
 *
 * Schemas drive both TypeScript types (via z.infer) and runtime validation in
 * the form and service layer, so UI rules and Firestore writes never drift apart.
 */
import { Timestamp } from "firebase/firestore";
import { z } from "zod";

/** US ZIP code: 5 digits, optional plus-4 extension (e.g. 12345 or 12345-6789). */
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

/** US state code: exactly two letters. */
const US_STATE_REGEX = /^[A-Z]{2}$/;

/** Trim and require a non-empty string. */
const trimmedRequired = (message: string) =>
  z.string().trim().min(1, message);

/** Required multi-line clinical note — use "N/A" when the patient has none. */
const clinicalParagraphRequired = (label: string) =>
  trimmedRequired(`${label} is required. Enter "N/A" if there is none.`);

/** Trim optional strings; empty strings become undefined so Firestore can omit the field. */
const trimmedOptional = () =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional();

/**
 * Address fields required when creating or editing a patient.
 * line2 is optional (apartment, suite, or unit).
 */
export const addressSchema = z.object({
  street: trimmedRequired("Street address is required"),
  line2: trimmedOptional(),
  city: trimmedRequired("City is required"),
  state: z
    .string()
    .trim()
    .min(1, "State is required")
    // Normalize to uppercase before regex check so "ca" and "CA" both validate.
    .transform((value) => value.toUpperCase())
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

/** Closed set of gender values — shared by Zod validation and the form select config. */
export const PATIENT_GENDER_VALUES = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
] as const;

/**
 * Form values for creating or updating a patient record.
 * middleName and address.line2 are the only optional fields.
 */
export const patientFormSchema = z.object({
  firstName: trimmedRequired("First name is required"),
  middleName: trimmedOptional(),
  lastName: trimmedRequired("Last name is required"),
  gender: z.enum(PATIENT_GENDER_VALUES, {
    message: "Please select a gender",
  }),
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
  status: z.enum(["Inquiry", "Onboarding", "Active", "Churned"], {
    message: "Please select a patient status",
  }),
  address: addressSchema,
  // Clinical PHI — higher sensitivity than demographics; Firestore only in this app.
  healthHistory: clinicalParagraphRequired("Health history"),
  medicationHistory: clinicalParagraphRequired("Medication history"),
});

/** Inferred from the schema — keeps form types in sync with validation rules automatically. */
export type PatientFormValues = z.infer<typeof patientFormSchema>;

/**
 * Full patient record stored in Firestore, extending form values
 * with system-generated and metadata fields.
 *
 * Audit fields (createdAt, updatedAt, lastEditedBy) are written by the service
 * layer, not the form, so providers cannot backdate or spoof edit history.
 */
export type Patient = PatientFormValues & {
  id: string;
  providerId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastEditedBy?: string;
};
