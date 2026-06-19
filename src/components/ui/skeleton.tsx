/**
 * Phase 2 — shadcn/ui Skeleton — loading placeholder while usePatients fetches
 */
import * as React from "react"

import { cn } from "@/lib/utils"

// Gray pulsing bar — PatientList renders several while loading=true.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
