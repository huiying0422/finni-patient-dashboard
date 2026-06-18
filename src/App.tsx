import { PatientList } from "@/components/PatientList";

function App() {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header>
          <p className="text-sm font-medium text-primary">Finni Health</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Patient Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track inquiries, onboarding, active care, and churn.
          </p>
        </header>

        <PatientList />
      </div>
    </div>
  );
}

export default App;
