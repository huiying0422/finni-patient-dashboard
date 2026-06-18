/**
 * TEMPORARY — dev-only seed utility. Delete this file when demo data is no longer needed.
 */
import { faker } from "@faker-js/faker";

import { addPatient } from "@/services/patients";
import { patientFormSchema, type PatientFormValues } from "@/lib/types";

const PATIENT_STATUSES = [
  "Inquiry",
  "Onboarding",
  "Active",
  "Churned",
] as const satisfies readonly PatientFormValues["status"][];

/** Random YYYY-MM-DD date of birth for pediatric ages roughly 2–18. */
function randomPediatricDateOfBirth(): string {
  const today = new Date();
  const youngest = new Date(today);
  youngest.setFullYear(youngest.getFullYear() - 2);
  const oldest = new Date(today);
  oldest.setFullYear(oldest.getFullYear() - 18);

  return faker.date.between({ from: oldest, to: youngest }).toISOString().slice(0, 10);
}

function generatePatient(): PatientFormValues {
  const includeMiddleName = faker.datatype.boolean({ probability: 0.6 });
  const includeLine2 = faker.datatype.boolean({ probability: 0.35 });

  const candidate = {
    firstName: faker.person.firstName(),
    middleName: includeMiddleName ? faker.person.middleName() : undefined,
    lastName: faker.person.lastName(),
    dateOfBirth: randomPediatricDateOfBirth(),
    status: faker.helpers.arrayElement(PATIENT_STATUSES),
    address: {
      street: faker.location.streetAddress(),
      line2: includeLine2 ? faker.location.secondaryAddress() : undefined,
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode("#####"),
    },
  };

  // Confirm generated data satisfies the same schema used by forms and Firestore writes.
  return patientFormSchema.parse(candidate);
}

/** Generate and persist `count` randomized pediatric patients via addPatient. */
export async function seedPatients(count = 50): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await addPatient(generatePatient());
  }
}
