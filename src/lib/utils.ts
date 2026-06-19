/**
 * Phase 2 — Tailwind class merge helper (cn)
 *
 * Used everywhere we combine default shadcn classes with extra classes from props.
 */
// clsx = turn conditional values into one class string (true/false, arrays, objects).
import { clsx, type ClassValue } from "clsx";

// twMerge = when two Tailwind classes conflict, keep the last one (e.g. p-2 vs p-4).
import { twMerge } from "tailwind-merge";

/** Merge class strings; later Tailwind classes win over conflicting earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
