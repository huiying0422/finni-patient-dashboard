/**
 * Main patient list view — search, status filtering, and entry point to detail.
 *
 * Reads live data from usePatients and derives filtered results in memory so
 * the underlying Firestore list is never mutated by UI filters.
 */
import { useMemo, useState } from "react";

import { AddPatientDialog } from "@/components/AddPatientDialog";
import { PatientDetailSheet } from "@/components/PatientDetailSheet";
import { SeedTestDataButton } from "@/components/SeedTestDataButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  formatDateOfBirth,
  formatFullName,
  STATUS_BADGE_STYLES,
  type PatientStatus,
} from "@/lib/patientFormat";
import type { Patient } from "@/lib/types";

type StatusFilter = "All" | PatientStatus;

const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "Inquiry",
  "Onboarding",
  "Active",
  "Churned",
];

function filterPatients(
  patients: Patient[],
  searchQuery: string,
  statusFilter: StatusFilter,
): Patient[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Pure filter — returns a new array; the source list from Firestore stays untouched.
  return patients.filter((patient) => {
    if (statusFilter !== "All" && patient.status !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return formatFullName(patient).toLowerCase().includes(normalizedQuery);
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
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl sm:h-10" />
      ))}
    </div>
  );
}

function PatientCard({
  patient,
  onSelect,
}: {
  patient: Patient;
  onSelect: (patient: Patient) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(patient)}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {formatFullName(patient)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateOfBirth(patient.dateOfBirth)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.address.city}, {patient.address.state}
          </p>
        </div>
        <StatusBadge status={patient.status} />
      </div>
    </button>
  );
}

export function PatientList() {
  const { patients, loading, error, projectId } = usePatients();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredPatients = useMemo(
    () => filterPatients(patients, searchQuery, statusFilter),
    [patients, searchQuery, statusFilter],
  );

  // Resolve selection from the live list so edits/deletes reflected by onSnapshot stay in sync.
  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? null;

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "All";

  function openPatientDetail(patient: Patient) {
    setSelectedPatientId(patient.id);
    setSheetOpen(true);
  }

  return (
    <>
      <Card className="mx-auto w-full max-w-5xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Patients</CardTitle>
            <CardDescription>
              Manage patient records across the care lifecycle.
            </CardDescription>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <AddPatientDialog />
            {/* TEMPORARY — remove SeedTestDataButton import and usage when demo seeding is done. */}
            <SeedTestDataButton />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              type="search"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search patients by name"
              className="w-full"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  size="sm"
                  variant={statusFilter === filter ? "default" : "outline"}
                  className="shrink-0 rounded-full"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
              <p className="font-medium text-destructive">
                Could not load patients
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
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

          {!loading && !error && patients.length > 0 && filteredPatients.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
              <p className="font-medium text-foreground">No matching patients</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different name or status filter.
              </p>
            </div>
          )}

          {!loading && !error && filteredPatients.length > 0 && (
            <>
              {/* Cards on small screens; table on md+ — same data, different density. */}
              <div className="space-y-3 md:hidden">
                {filteredPatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onSelect={openPatientDetail}
                  />
                ))}
              </div>

              <div className="hidden md:block">
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
                    {filteredPatients.map((patient) => (
                      <TableRow
                        key={patient.id}
                        className="cursor-pointer"
                        onClick={() => openPatientDetail(patient)}
                      >
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
              </div>
            </>
          )}

          {!loading && !error && patients.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredPatients.length} of {patients.length} patients
              {hasActiveFilters ? " (filtered)" : ""}
              {" · "}
              <span className="font-mono text-xs">Firebase: {projectId}</span>
            </p>
          )}

          {!loading && error && (
            <p className="text-xs font-mono text-muted-foreground">
              Firebase project: {projectId}
            </p>
          )}
        </CardContent>
      </Card>

      <PatientDetailSheet
        patient={selectedPatient}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
