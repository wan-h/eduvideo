import { readFileSync, writeFileSync } from "node:fs";

const files = ["dist/index.js", "dist/index.cjs"];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const cleaned = content.replace(
    /import\s+["']katex\/dist\/katex\.min\.css["']\s*;?\s*/g,
    ""
  );
  writeFileSync(file, cleaned);
  console.log(`Cleaned CSS import from ${file}`);
}
