/**
 * Phase 2 — Sonner toast host (Phase 5 CRUD feedback)
 * Mounted once in App.tsx; triggered from AddPatientDialog and PatientDetailSheet.
 */
// Sonner = toast library; ToasterProps = position, theme, etc.
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        // These classNames make Sonner toasts match our shadcn popover colors.
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} // position="top-right", richColors, etc. from App.tsx
    />
  );
}
