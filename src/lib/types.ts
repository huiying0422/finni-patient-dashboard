import { Timestamp } from "firebase/firestore";
import { z } from "zod";

/** US ZIP code: 5 digits, optional plus-4 extension (e.g. 12345 or 12345-6789). */
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

/**
 * Address fields required when creating or editing a patient.
 */
export const addressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z
    .string()
    .min(1, "ZIP code is required")
    .regex(
      US_ZIP_REGEX,
      "Enter a valid US ZIP code (e.g. 12345 or 12345-6789)",
    ),
});

/**
 * Form values for creating or updating a patient record.
 */
export const patientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
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
});

/** Inferred type for patient form field values. */
export type PatientFormValues = z.infer<typeof patientFormSchema>;

/**
 * Full patient record stored in Firestore, extending form values
 * with system-generated and metadata fields.
 */
export type Patient = PatientFormValues & {
  id: string;
  providerId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastEditedBy?: string;
};
