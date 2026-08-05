import path from "node:path";
import { build, createServer } from "vite";
import react from "@vitejs/plugin-react-swc";

const command = process.argv[2] || "dev";
const modeIndex = process.argv.indexOf("--mode");
const mode =
  modeIndex >= 0 && process.argv[modeIndex + 1]
    ? process.argv[modeIndex + 1]
    : command === "build"
      ? "production"
      : "development";

const rootDir = process.cwd();

const sharedConfig = {
  root: rootDir,
  configFile: false,
  appType: "spa",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
};

if (command === "build") {
  await build({
    ...sharedConfig,
    mode,
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  });
} else {
  const server = await createServer({
    ...sharedConfig,
    mode,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
  });

  await server.listen();
  server.printUrls();
}
