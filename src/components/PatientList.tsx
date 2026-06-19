/**
 * Phase 2 list + Phase 5 search/filter/pagination/refresh
 *
 * The main table (or cards on phone) you see when the app loads.
 * Does NOT talk to Firebase directly — asks usePatients for the data.
 */
// ---------------------------------------------------------------------------
// IMPORTS — each line pulls in a tool this file needs
// ---------------------------------------------------------------------------

// useEffect = reset page when filters change; clamp page when list shrinks.
// useMemo = recompute filtered/sliced list only when inputs change (performance).
// useState = search text, status filter, current page, which patient sheet is open.
import { useEffect, useMemo, useState } from "react";

// RefreshCw = spinning arrow icon on the Refresh button.
import { RefreshCw } from "lucide-react";

// AddPatientDialog = orange "Add patient" button + modal (self-contained).
import { AddPatientDialog } from "@/components/AddPatientDialog";

// PatientDetailSheet = side panel for view/edit/delete when you click a row.
import { PatientDetailSheet } from "@/components/PatientDetailSheet";

// Badge = small colored status pill (Inquiry, Active, …).
import { Badge } from "@/components/ui/badge";

// Button = Refresh, status filter pills, pagination Previous/Next.
import { Button } from "@/components/ui/button";

// Card pieces = white rounded box wrapping the whole patient list UI.
import {
  Card, // outer shell
  CardContent, // main body (search, table, pagination)
  CardDescription, // subtitle under "Patients"
  CardHeader, // top row with title + action buttons
  CardTitle, // "Patients" heading
} from "@/components/ui/card";

// Input = search-by-name text box.
import { Input } from "@/components/ui/input";

// Skeleton = gray loading bars while Firestore is fetching.
import { Skeleton } from "@/components/ui/skeleton";

// Table pieces = desktop layout (hidden on phones — cards used instead).
import {
  Table, // wraps <table> with horizontal scroll
  TableBody, // data rows
  TableCell, // one cell in a row
  TableHead, // column header cell
  TableHeader, // header row group
  TableRow, // one patient row (clickable)
} from "@/components/ui/table";

// usePatients = hook that owns Firestore subscription (patients, loading, error, refresh).
import { usePatients } from "@/hooks/usePatients";

// Formatters for names, dates, status colors — no Firebase here.
import {
  formatDateOfBirth,
  formatFullName,
  STATUS_BADGE_STYLES,
  type PatientStatus,
} from "@/lib/patientFormat";

// Patient = full record type from types.ts.
import type { Patient } from "@/lib/types";

/** How many rows per page — change this number to show more or fewer at once. */
const PAGE_SIZE = 20;

type StatusFilter = "All" | PatientStatus;

const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "Inquiry",
  "Onboarding",
  "Active",
  "Churned",
];

/**
 * Narrows the full patient list by search box and status pills.
 * Does NOT change Firestore — only hides rows on screen (filtering in memory).
 */
function filterPatients(
  patients: Patient[],
  searchQuery: string,
  statusFilter: StatusFilter,
): Patient[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return patients.filter((patient) => {
    // Filter 1: status pill — skip if patient status doesn't match (unless "All").
    if (statusFilter !== "All" && patient.status !== statusFilter) {
      return false;
    }

    // Filter 2: empty search = show everyone who passed status filter.
    if (!normalizedQuery) {
      return true;
    }

    // Filter 3: search matches if full name contains the typed letters.
    return formatFullName(patient).toLowerCase().includes(normalizedQuery);
  });
}

/** Small colored pill showing Inquiry / Onboarding / Active / Churned. */
function StatusBadge({ status }: { status: PatientStatus }) {
  const styles = STATUS_BADGE_STYLES[status];

  return (
    <Badge variant="outline" className="border-transparent" style={styles}>
      {status}
    </Badge>
  );
}

/** Gray placeholder bars while Firestore is still loading. */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl sm:h-10" />
      ))}
    </div>
  );
}

/** Phone layout — one tappable card per patient instead of a table. */
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
            {patient.gender ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {patient.gender}
              </span>
            ) : null}
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
  // Pull live data + loading/error from the hook — no direct Firestore here.
  const { patients, loading, error, projectId, refresh } = usePatients();

  // What the user typed in the search box.
  const [searchQuery, setSearchQuery] = useState("");

  // Which status pill is selected ("All" or a specific status).
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  // Current page number (1-based) for pagination.
  const [page, setPage] = useState(1);

  // Firestore document id of patient whose detail sheet is open (or null).
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Is the side panel visible?
  const [sheetOpen, setSheetOpen] = useState(false);

  // Recompute filtered list only when patients, search, or status filter changes.
  const filteredPatients = useMemo(
    () => filterPatients(patients, searchQuery, statusFilter),
    [patients, searchQuery, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));

  // Slice just the 20 (or PAGE_SIZE) patients for the current page.
  const paginatedPatients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, page]);

  // Find the full patient object for whoever's detail sheet is open.
  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? null;

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "All";

  const rangeStart =
    filteredPatients.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredPatients.length);

  // When user types a new search or picks a new status, jump back to page 1.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // If you delete patients and current page is now too high, step down.
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /** User tapped a row or card — open the side panel for that person. */
  function openPatientDetail(patient: Patient) {
    setSelectedPatientId(patient.id);
    setSheetOpen(true);
  }

  return (
    <>
      <Card className="mx-auto w-full max-w-5xl">
        {/* ----- HEADER: title + Refresh + Add patient ----- */}
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Patients</CardTitle>
            <CardDescription>
              Manage patient records across the care lifecycle.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh patient list"
            >
              <RefreshCw
                className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <AddPatientDialog />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ----- SEARCH + STATUS FILTER PILLS ----- */}
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

          {/* ----- LOADING STATE ----- */}
          {loading && <LoadingSkeleton />}

          {/* ----- ERROR STATE ----- */}
          {!loading && error && (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
              <p className="font-medium text-destructive">Could not load patients</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {/* ----- EMPTY DATABASE ----- */}
          {!loading && !error && patients.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
              <p className="font-medium text-foreground">No patients yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a patient to see them listed here.
              </p>
            </div>
          )}

          {/* ----- FILTERS MATCH NOTHING ----- */}
          {!loading && !error && patients.length > 0 && filteredPatients.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
              <p className="font-medium text-foreground">No matching patients</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different name or status filter.
              </p>
            </div>
          )}

          {/* ----- DATA: mobile cards + desktop table ----- */}
          {!loading && !error && paginatedPatients.length > 0 && (
            <>
              <div className="space-y-3 md:hidden">
                {paginatedPatients.map((patient) => (
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
                      <TableHead>Gender</TableHead>
                      <TableHead>Date of birth</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatients.map((patient) => (
                      <TableRow
                        key={patient.id}
                        className="cursor-pointer"
                        onClick={() => openPatientDetail(patient)}
                      >
                        <TableCell className="font-medium">
                          {formatFullName(patient)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {patient.gender ?? "—"}
                        </TableCell>
                        <TableCell>{formatDateOfBirth(patient.dateOfBirth)}</TableCell>
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

          {/* ----- PAGINATION (only when more than one page) ----- */}
          {!loading && !error && filteredPatients.length > PAGE_SIZE && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* ----- FOOTER COUNTS ----- */}
          {!loading && !error && patients.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {filteredPatients.length} patients
              {hasActiveFilters ? " (filtered)" : ""}
              {patients.length !== filteredPatients.length
                ? ` · ${patients.length} total`
                : ""}
              {" · "}
              <span className="font-mono text-xs">{PAGE_SIZE} per page</span>
            </p>
          )}

          {/* ----- DEBUG: project id when load failed ----- */}
          {!loading && error && (
            <p className="text-xs font-mono text-muted-foreground">
              Firebase project: {projectId}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Side panel — lives outside the Card so it can overlay the whole page */}
      <PatientDetailSheet
        patient={selectedPatient}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
