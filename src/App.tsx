import { PatientList } from "@/components/PatientList";
import { Toaster } from "@/components/ui/sonner";
import {
  firebaseSetupMessage,
  getFirebaseEnvDiagnostics,
} from "@/lib/firebase";

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
          <header className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/finni-fox.png"
                alt=""
                aria-hidden
                className="h-11 w-11 shrink-0"
              />
              <img
                src="/finni-logo.svg"
                alt="Finni Health"
                className="h-7 w-auto shrink-0"
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Patient Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Track inquiries, onboarding, active care, and churn.
              </p>
            </div>
          </header>

          {firebaseSetupMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3"
            >
              <p className="font-medium text-destructive">
                Firebase not configured
              </p>
              <p className="text-sm text-muted-foreground">
                {firebaseSetupMessage}
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Set all six <code className="text-xs">VITE_FIREBASE_*</code>{" "}
                  values in <code className="text-xs">.env</code> before{" "}
                  <code className="text-xs">npm run build</code>:
                </p>
                <ul className="list-disc space-y-1 pl-5 font-mono text-xs">
                  {getFirebaseEnvDiagnostics().map(({ field, envKeys, status }) => (
                    <li key={field}>
                      {field}{" "}
                      <span className="text-muted-foreground">
                        ({envKeys.join(" or ")})
                      </span>{" "}
                      <span
                        className={
                          status === "ok"
                            ? "text-green-700"
                            : "text-destructive"
                        }
                      >
                        — {status === "ok" ? "set" : status}
                      </span>
                    </li>
                  ))}
                </ul>
                <p>
                  Run <code className="text-xs">npm run deploy</code> after
                  updating env vars.
                </p>
              </div>
            </div>
          ) : null}

          <PatientList />
        </div>
      </div>
    </>
  );
}

export default App;
