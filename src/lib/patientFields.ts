import {
  PATIENT_GENDER_VALUES,
  type PatientFormValues,
} from "@/lib/types";

export type PatientFieldInputType = "text" | "date" | "select" | "textarea";

export type PatientFieldOption = {
  value: string;
  label: string;
};

export type PatientFieldKey =
  | keyof Omit<PatientFormValues, "address">
  | `address.${keyof PatientFormValues["address"]}`;

export type PatientFieldConfig = {
  key: PatientFieldKey;
  label: string;
  inputType: PatientFieldInputType;
  optional?: boolean;
  options?: PatientFieldOption[];
  autoComplete?: string;
  /** Shown below the label — e.g. instructing "N/A" when a clinical field is empty. */
  helperText?: string;
};

/** Helper copy for required clinical paragraphs with no known history. */
export const CLINICAL_NA_HELPER_TEXT = 'Enter "N/A" if there is none.';

const STATUS_OPTIONS: PatientFieldOption[] = [
  { value: "Inquiry", label: "Inquiry" },
  { value: "Onboarding", label: "Onboarding" },
  { value: "Active", label: "Active" },
  { value: "Churned", label: "Churned" },
];

const GENDER_OPTIONS: PatientFieldOption[] = PATIENT_GENDER_VALUES.map(
  (value) => ({ value, label: value }),
);

/** Declarative field config — add a new field here plus schema/types to extend the form. */
export const patientFields: PatientFieldConfig[] = [
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
    optional: true,
  },
  {
    key: "lastName",
    label: "Last name",
    inputType: "text",
    autoComplete: "family-name",
  },
  // Required for care coordination; "Prefer not to say" respects patient autonomy.
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
  // Clinical PHI — never log or send to LLMs, analytics, or third-party APIs.
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

export const defaultPatientFormValues = {
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  status: "Inquiry",
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
  },
  healthHistory: "",
  medicationHistory: "",
} as unknown as PatientFormValues;

/** Map a stored patient record to form field values for edit mode. */
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
    middleName: patient.middleName ?? "",
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
