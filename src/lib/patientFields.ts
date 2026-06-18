import type { PatientFormValues } from "@/lib/types";

export type PatientFieldInputType = "text" | "date" | "select";

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
};

const STATUS_OPTIONS: PatientFieldOption[] = [
  { value: "Inquiry", label: "Inquiry" },
  { value: "Onboarding", label: "Onboarding" },
  { value: "Active", label: "Active" },
  { value: "Churned", label: "Churned" },
];

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
];

export const defaultPatientFormValues: PatientFormValues = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  status: "Inquiry",
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
  },
};

/** Map a stored patient record to form field values for edit mode. */
export function patientToFormValues(patient: {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  status: PatientFormValues["status"];
  address: PatientFormValues["address"] & { line2?: string };
}): PatientFormValues {
  return {
    firstName: patient.firstName,
    middleName: patient.middleName ?? "",
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    status: patient.status,
    address: {
      street: patient.address.street,
      line2: patient.address.line2 ?? "",
      city: patient.address.city,
      state: patient.address.state,
      zip: patient.address.zip,
    },
  };
}
