import { PatientList } from "@/components/PatientList";
import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Finni Health</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Patient Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track inquiries, onboarding, active care, and churn.
            </p>
          </div>
          <Button>Add patient</Button>
        </header>

        <PatientList />
      </div>
    </div>
  );
}

export default App;
