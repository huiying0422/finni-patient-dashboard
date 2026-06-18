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
};

const STATUS_OPTIONS: PatientFieldOption[] = [
  { value: "Inquiry", label: "Inquiry" },
  { value: "Onboarding", label: "Onboarding" },
  { value: "Active", label: "Active" },
  { value: "Churned", label: "Churned" },
];

/** Declarative field config — add a new field here plus schema/types to extend the form. */
export const patientFields: PatientFieldConfig[] = [
  { key: "firstName", label: "First name", inputType: "text" },
  { key: "middleName", label: "Middle name", inputType: "text", optional: true },
  { key: "lastName", label: "Last name", inputType: "text" },
  { key: "dateOfBirth", label: "Date of birth", inputType: "date" },
  {
    key: "status",
    label: "Status",
    inputType: "select",
    options: STATUS_OPTIONS,
  },
  { key: "address.street", label: "Street address", inputType: "text" },
  { key: "address.city", label: "City", inputType: "text" },
  { key: "address.state", label: "State", inputType: "text" },
  { key: "address.zip", label: "ZIP code", inputType: "text" },
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
