import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import {
  auditFirebaseEnvKeys,
  formatMissingFirebaseEnvError,
  resolveFirebaseEnv,
} from "./src/lib/resolveFirebaseEnv";

function validateFirebaseEnvPlugin(
  env: Record<string, string | undefined>,
  firebaseConfig: ReturnType<typeof resolveFirebaseEnv>,
): Plugin {
  return {
    name: "validate-firebase-env",
    buildStart() {
      const message = formatMissingFirebaseEnvError(env);
      if (message) {
        console.log("[firebase] env audit:", auditFirebaseEnvKeys(env));
        this.error(message);
      }
      console.log(
        `[firebase] embedding projectId=${firebaseConfig.projectId} for ${process.env.VERCEL_ENV ?? "local"} build`,
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const firebaseConfig = resolveFirebaseEnv(env);

  return {
    plugins: [
      validateFirebaseEnvPlugin(env, firebaseConfig),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __FIREBASE_CONFIG__: JSON.stringify(firebaseConfig),
    },
  };
});
