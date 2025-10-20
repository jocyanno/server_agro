import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  outDir: "build",
  format: ["cjs"],
  target: "node24",
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  skipNodeModulesBundle: true,
  noExternal: [],
});

