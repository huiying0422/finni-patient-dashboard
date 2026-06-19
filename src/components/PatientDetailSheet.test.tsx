import { render, screen } from "@testing-library/react";
import { PatientDetailSheet } from "@/components/PatientDetailSheet";
import { makePatient, TEST_ADDRESS } from "@/test/fixtures/patient";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/patients", () => ({
  updatePatient: vi.fn(),
  deletePatient: vi.fn(),
}));

describe("PatientDetailSheet — full record view", () => {
  const patient = makePatient();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DS-A01: view mode shows all five address values", () => {
    render(
      <PatientDetailSheet patient={patient} open onOpenChange={onOpenChange} />,
    );

    expect(screen.getByText(TEST_ADDRESS.street)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.line2)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.city)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.state)).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.zip)).toBeInTheDocument();
  });

  it("DS-A02: view mode shows address field labels", () => {
    render(
      <PatientDetailSheet patient={patient} open onOpenChange={onOpenChange} />,
    );

    expect(screen.getByText("Street address")).toBeInTheDocument();
    expect(screen.getByText("Apt / unit")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("ZIP code")).toBeInTheDocument();
  });

  it("DS-G01: view mode shows gender", () => {
    render(
      <PatientDetailSheet patient={patient} open onOpenChange={onOpenChange} />,
    );

    expect(screen.getByText("Gender")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
  });

  it("DS-G02: view mode shows em dash when gender is missing", () => {
    render(
      <PatientDetailSheet
        patient={makePatient({ gender: undefined })}
        open
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByText("Gender")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("DS-A03: renders nothing when patient is null", () => {
    const { container } = render(
      <PatientDetailSheet patient={null} open onOpenChange={onOpenChange} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
