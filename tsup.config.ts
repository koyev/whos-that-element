import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    vite: "src/vite.ts",
    client: "src/client-entry.ts",
  },
  format: ["cjs", "esm"],
  shims: true,
  dts: true,
  clean: true,
  target: "node16",
});
