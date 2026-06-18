import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePatients } from "@/hooks/usePatients";
import type { Patient, PatientFormValues } from "@/lib/types";

type PatientStatus = PatientFormValues["status"];

const STATUS_BADGE_STYLES: Record<
  PatientStatus,
  { backgroundColor: string; color: string }
> = {
  Inquiry: { backgroundColor: "#D1BCE7", color: "#4A3A54" },
  Onboarding: { backgroundColor: "#FDE7D6", color: "#B8480F" },
  Active: { backgroundColor: "#E2F3E7", color: "#2E7D3A" },
  Churned: { backgroundColor: "#E6E6E6", color: "#758696" },
};

function formatFullName(patient: Patient): string {
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function formatDateOfBirth(dateOfBirth: string): string {
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) {
    return dateOfBirth;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: PatientStatus }) {
  const styles = STATUS_BADGE_STYLES[status];

  return (
    <Badge
      variant="outline"
      className="border-transparent"
      style={styles}
    >
      {status}
    </Badge>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function PatientList() {
  const { patients, loading, error, refresh } = usePatients();

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Patients</CardTitle>
          <CardDescription>
            Manage patient records across the care lifecycle.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton />}

        {!loading && error && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <p className="font-medium text-destructive">
              Could not load patients
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && patients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
            <p className="font-medium text-foreground">No patients yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a patient to see them listed here.
            </p>
          </div>
        )}

        {!loading && !error && patients.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date of birth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    {formatFullName(patient)}
                  </TableCell>
                  <TableCell>
                    {formatDateOfBirth(patient.dateOfBirth)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={patient.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.address.city}, {patient.address.state}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
