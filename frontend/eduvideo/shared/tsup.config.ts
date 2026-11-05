/// <reference types="node" />
import { execSync } from "node:child_process"
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  external: ["react", "react-dom", "remotion", "@remotion/fonts", "katex"],
  async onSuccess() {
    execSync("node strip-css-imports.mjs", { stdio: "inherit" })
  },
})
