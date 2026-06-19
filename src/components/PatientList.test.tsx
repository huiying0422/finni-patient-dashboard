import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatientList } from "@/components/PatientList";
import { makePatient, TEST_ADDRESS } from "@/test/fixtures/patient";

const mockUsePatients = vi.fn();

vi.mock("@/hooks/usePatients", () => ({
  usePatients: () => mockUsePatients(),
}));

vi.mock("@/components/AddPatientDialog", () => ({
  AddPatientDialog: () => <button type="button">Add patient</button>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/patients", () => ({
  updatePatient: vi.fn(),
  deletePatient: vi.fn(),
}));

const jane = makePatient();
const john = makePatient({
  id: "patient-2",
  firstName: "John",
  middleName: undefined,
  lastName: "Smith",
  gender: "Male",
  status: "Inquiry",
});

const ADDRESS_FRAGMENTS = [
  TEST_ADDRESS.street,
  TEST_ADDRESS.line2,
  TEST_ADDRESS.city,
  TEST_ADDRESS.state,
  TEST_ADDRESS.zip,
  `${TEST_ADDRESS.city}, ${TEST_ADDRESS.state}`,
];

function mockPatientsLoaded(patients = [jane, john]) {
  mockUsePatients.mockReturnValue({
    patients,
    loading: false,
    error: null,
    projectId: "test-project",
    refresh: vi.fn(),
  });
}

function getVisibleTableHeaders(): string[] {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("columnheader")
    .map((cell) => cell.textContent?.trim() ?? "")
    .filter((text) => text.length > 0);
}

function mockMobileViewport() {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("PatientList — list scan surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPatientsLoaded();
  });

  it("PL-G01: desktop table has Gender column between Name and Date of birth", () => {
    render(<PatientList />);

    const headers = getVisibleTableHeaders();
    const nameIdx = headers.indexOf("Name");
    const genderIdx = headers.indexOf("Gender");
    const dobIdx = headers.indexOf("Date of birth");

    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(genderIdx).toBeGreaterThan(nameIdx);
    expect(genderIdx).toBeLessThan(dobIdx);
  });

  it("PL-G02: desktop table renders gender values for each patient", () => {
    render(<PatientList />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Female")).toBeInTheDocument();
    expect(within(table).getByText("Male")).toBeInTheDocument();
  });

  it("PL-G03: desktop table shows em dash when gender is missing", () => {
    mockPatientsLoaded([makePatient({ gender: undefined })]);
    render(<PatientList />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("—")).toBeInTheDocument();
  });

  it("PL-G04: mobile card shows gender as gray text beside the name", () => {
    mockMobileViewport();
    render(<PatientList />);

    const card = screen.getByRole("button", { name: /Jane Marie Doe/i });
    expect(within(card).getByText("Female")).toBeInTheDocument();
  });

  it("PL-A01: desktop table does not have Location or address column headers", () => {
    render(<PatientList />);

    const headers = getVisibleTableHeaders();
    expect(headers).not.toContain("Location");
    expect(headers).not.toContain("Address");
    expect(headers).not.toContain("City");
    expect(headers).not.toContain("State");
  });

  it("PL-A02: desktop table body does not render any address field text", () => {
    render(<PatientList />);

    const table = screen.getByRole("table");
    for (const fragment of ADDRESS_FRAGMENTS) {
      expect(within(table).queryByText(fragment)).not.toBeInTheDocument();
    }
  });

  it("PL-A03: mobile card does not render address text", () => {
    mockMobileViewport();
    render(<PatientList />);

    for (const fragment of ADDRESS_FRAGMENTS) {
      expect(screen.queryByText(fragment)).not.toBeInTheDocument();
    }
  });

  it("PL-A04: patient fixture still carries address on the data model", () => {
    render(<PatientList />);
    expect(jane.address).toEqual(TEST_ADDRESS);
  });
});

describe("PatientList → PatientDetailSheet integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPatientsLoaded([jane]);
  });

  it("PL-I01: clicking a row opens detail sheet with full address block", async () => {
    const user = userEvent.setup();
    render(<PatientList />);

    const rows = screen.getAllByRole("row");
    await user.click(rows[1]);

    expect(screen.getByText("Street address")).toBeInTheDocument();
    expect(screen.getByText("Apt / unit")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("ZIP code")).toBeInTheDocument();

    expect(screen.getByText(TEST_ADDRESS.street)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.line2)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.city)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.state)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.zip)).toBeInTheDocument();
  });

  it("PL-I02: detail sheet still shows gender after opening from list", async () => {
    const user = userEvent.setup();
    render(<PatientList />);

    const rows = screen.getAllByRole("row");
    await user.click(rows[1]);

    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("Gender")).toBeInTheDocument();
    expect(within(sheet).getByText("Female")).toBeInTheDocument();
  });
});
