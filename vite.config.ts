import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import {
  FIREBASE_CONFIG_FIELDS,
  resolveFirebaseEnv,
} from "./src/lib/resolveFirebaseEnv";

function validateFirebaseEnvPlugin(
  firebaseConfig: ReturnType<typeof resolveFirebaseEnv>,
): Plugin {
  return {
    name: "validate-firebase-env",
    buildStart() {
      const missing = FIREBASE_CONFIG_FIELDS.filter(
        (field) => !firebaseConfig[field],
      );
      if (missing.length > 0) {
        this.error(
          `Firebase build config incomplete (missing: ${missing.join(", ")}). ` +
            "Set apiKey/projectId/… or VITE_FIREBASE_* in Vercel env vars, then redeploy.",
        );
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
      validateFirebaseEnvPlugin(firebaseConfig),
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
