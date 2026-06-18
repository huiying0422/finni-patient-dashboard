import { PatientList } from "@/components/PatientList";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
          <header>
            <p className="text-sm font-medium text-primary">Finni Health</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Patient Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Track inquiries, onboarding, active care, and churn.
            </p>
          </header>

          <PatientList />
        </div>
      </div>
    </>
  );
}

export default App;
