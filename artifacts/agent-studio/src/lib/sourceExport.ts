const rawFiles = import.meta.glob<string>(
  ["../**/*.ts", "../**/*.tsx", "../**/*.css"],
  { query: "?raw", import: "default", eager: true }
);

export const SOURCE_FILES: Record<string, string> = {};
for (const [rawPath, content] of Object.entries(rawFiles)) {
  if (typeof content === "string") {
    const clean = rawPath.replace(/^\.\.\//, "src/");
    SOURCE_FILES[clean] = content;
  }
}
